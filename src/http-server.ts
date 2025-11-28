import express, { Request, Response } from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { JSONRPCMessage, JSONRPCRequest } from "@modelcontextprotocol/sdk/types.js";
import { createMcpServer } from "./mcp-setup.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";

const PORT = process.env.PORT || 3000;
export const app = express();

// Security Middleware
app.use((req, res, next) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
    
    // 1. Origin Validation
    const origin = req.headers.origin;
    if (origin) {
        if (allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
             res.status(403).json({
                jsonrpc: "2.0",
                error: {
                    code: -32000,
                    message: "Forbidden: Invalid Origin"
                },
                id: null
            });
            return;
        }
    }

    // Authentication is disabled to allow public read access
    // If you need to restrict access, uncomment the following block and set MCP_API_KEY env var
    /*
    const MCP_API_KEY = process.env.MCP_API_KEY;
    if (MCP_API_KEY) {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.split(" ")[1] !== MCP_API_KEY) {
             res.status(401).json({
                jsonrpc: "2.0",
                error: {
                    code: -32000,
                    message: "Unauthorized"
                },
                id: null
            });
            return;
        }
    }
    */

    next();
});

// Enable CORS
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
        if (!origin) return callback(null, true);
        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization", "MCP-Session-Id", "MCP-Protocol-Version", "Last-Event-ID"],
    exposedHeaders: ["MCP-Session-Id", "MCP-Protocol-Version"]
}));

// Parse JSON bodies
app.use(express.json());

// Session storage
// In a real production environment (especially serverless), this should be in a database/KV store
const sessions = new Map<string, { server: Server; transport: StreamableHttpTransport }>();

class StreamableHttpTransport implements Transport {
    private _onmessage?: (message: JSONRPCMessage) => void;
    private _onclose?: () => void;
    private _currentResponse?: Response;
    private _messageQueue: JSONRPCMessage[] = [];
    private _sessionId: string;
    private _pendingRequestHandler?: (message: JSONRPCMessage) => void;

    constructor(sessionId: string) {
        this._sessionId = sessionId;
    }

    get sessionId() {
        return this._sessionId;
    }

    async start(): Promise<void> {
        // No-op
    }

    async close(): Promise<void> {
        this._onclose?.();
    }

    async send(message: JSONRPCMessage): Promise<void> {
        if (this._pendingRequestHandler) {
            // If we are waiting for a response to a POST request (synchronous mode)
            this._pendingRequestHandler(message);
            this._pendingRequestHandler = undefined;
            return;
        }

        if (this._currentResponse && !this._currentResponse.writableEnded) {
            const eventId = uuidv4();
            this._currentResponse.write(`id: ${eventId}\nevent: message\ndata: ${JSON.stringify(message)}\n\n`);
            
            // If this is a response to a request, we can close the stream if it was a POST-initiated stream
            // But we don't track if it was POST or GET here easily.
            // However, for Vercel/Serverless, we probably want to close it to finish the request.
            // The spec says: "After the JSON-RPC response has been sent, the server SHOULD terminate the SSE stream."
            
            if ((message as any).result !== undefined || (message as any).error !== undefined) {
                 // It's a response.
                 // We should probably close the connection to signal completion for this request.
                 // But only if we are sure we don't want to send anything else.
                 // The spec says "SHOULD terminate".
                 // this._currentResponse.end();
                 // this._currentResponse = undefined;
            }
        } else {
            // Queue message if no active connection
            // In a real implementation, we would persist this for resumption
            this._messageQueue.push(message);
        }
    }

    // Method to handle incoming JSON-RPC message from HTTP POST
    handleMessage(message: JSONRPCMessage) {
        if (this._onmessage) {
            this._onmessage(message);
        }
    }

    setPendingRequestHandler(handler: (message: JSONRPCMessage) => void) {
        this._pendingRequestHandler = handler;
    }

    // Method to attach a response object for SSE streaming
    attachResponse(res: Response) {
        this._currentResponse = res;
        
        // Flush queued messages
        while (this._messageQueue.length > 0) {
            const msg = this._messageQueue.shift();
            if (msg) {
                this.send(msg);
            }
        }
    }

    set onmessage(handler: (message: JSONRPCMessage) => void) {
        this._onmessage = handler;
    }

    set onclose(handler: () => void) {
        this._onclose = handler;
    }

    set onerror(handler: (error: Error) => void) {
        // No-op
    }
}

app.get("/mcp", (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string;
    
    if (!sessionId) {
        res.status(400).send("Missing MCP-Session-Id header");
        return;
    }

    const session = sessions.get(sessionId);
    if (!session) {
        res.status(404).send("Session not found");
        return;
    }

    // Start SSE stream
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
    });

    // Send initial event to prime the client
    const eventId = uuidv4();
    res.write(`id: ${eventId}\nevent: message\ndata: \n\n`);

    session.transport.attachResponse(res);

    req.on("close", () => {
        // Handle disconnection
    });
});

app.post("/mcp", async (req, res) => {
    const protocolVersion = req.headers["mcp-protocol-version"];
    if (protocolVersion) {
        // In a real implementation, we would negotiate the version
        // For now, we just acknowledge it exists
    }
    
    const sessionId = req.headers["mcp-session-id"] as string;
    const body = req.body as JSONRPCMessage;

    // Handle Initialization
    if (!sessionId) {
        // Expect InitializeRequest
        if (isInitializeRequest(body)) {
            const newSessionId = uuidv4();
            const transport = new StreamableHttpTransport(newSessionId);
            const server = createMcpServer();
            
            await server.connect(transport);
            
            sessions.set(newSessionId, { server, transport });

            // Set headers for SSE
            res.setHeader("MCP-Session-Id", newSessionId);
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");
            
            // Send initial SSE event
            const eventId = uuidv4();
            res.write(`id: ${eventId}\nevent: message\ndata: \n\n`);
            
            transport.attachResponse(res);
            transport.handleMessage(body);
            return;
        } else {
            res.status(400).send("Missing MCP-Session-Id header");
            return;
        }
    }

    const session = sessions.get(sessionId);
    if (!session) {
        res.status(404).send("Session not found");
        return;
    }

    // Handle Notifications/Responses (return 202)
    if (isNotification(body) || isResponse(body)) {
        session.transport.handleMessage(body);
        res.status(202).end();
        return;
    }

    // Handle Requests (return SSE or JSON)
    if (isRequest(body)) {
        // Try to handle synchronously (Stateless optimization for Vercel)
        // We wait for a short period to see if the server responds immediately
        const responsePromise = new Promise<JSONRPCMessage>((resolve) => {
             session.transport.setPendingRequestHandler(resolve);
        });
        
        session.transport.handleMessage(body);
        
        try {
            // Wait for response (timeout 10s - Vercel function limit is usually 10s-60s)
            // If the tool takes longer, we should probably use SSE, but we can't switch mid-flight easily
            // unless we race.
            // For now, let's just await. If it times out, the client will timeout.
            const response = await responsePromise;
            res.json(response);
            return;
        } catch (e) {
            // If we fail to get a response, we might want to fallback?
            // But we already consumed the message.
            console.error("Error handling request:", e);
            res.status(500).send("Internal Server Error");
            return;
        }
    }

    res.status(400).send("Invalid JSON-RPC message");
});

function isInitializeRequest(msg: any): msg is JSONRPCRequest {
    return msg && msg.method === "initialize";
}

function isRequest(msg: any): msg is JSONRPCRequest {
    return msg && typeof msg.method === "string" && msg.id !== undefined;
}

function isNotification(msg: any): boolean {
    return msg && typeof msg.method === "string" && msg.id === undefined;
}

function isResponse(msg: any): boolean {
    return msg && (msg.result !== undefined || msg.error !== undefined) && msg.id !== undefined;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    app.listen(PORT, () => {
        console.log(`Notifly MCP Server (HTTP) running on port ${PORT}`);
    });
}

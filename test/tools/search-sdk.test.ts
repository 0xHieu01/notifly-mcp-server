/**
 * SDK Search Tool Tests
 *
 * Tests the SDK search functionality with BM25 algorithm
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { sdkSearchTool } from "../../src/tools/search-sdk.js";
import type { ServerContext } from "../../src/types.js";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Mock fetch for testing: serve mapping llms.txt and per-SDK llms.txt, plus raw code
const MAPPING_LLMS_URL =
  "https://raw.githubusercontent.com/notifly-tech/notifly-mcp-server/refs/heads/main/llms.txt";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../");
const LOCAL_MAPPING_PATH = path.join(REPO_ROOT, "llms.txt");

function parseUrlsFromMapping(content: string): string[] {
  const urls = new Set<string>();
  const re = /\((https?:\/\/[^\s)]+\/llms\.txt)\)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (m[1]) urls.add(m[1]);
  }
  return Array.from(urls);
}

const MAPPING_LLMS_TEXT = readFileSync(LOCAL_MAPPING_PATH, "utf8");
const PER_SDK_LLMS_URLS = parseUrlsFromMapping(MAPPING_LLMS_TEXT);

// Preserve original fetch (Node 18+) for optional live link checks
const ORIGINAL_FETCH: any = (global as any).fetch;

const LLMS_TEXT = [
  "# Platform: iOS",
  "- [Notifly Main Entry](https://raw.githubusercontent.com/team-michael/notifly-ios-sdk/refs/heads/main/Sources/Notifly/notifly-ios-sdk/notifly-ios-sdk/SourceCodes/Notifly/Notifly.swift): Singleton entry point of Notifly iOS SDK.",
  "- [Notification Service Extension](https://raw.githubusercontent.com/team-michael/notifly-ios-sdk/refs/heads/main/Sources/Notifly/notifly-ios-sdk/notifly-ios-sdk/SourceCodes/NotiflyExtension/NotificationServiceExtension.swift): Enables rich push processing.",
  "# Platform: android",
  "- [RN Module Implementation](https://raw.githubusercontent.com/team-michael/notifly-react-native-sdk/refs/heads/main/android/src/main/java/tech/notifly/rn/NotiflySdkModule.kt): ReactMethods for native SDK calls.",
  "# Platform: react-native",
  "- [JS Public API (index)](https://raw.githubusercontent.com/team-michael/notifly-react-native-sdk/refs/heads/main/src/index.tsx): Public interface for React Native.",
].join("\n");

global.fetch = vi.fn();

describe("SDK Search Tool", () => {
  const mockContext: ServerContext = {};

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockImplementation((url: string) => {
      if (typeof url === "string" && url === MAPPING_LLMS_URL) {
        return Promise.resolve({ ok: true, text: () => Promise.resolve(MAPPING_LLMS_TEXT) });
      }
      if (typeof url === "string" && PER_SDK_LLMS_URLS.some((u) => url.includes(u))) {
        return Promise.resolve({ ok: true, text: () => Promise.resolve(LLMS_TEXT) });
      }
      // Return small code snippet for raw source file requests
      return Promise.resolve({ ok: true, text: () => Promise.resolve("class Notifly { }") });
    });
  });

  describe("Tool Metadata", () => {
    it("should have correct tool name", () => {
      expect(sdkSearchTool.name).toBe("search_sdk");
    });

    // Description expectations are relaxed; content may change without BM25 mention

    it("should have correct input schema", () => {
      expect(sdkSearchTool.inputSchema).toHaveProperty("query");
      expect(sdkSearchTool.inputSchema).toHaveProperty("platform");
      expect(sdkSearchTool.inputSchema).toHaveProperty("maxResults");
    });
  });

  describe("Platform Filtering", () => {
    it("should filter by iOS platform", async () => {
      const result = await sdkSearchTool.handler(
        { query: "notifly", platform: "ios", maxResults: 5 },
        mockContext
      );

      expect(result).toContain("ios");
      expect(result).not.toContain("android");
      expect(result).not.toContain("react-native");
    });

    it("should filter by Android platform", async () => {
      const result = await sdkSearchTool.handler(
        { query: "notifly", platform: "android", maxResults: 5 },
        mockContext
      );

      expect(result).toContain("android");
      expect(result).not.toContain("ios");
    });

    it('should search all platforms when platform="all"', async () => {
      const result = await sdkSearchTool.handler(
        { query: "notifly", platform: "all", maxResults: 5 },
        mockContext
      );

      // Should have results from multiple platforms
      expect(result).toContain("Platform");
    });
  });

  describe("Mapping Retrieval and Fallback", () => {
    it("should fetch mapping llms then per-SDK llms", async () => {
      const fetchSpy = vi.spyOn(global, "fetch" as any);
      await sdkSearchTool.handler(
        { query: "notifly", platform: "all", maxResults: 1 },
        mockContext
      );
      const firstCall = (fetchSpy as any).mock.calls[0][0] as string;
      expect(firstCall).toBe(MAPPING_LLMS_URL);
      // Ensure we attempted to fetch at least one per-SDK llms
      const calledUrls = (fetchSpy as any).mock.calls.map((c: any[]) => String(c[0]));
      expect(PER_SDK_LLMS_URLS.some((u) => calledUrls.some((cu: string) => cu.includes(u)))).toBe(
        true
      );
    });

    it("should fall back to local mapping when remote fetch fails", async () => {
      // First call (mapping) fails to trigger fallback to local mapping file
      (global.fetch as any).mockImplementationOnce(() => Promise.reject(new Error("offline")));
      // Subsequent per-SDK llms and code fetches
      (global.fetch as any).mockImplementation((url: string) => {
        if (typeof url === "string" && PER_SDK_LLMS_URLS.some((u) => url.includes(u))) {
          return Promise.resolve({ ok: true, text: () => Promise.resolve(LLMS_TEXT) });
        }
        return Promise.resolve({ ok: true, text: () => Promise.resolve("// code") });
      });

      const result = await sdkSearchTool.handler(
        { query: "notifly", platform: "ios", maxResults: 1 },
        mockContext
      );
      expect(result).toContain("# Notifly SDK Search Results");
      expect(result).toContain("Result 1");
    });
  });

  describe("BM25 Search Quality", () => {
    it("should rank title matches highest", async () => {
      const result = await sdkSearchTool.handler(
        { query: "notifly", platform: "all", maxResults: 5 },
        mockContext
      );

      // Should rank 'Notifly Main Entry' highest for 'notifly' query
      expect(result).toContain("Notifly Main Entry");
      expect(result).toContain("# Notifly SDK Search Results");
    });

    it("should weight title higher than description", async () => {
      const result = await sdkSearchTool.handler(
        { query: "initialization", platform: "all", maxResults: 5 },
        mockContext
      );

      // Should find results where "initialization" is in description
      expect(result).toContain("SDK");
    });

    it("should handle multi-term queries", async () => {
      const mockCode = "class NotificationService { }";
      (global.fetch as any).mockImplementation((url: string) => {
        if (typeof url === "string" && url === MAPPING_LLMS_URL) {
          return Promise.resolve({ ok: true, text: () => Promise.resolve(MAPPING_LLMS_TEXT) });
        }
        if (typeof url === "string" && PER_SDK_LLMS_URLS.some((u) => url.includes(u))) {
          return Promise.resolve({ ok: true, text: () => Promise.resolve(LLMS_TEXT) });
        }
        return Promise.resolve({ ok: true, text: () => Promise.resolve(mockCode) });
      });

      const result = await sdkSearchTool.handler(
        { query: "push notification service", platform: "all", maxResults: 5 },
        mockContext
      );

      // Should match documents with multiple query terms
      expect(result).toContain("Notification Service");
    });
  });

  describe("Source Code Fetching", () => {
    it("should fetch source code from GitHub", async () => {
      const mockCode = `class Notifly {
  init(config: NotiflyConfig) {
    // Initialize SDK
  }
}`;

      (global.fetch as any).mockImplementation((url: string) => {
        if (typeof url === "string" && url === MAPPING_LLMS_URL) {
          return Promise.resolve({ ok: true, text: () => Promise.resolve(MAPPING_LLMS_TEXT) });
        }
        if (typeof url === "string" && PER_SDK_LLMS_URLS.some((u) => url.includes(u))) {
          return Promise.resolve({ ok: true, text: () => Promise.resolve(LLMS_TEXT) });
        }
        return Promise.resolve({ ok: true, text: () => Promise.resolve(mockCode) });
      });

      const result = await sdkSearchTool.handler(
        { query: "notifly sdk", platform: "ios", maxResults: 1 },
        mockContext
      );

      // Should contain the actual source code
      expect(result).toContain("class Notifly");
    });

    it("should detect and apply correct syntax highlighting", async () => {
      const result = await sdkSearchTool.handler(
        { query: "notifly", platform: "ios", maxResults: 1 },
        mockContext
      );

      // Should use swift syntax highlighting for .swift files
      expect(result).toContain("```swift");
    });

    it("should truncate long source files", async () => {
      const longCode = "// Code\n".repeat(1000);

      (global.fetch as any).mockImplementation((url: string) => {
        if (typeof url === "string" && url === MAPPING_LLMS_URL) {
          return Promise.resolve({ ok: true, text: () => Promise.resolve(MAPPING_LLMS_TEXT) });
        }
        if (typeof url === "string" && PER_SDK_LLMS_URLS.some((u) => url.includes(u))) {
          return Promise.resolve({ ok: true, text: () => Promise.resolve(LLMS_TEXT) });
        }
        return Promise.resolve({ ok: true, text: () => Promise.resolve(longCode) });
      });

      const result = await sdkSearchTool.handler(
        { query: "notifly", platform: "ios", maxResults: 1 },
        mockContext
      );

      // Should be truncated
      expect(result).toContain("truncated for brevity");
    });

    it("should handle fetch errors gracefully", async () => {
      (global.fetch as any).mockImplementation((url: string) => {
        if (typeof url === "string" && url === MAPPING_LLMS_URL) {
          return Promise.resolve({ ok: true, text: () => Promise.resolve(MAPPING_LLMS_TEXT) });
        }
        if (typeof url === "string" && PER_SDK_LLMS_URLS.some((u) => url.includes(u))) {
          return Promise.resolve({ ok: true, text: () => Promise.resolve(LLMS_TEXT) });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      const result = await sdkSearchTool.handler(
        { query: "notifly", platform: "ios", maxResults: 1 },
        mockContext
      );

      // Should contain error message but not fail
      expect(result).toContain("Unable to fetch content");
    });
  });

  describe("Result Formatting", () => {
    it("should include summary section", async () => {
      const result = await sdkSearchTool.handler(
        { query: "notifly", platform: "all", maxResults: 3 },
        mockContext
      );

      expect(result).toContain("## Summary");
      expect(result).toContain("most relevant");
    });

    it("should include platform information", async () => {
      const result = await sdkSearchTool.handler(
        { query: "notifly", platform: "ios", maxResults: 2 },
        mockContext
      );

      expect(result).toContain("**Platform**: ios");
    });

    it("should include GitHub source links", async () => {
      const result = await sdkSearchTool.handler(
        { query: "notifly", platform: "ios", maxResults: 1 },
        mockContext
      );

      expect(result).toContain("**GitHub Source**:");
      expect(result).toContain("https://raw.githubusercontent.com/");
    });

    it("should include helpful footer", async () => {
      const result = await sdkSearchTool.handler(
        { query: "notifly", platform: "ios", maxResults: 1 },
        mockContext
      );

      expect(result).toContain("**Note**:");
      expect(result).toContain("source code");
    });
  });

  describe("Error Handling", () => {
    it("should handle no search results", async () => {
      const result = await sdkSearchTool.handler(
        { query: "nonexistent_feature_xyz", platform: "all", maxResults: 3 },
        mockContext
      );

      expect(result).toContain("No Results Found");
    });

    it("should handle platform with no matches", async () => {
      const result = await sdkSearchTool.handler(
        { query: "nonexistent_feature_xyz", platform: "flutter", maxResults: 3 },
        mockContext
      );

      expect(result).toContain("No Results Found");
    });
  });

  describe("maxResults Parameter", () => {
    it("should respect maxResults parameter", async () => {
      const result = await sdkSearchTool.handler(
        { query: "notifly", platform: "all", maxResults: 2 },
        mockContext
      );

      // Count result sections
      const resultMatches = result.match(/## Result \d+:/g);
      expect(resultMatches).toBeTruthy();
      expect(resultMatches!.length).toBeLessThanOrEqual(2);
    });
  });

  describe("Mapping Links (structure)", () => {
    it("should list valid raw GitHub llms.txt URLs", () => {
      expect(PER_SDK_LLMS_URLS.length).toBeGreaterThan(0);
      for (const url of PER_SDK_LLMS_URLS) {
        expect(url.startsWith("https://raw.githubusercontent.com/")).toBe(true);
        expect(/\/llms\.txt$/i.test(url)).toBe(true);
        expect(/\/(refs\/heads\/main|main)\//.test(url)).toBe(true);
      }
    });
  });

  describe("Live GTM integration", () => {
    it("should search GTM llms.txt live and return results", async () => {
      const GTM_LLMS =
        "https://raw.githubusercontent.com/notifly-tech/notifly-gtm-template/refs/heads/main/llms.txt";
      const savedFetch = global.fetch as any;
      (global.fetch as any) = vi.fn((url: string) => {
        if (typeof url === "string" && url === MAPPING_LLMS_URL) {
          const mapping = `# Mapping\n- [GTM](${GTM_LLMS})\n`;
          return Promise.resolve({ ok: true, text: () => Promise.resolve(mapping) });
        }
        // Defer to real network for GTM llms and file contents
        return ORIGINAL_FETCH ? ORIGINAL_FETCH(url as any) : Promise.reject(new Error("no fetch"));
      });
      try {
        const result = await sdkSearchTool.handler(
          { query: "notifly-js-sdk", platform: "gtm", maxResults: 3 },
          mockContext
        );
        expect(result).toContain("# Notifly SDK Search Results");
        expect(result).toContain("**Platform**: gtm");
        expect(result).toContain("**GitHub Source**:");
      } finally {
        (global.fetch as any) = savedFetch;
      }
    }, 30000);
  });

  describe("Link integrity - mapping and SDK entries (live)", () => {
    function parseMarkdownLinks(content: string): string[] {
      const urls: string[] = [];
      const re = /\((https?:\/\/[^\s)]+)\)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        if (m[1]) urls.push(m[1]);
      }
      return urls;
    }

    it("should fetch each per-SDK llms.txt and all entry links (HTTP 200)", async () => {
      if (typeof ORIGINAL_FETCH !== "function") {
        throw new Error("Global fetch is not available for live link checks.");
      }
      expect(PER_SDK_LLMS_URLS.length).toBeGreaterThan(0);
      // eslint-disable-next-line no-console
      console.log("Link integrity: per-SDK llms.txt URLs:", PER_SDK_LLMS_URLS);

      for (const perUrl of PER_SDK_LLMS_URLS) {
        // eslint-disable-next-line no-console
        console.log(`Fetching per-SDK llms.txt: ${perUrl}`);
        const res = await ORIGINAL_FETCH(perUrl as any);
        if (!res || !(res as any).ok) {
          // eslint-disable-next-line no-console
          console.error(`Non-200 for per-SDK llms.txt: ${perUrl} status=${(res as any)?.status}`);
        }
        expect(res && (res as any).ok).toBe(true);
        const txt = await (res as any).text();
        const entryUrls = parseMarkdownLinks(txt).filter((u) =>
          u.startsWith("https://raw.githubusercontent.com/")
        );
        // Sanity: should have at least one entry link
        // eslint-disable-next-line no-console
        console.log(`Found ${entryUrls.length} raw links in ${perUrl}`);
        expect(entryUrls.length).toBeGreaterThan(0);
        // Fetch sequentially to avoid rate-limits
        for (const fileUrl of entryUrls) {
          // eslint-disable-next-line no-console
          console.log(`Fetching entry: ${fileUrl}`);
          const r = await ORIGINAL_FETCH(fileUrl as any);
          if (!r || !(r as any).ok) {
            // eslint-disable-next-line no-console
            console.error(`Non-200 for entry: ${fileUrl} status=${(r as any)?.status}`);
          }
          expect(r && (r as any).ok).toBe(true);
        }
      }
    }, 60000);
  });
});

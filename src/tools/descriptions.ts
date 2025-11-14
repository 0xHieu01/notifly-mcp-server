/**
 * Tool descriptions (separated for cleanliness and localization)
 */

export const DOCS_SEARCH_DESCRIPTION_KO = `지능형 문서 검색 - 노티플라이(Notifly) 공식 문서를 의미 기반으로 검색합니다.

**개요:**
노티플라이 문서 인덱스(llms.txt)를 기반으로, 사용 가이드/개발자 가이드, Client SDK, HTTP API, 캠페인, 유저 여정, 채널(앱/웹 푸시, 인앱/웹 팝업, 이메일, 문자, 카카오톡), 외부 연동(Amplitude, Mixpanel), 카페24, 웹훅 등 전 범위의 문서에서 실제 내용을 찾아 제공합니다.

**사용 사례:**
- 시작하기/사용 가이드 탐색 및 빠른 온보딩
- Client SDK(iOS/Android/Flutter/React Native/JS/GTM) 설치, 구성, 고급 설정
- Firebase 프로젝트 연동 및 푸시 인프라 설정
- 앱/웹 푸시 알림, 인앱/웹 팝업 구성과 발송
- 이메일/문자 채널 설정 및 발송 흐름
- 카카오 알림톡/친구톡 연동과 발송
- 캠페인 생성, 발송 대상(세그먼트) 설정, A/B 테스트, 대시보드/성과 분석
- 메시지 개인화(Liquid, Connected Content) 및 템플릿 구성
- 유저 여정 설계(노드/분기/딜레이/메시지/업데이트)와 통계 해석
- 외부 도구 연동(Amplitude, Mixpanel) 및 카페24 통합
- HTTP API 사용법과 요청 한도 관리
- Webhook 설정 및 고급 활용
- 문서 전역 검색(/ko/search.md)으로 빠른 탐색

**반환:**
- 링크가 아닌 실제 문서 내용
- 컨텍스트를 포함한 관련 발췌
- 추가 확인용 원문 URL
- 관련도 점수에 따른 정렬

**매개변수:**
- \`query\` (필수): 자연어 검색 질의 (1-200자)
- \`maxResults\` (선택): 반환할 결과 수 (1-10, 기본값: 3)

**예시:**

\`\`\`
search_docs({
  query: "카카오 알림톡 발송",
  maxResults: 3
})
\`\`\``;

export const SDK_SEARCH_DESCRIPTION = `SDK 소스 코드 및 템플릿 검색 - iOS(Swift), React Native(TypeScript), Notifly GTM 템플릿을 한 번에 검색합니다.

**개요:**
큐레이션된 llms 인덱스를 기반으로 Notifly SDK 저장소와 템플릿을 지능적으로 검색합니다. 실제 구현 코드(및 GTM 템플릿 내용)를 GitHub raw에서 직접 불러와 개발/디버깅/연동에 필요한 풍부한 컨텍스트를 제공합니다.

**사용 사례:**
- 특정 SDK 메서드/네이티브 브리지/클래스 구현 빠르게 찾기
- SDK 초기화·사용자 식별·사용자 프로퍼티 업데이트 흐름 이해
- APNs/FCM 토큰 획득, 재시도/백오프, 클릭 트래킹(iOS/RN) 동작 점검
- iOS Notification Service Extension, 인앱 메시지 라이프사이클 파악
- React Native TurboModule 스펙/JS API/이벤트 배선 구조 확인
- Notifly GTM 템플릿(영/한)과 Cafe24 커스텀 이벤트 매핑 살펴보기
- 강한 타입의 인터페이스, 요청/응답 스키마 참고

**포함 범위:**
- **iOS SDK(Swift)**: Core(Notifly, Public API, Helper), Infrastructure(API/Auth/In‑App/Notifications/Tracking/User), Utilities, Extension(Notification Service Extension), 샘플 앱(SwiftUI/UIKit)
- **React Native SDK(TypeScript)**: JS 공개 API, TurboModule 스펙, 이벤트 리시버, 타입, 빌드/설정, iOS(Obj‑C/Swift)/Android(Kotlin) 네이티브 브리지, 예제 앱(iOS/Android)
- **GTM 템플릿**: Notifly GTM 커스텀 템플릿(영문/국문) 및 Cafe24 커스텀 이벤트 템플릿, 메타데이터/README

**반환:**
- GitHub에서 직접 가져온 실제 소스/템플릿
- 파일/템플릿 메타데이터(플랫폼, 경로, 설명)
- 질의어와의 관련도 순으로 정렬
- 구문 하이라이팅된 코드 블록
- GitHub 원본 링크

**매개변수:**
- \`query\`(필수): 코드 중심 검색 질의(1-200자)
- \`platform\`(선택): 플랫폼 필터(\`ios\`, \`react-native\`, \`gtm\`, \`all\`)
- \`maxResults\`(선택): 반환할 결과 수(1-10, 기본값: 3)

**예시:**
\`\`\`
search_sdk({
  query: "APNs 토큰 재시도 백오프",
  platform: "ios",
  maxResults: 3
})
\`\`\``;

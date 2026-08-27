/**
 * DPRO 司法書士・相続登記 LINE
 * STEP SHIHO-4
 * GitHub Pages 公開設定
 *
 * 公開ファイルなので、秘密情報は絶対に記載しない。
 * SUPABASE_SERVICE_ROLE_KEY、SUPABASE_SECRET_KEY、TOKEN_SECRET等は
 * Cloudflare Workerの環境変数だけで管理する。
 */
(() => {
  "use strict";

  const SITE_BASE_URL =
    "https://dpromstk2000-lab.github.io/dpro-shiho-inheritance-line-liff";
  const API_BASE_URL =
    "https://dpro-shiho-inheritance-line-api.dpromstk2000.workers.dev";
  const PRODUCT_READY_R2_BASE_URL =
    "https://cbknucemarcpbscirzyv.supabase.co/functions/v1/dpro-shiho-product-ready-v2";
  const MEMBER_R2_BASE_URL =
    "https://cbknucemarcpbscirzyv.supabase.co/functions/v1/dpro-shiho-member-r2";

  const CONFIG = Object.freeze({
    system: Object.freeze({
      code: "SHIHO",
      name: "DPRO 司法書士・相続登記 LINE",
      shortName: "司法書士・相続登記",
      subtitle:
        "相続相談・必要書類・相続人／不動産整理・登記進捗・期限案内をLINEで一元管理",
      version: "SHIHO-FRONT-PR-R2-20260824",
      officeCode: "dpro_shiho_demo",
      officeName: "DPRO司法書士・相続登記事務所",
      timezone: "Asia/Tokyo",
      locale: "ja-JP",
      isDemo: true,
      productionGuard: true,
    }),

    site: Object.freeze({
      baseUrl: SITE_BASE_URL,
      repository:
        "https://github.com/dpromstk2000-lab/dpro-shiho-inheritance-line-liff",
      upload:
        "https://github.com/dpromstk2000-lab/dpro-shiho-inheritance-line-liff/upload/main",
      pagesSettings:
        "https://github.com/dpromstk2000-lab/dpro-shiho-inheritance-line-liff/settings/pages",
    }),

    productReady: Object.freeze({
      version: "SHIHO-FRONT-PR-R2-20260824",
      gatewayBaseUrl: PRODUCT_READY_R2_BASE_URL,
      memberGatewayBaseUrl: MEMBER_R2_BASE_URL,
      canonicalDemoUrl: `${SITE_BASE_URL}/owner.html?demo=1`,
      storageBinding: true,
      supportRecovery: false,
      websiteSync: false,
      serviceBinding: false,
    }),

    line: Object.freeze({
      liffId: "",
      bindingStatus: "deferred_until_contract",
      identityAuthority: "LIFF_ID_TOKEN_SERVER_VERIFY",
    }),

    api: Object.freeze({
      baseUrl: API_BASE_URL,
      timeoutMs: 15000,
      endpoints: Object.freeze({
        health: "/api/health",
        ping: "/api/ping",
        publicOffice: "/api/public/office",
        publicCategories: "/api/public/categories",
        publicAvailability: "/api/public/availability",
        publicInquiry: "/api/public/inquiry",
        memberSession: "/api/member/session",
        memberSessionRevoke: "/api/member/session/revoke",
        memberSummary: "/api/member/summary",
        memberDocuments: "/api/member/documents",
        memberAppointments: "/api/member/appointments",
        memberMessage: "/api/member/message",
        memberAppointmentChange: "/api/member/appointment/request-change",
        adminLogin: "/api/admin/login",
        adminSystemCheck: "/api/admin/system-check",
        adminDemoPrepare: "/api/admin/demo-prepare",
        adminDashboard: "/api/admin/dashboard",
        adminInquiries: "/api/admin/inquiries",
        adminClients: "/api/admin/clients",
        adminLineLinkRequests: "/api/admin/line-link-requests",
        adminCases: "/api/admin/cases",
        adminAppointments: "/api/admin/appointments",
        adminStaff: "/api/admin/staff",
        adminSettings: "/api/admin/settings",
        adminMessageTemplates: "/api/admin/message-templates",
        adminReferralPartners: "/api/admin/referral-partners",
      }),
    }),

    pages: Object.freeze({
      index: `${SITE_BASE_URL}/index.html`,
      member: `${SITE_BASE_URL}/member.html`,
      owner: `${SITE_BASE_URL}/owner.html`,
      staff: `${SITE_BASE_URL}/staff.html`,
      ownerIpad: `${SITE_BASE_URL}/owner-ipad.html`,
      systemCheck: `${SITE_BASE_URL}/system-check.html`,
    }),

    booking: Object.freeze({
      slotMinutes: 30,
      disallowPast: true,
      staffOverlapGuard: true,
      defaultWindowDays: 90,
    }),

    demo: Object.freeze({
      enabled: true,
      queryFlag: "demo",
      queryValue: "1",
      lineUserId: "U_DEMO_SHIHO_001",
      adminCode: "1234",
      autoFillAdminCodeOnlyWhenDemoQuery: true,
    }),

    ui: Object.freeze({
      theme: "judicial-scrivener-inheritance",
      fontFamily:
        'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans JP",sans-serif',
      colors: Object.freeze({
        navy: "#1F3046",
        deepNavy: "#132238",
        gold: "#A17B35",
        ivory: "#F6F3EC",
        white: "#FFFFFF",
        text: "#1C2733",
        muted: "#5E6A76",
        success: "#2F7A55",
        warning: "#A96713",
        danger: "#B42318",
      }),
      minimumBodyPx: 16,
      lineHeight: 1.65,
      minimumInputHeightPx: 49,
      minimumButtonHeightPx: 52,
    }),

    security: Object.freeze({
      neverExposeSecrets: true,
      memberRequiresVerifiedLineSession: true,
      lineLinkApprovalRequired: true,
      sensitiveDocumentsPrivate: true,
      legalDeadlineRequiresProfessionalConfirmation: true,
      legalJudgmentAutomationDisabled: true,
    }),
  });

  function trimSlashes(value) {
    return String(value || "").replace(/^\/+|\/+$/g, "");
  }

  function apiUrl(path, query = undefined) {
    const normalizedPath = `/${trimSlashes(path)}`;
    const memberR2 = normalizedPath === "/api/member/session" || normalizedPath.startsWith("/api/member/");
    const baseUrl = memberR2 ? CONFIG.productReady.memberGatewayBaseUrl : CONFIG.api.baseUrl;
    const url = new URL(`${baseUrl}${normalizedPath}`);

    if (query && typeof query === "object") {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.set(key, String(value));
        }
      });
    }

    return url.toString();
  }

  function pageUrl(pageName, query = undefined) {
    const page = CONFIG.pages[pageName];
    if (!page) {
      throw new Error(`Unknown page: ${pageName}`);
    }

    const url = new URL(page);
    if (query && typeof query === "object") {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.set(key, String(value));
        }
      });
    }
    return url.toString();
  }

  function isDemoMode() {
    if (!CONFIG.demo.enabled) return false;
    const params = new URLSearchParams(window.location.search);
    return (
      params.get(CONFIG.demo.queryFlag) === CONFIG.demo.queryValue ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    );
  }

  async function apiFetch(path, options = {}) {
    const controller = new AbortController();
    const timeoutMs = Number(options.timeoutMs || CONFIG.api.timeoutMs);
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    const headers = new Headers(options.headers || {});
    headers.set("accept", "application/json");
    headers.set("x-request-id", crypto.randomUUID());

    if (
      options.body !== undefined &&
      !(options.body instanceof FormData) &&
      !headers.has("content-type")
    ) {
      headers.set("content-type", "application/json");
    }

    const token = options.token;
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }

    const requestBody =
      options.body !== undefined &&
      !(options.body instanceof FormData) &&
      typeof options.body !== "string"
        ? JSON.stringify(options.body)
        : options.body;

    try {
      const response = await fetch(
        apiUrl(path, options.query),
        {
          method: options.method || "GET",
          headers,
          body: requestBody,
          signal: controller.signal,
          cache: options.cache || "no-store",
        },
      );

      const text = await response.text();
      let payload = {};

      if (text) {
        try {
          payload = JSON.parse(text);
        } catch {
          payload = { ok: false, message: "API応答を読み取れませんでした。" };
        }
      }

      if (!response.ok || payload.ok === false) {
        const error = new Error(
          payload.message || `APIエラーが発生しました（${response.status}）`,
        );
        error.status = response.status;
        error.code = payload.error || "API_REQUEST_FAILED";
        error.payload = payload;
        throw error;
      }

      return payload;
    } catch (error) {
      if (error?.name === "AbortError") {
        const timeoutError = new Error(
          "通信に時間がかかっています。しばらく待ってから再度お試しください。",
        );
        timeoutError.code = "API_TIMEOUT";
        throw timeoutError;
      }
      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  function safeText(value, fallback = "—") {
    if (value === undefined || value === null || value === "") return fallback;
    return String(value);
  }

  Object.defineProperty(window, "DPRO_SHIHO_CONFIG", {
    value: CONFIG,
    writable: false,
    configurable: false,
    enumerable: true,
  });

  Object.defineProperty(window, "DPRO_SHIHO", {
    value: Object.freeze({
      config: CONFIG,
      apiUrl,
      pageUrl,
      apiFetch,
      isDemoMode,
      safeText,
    }),
    writable: false,
    configurable: false,
    enumerable: true,
  });

  if (!document.querySelector('script[data-dpro-shiho-r2]')) {
    const bridge = document.createElement("script");
    bridge.src = `${SITE_BASE_URL}/product-ready-r2.js?v=SHIHO-FRONT-PR-R2-20260824`;
    bridge.defer = true;
    bridge.dataset.dproShihoR2 = "1";
    (document.head || document.documentElement).appendChild(bridge);
  }

  /* DPRO SHIHO Tutorial STANDARD V1.1 / R3 loader */
  try {
    let tutorialStateExists = false;
    try {
      tutorialStateExists = !!sessionStorage.getItem("dpro_tutorial_shiho_v1_1_state");
    } catch {}
    const tutorialRequested =
      isDemoMode() ||
      new URLSearchParams(window.location.search).has("tutorial") ||
      tutorialStateExists;
    if (tutorialRequested) {
      if (!document.querySelector('link[data-dpro-shiho-tutorial]')) {
        const tutorialCss = document.createElement("link");
        tutorialCss.rel = "stylesheet";
        tutorialCss.href = `${SITE_BASE_URL}/tutorial.css?v=SHIHO-TUTORIAL-R3-FIX1-20260827`;
        tutorialCss.dataset.dproShihoTutorial = "1";
        (document.head || document.documentElement).appendChild(tutorialCss);
      }
      if (!document.querySelector('script[data-dpro-shiho-tutorial]')) {
        const tutorialScript = document.createElement("script");
        tutorialScript.src = `${SITE_BASE_URL}/tutorial.js?v=SHIHO-TUTORIAL-R3-FIX1-20260827`;
        tutorialScript.async = false;
        tutorialScript.dataset.dproShihoTutorial = "1";
        (document.head || document.documentElement).appendChild(tutorialScript);
      }
    }
  } catch {
    // Tutorial layer must never block the business application.
  }
})();

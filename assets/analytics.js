(function () {
  "use strict";

  const CONSENT_KEY = "carnevele-analytics-consent-v1";
  const ga4Id =
    document.querySelector('meta[name="carnevele-ga4-id"]')?.content.trim() || "";
  const clarityId =
    document.querySelector('meta[name="carnevele-clarity-id"]')?.content.trim() || "";
  const ga4Configured = /^G-[A-Z0-9]+$/i.test(ga4Id);
  const clarityConfigured = /^[a-z0-9]+$/i.test(clarityId);
  const analyticsScript = document.currentScript;
  const cookiesUrl = analyticsScript?.src
    ? new URL("../cookies.html", analyticsScript.src).href
    : "./cookies.html";
  let consent = readConsent();
  let servicesStarted = false;
  let lastPageKey = "";

  function readConsent() {
    try {
      const value = localStorage.getItem(CONSENT_KEY);
      return value === "granted" || value === "denied" ? value : "unset";
    } catch {
      return "unset";
    }
  }

  function writeConsent(value) {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // Consent still applies for the current page when storage is unavailable.
    }
  }

  function loadScript(src) {
    const script = document.createElement("script");
    script.async = true;
    script.src = src;
    document.head.appendChild(script);
  }

  function startGoogleAnalytics() {
    if (!ga4Configured) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function gtag() {
        window.dataLayer.push(arguments);
      };
    window.gtag("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "granted",
    });
    window.gtag("js", new Date());
    window.gtag("config", ga4Id, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_flags: "SameSite=Lax;Secure",
    });
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`);
  }

  function startClarity() {
    if (!clarityConfigured) return;
    window.clarity =
      window.clarity ||
      function clarity() {
        (window.clarity.q = window.clarity.q || []).push(arguments);
      };
    window.clarity("consentv2", {
      ad_Storage: "denied",
      analytics_Storage: "granted",
    });
    loadScript(`https://www.clarity.ms/tag/${encodeURIComponent(clarityId)}`);
  }

  function startServices() {
    if (servicesStarted || consent !== "granted") return;
    servicesStarted = true;
    startGoogleAnalytics();
    startClarity();
    window.dispatchEvent(new CustomEvent("carnevele:analytics-ready"));
  }

  function event(name, parameters = {}) {
    if (consent !== "granted" || !ga4Configured || typeof window.gtag !== "function") {
      return false;
    }
    window.gtag("event", name, parameters);
    return true;
  }

  function safePageUrl() {
    const url = new URL(window.location.href);
    const payment = url.searchParams.get("payment");
    url.search = "";
    if (["success", "pending", "failure"].includes(payment)) {
      url.searchParams.set("payment", payment);
    }
    const publicHash = /^#(?:home|collection|about|contact|product\/[a-z-]+\/[a-z-]+)$/;
    if (url.hash && !publicHash.test(url.hash)) url.hash = "";
    return url;
  }

  function pageView(parameters = {}) {
    const safeUrl = safePageUrl();
    const payload = {
      ...parameters,
      page_title: document.title,
      page_location: safeUrl.href,
      page_path: safeUrl.pathname + safeUrl.search + safeUrl.hash,
    };
    const key = `${payload.page_location}|${payload.page_title}`;
    if (key === lastPageKey) return false;
    const sent = event("page_view", payload);
    if (sent) lastPageKey = key;
    return sent;
  }

  function renderConsentBanner() {
    let banner = document.getElementById("analyticsConsent");
    if (!banner) {
      banner = document.createElement("aside");
      banner.id = "analyticsConsent";
      banner.className = "analytics-consent";
      banner.setAttribute("role", "dialog");
      banner.setAttribute("aria-label", "Preferências de privacidade");
      banner.innerHTML = `
        <p><strong>PRIVACIDADE</strong> Usamos análises opcionais para entender a experiência da loja. Nenhum script de analytics é carregado sem sua escolha. <a href="${cookiesUrl}">Saiba mais</a>.</p>
        <div>
          <button type="button" data-consent="denied">Continuar sem análises</button>
          <button type="button" class="consent-primary" data-consent="granted">Aceitar análises</button>
        </div>`;
      document.body.appendChild(banner);
      banner.addEventListener("click", (eventObject) => {
        const button = eventObject.target.closest("[data-consent]");
        if (button) setConsent(button.dataset.consent);
      });
    }
    banner.hidden = false;
  }

  function setConsent(value) {
    if (value !== "granted" && value !== "denied") return;
    consent = value;
    writeConsent(value);
    document.getElementById("analyticsConsent")?.setAttribute("hidden", "");
    if (value === "granted") {
      startServices();
      pageView();
    } else {
      if (typeof window.gtag === "function") {
        window.gtag("consent", "update", { analytics_storage: "denied" });
      }
      if (typeof window.clarity === "function") {
        window.clarity("consentv2", {
          ad_Storage: "denied",
          analytics_Storage: "denied",
        });
        window.clarity("consent", false);
      }
    }
  }

  window.carneveleAnalytics = {
    event,
    pageView,
    getConsent: () => consent,
    setConsent,
    showPreferences: renderConsentBanner,
    configuration: { ga4Configured, clarityConfigured },
  };

  document.addEventListener("click", (eventObject) => {
    if (eventObject.target.closest("[data-cookie-preferences]")) {
      eventObject.preventDefault();
      renderConsentBanner();
    }
  });

  if (consent === "granted") startServices();
  else if (consent === "unset") renderConsentBanner();

  if (!document.body.hasAttribute("data-analytics-manual-page-view")) {
    pageView();
  }
})();

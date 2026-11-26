// engine.js - rule-based detection for TrustLayer (part 1)
// No AI or ML here: every check is a plain rule that we can explain.
window.TrustLayer = window.TrustLayer || {};

(function () {
  const S = TrustLayer.strings;

  // Small demo list of genuine sites (future: community reports, college partners)
  const GENUINE_SITES = [
    "internshala.com", "naukri.com", "linkedin.com",
    "infosys.com", "wipro.com", "scholarships.gov.in"
  ];

  // Brand names scammers like to copy
  const BRAND_NAMES = [
    "internshala", "naukri", "linkedin", "infosys", "wipro", "scholarships"
  ];

  // How much each warning sign reduces the trust score (out of 100)
  const POINTS = {
    verified_site: 0,
    lookalike_domain: 40,
    new_domain: 15,
    upfront_fee: 35,
    personal_upi: 30,
    whatsapp_telegram_only: 15,
    free_email_contact: 15,
    guaranteed_job: 20,
    sensitive_request: 30,
    fake_countdown: 15,
    preticked_consent: 15,
    hidden_agent_text: 40,
    hidden_fees: 20
  };
  TrustLayer.points = POINTS;

  // Build one finding: which rule fired, its weight, and the plain-English reason
  function finding(id) {
    return { id: id, points: POINTS[id] || 0, text: S.rules[id] };
  }
  TrustLayer.finding = finding;

  // ---------- Domain checks ----------
  function getHost(url) {
    try {
      return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    } catch (e) {
      return "";
    }
  }

  function isGenuine(host) {
    return GENUINE_SITES.some(function (d) {
      return host === d || host.endsWith("." + d);
    });
  }

  // Scammers swap letters for look-alike digits (0=o, 1=l or i, 3=e, 5=s) and add hyphens
  function variants(host) {
    const base = host.replace(/0/g, "o").replace(/3/g, "e").replace(/5/g, "s");
    return [
      base.replace(/1/g, "l").replace(/[-_.]/g, ""),
      base.replace(/1/g, "i").replace(/[-_.]/g, "")
    ];
  }

  TrustLayer.checkDomain = function (url, ageDays) {
    const host = getHost(url);
    if (!host) return [];

    // A known genuine site: no domain warnings
    if (isGenuine(host)) return [finding("verified_site")];

    const found = [];
    const v = variants(host);
    const copiesBrand = BRAND_NAMES.some(function (b) {
      return v.some(function (h) { return h.indexOf(b) !== -1; });
    });
    if (copiesBrand) found.push(finding("lookalike_domain"));

    // Very young domains are common for scam pages
    if (typeof ageDays === "number" && ageDays < 30) found.push(finding("new_domain"));

    return found;
  };

  // ---------- Text checks ----------
  const FREE_EMAIL = /@(gmail|yahoo|outlook|hotmail|rediffmail)\./;

  TrustLayer.checkText = function (text) {
    if (!text) return [];
    const t = text.toLowerCase();
    const found = [];

    // Asking for money upfront
    if (/(registration|security|processing|training|joining|application|kit|refundable)\s+(fee|fees|deposit|charges?)/.test(t) ||
        /(pay|deposit)\s*(₹|rs\.?|inr)\s*\d/.test(t)) {
      found.push(finding("upfront_fee"));
    }

    // A UPI ID written on the page (demo limit: we cannot tell personal from company IDs)
    if (/[a-z0-9._-]{2,}@(ybl|paytm|oksbi|okhdfcbank|okicici|okaxis|ibl|axl|upi|apl)\b/.test(t)) {
      found.push(finding("personal_upi"));
    }

    // Emails on the page (UPI IDs have no dot after @, so they are not counted)
    const emails = t.match(/[a-z0-9._-]+@[a-z0-9-]+\.[a-z.]+/g) || [];
    const hasCompanyEmail = emails.some(function (e) { return !FREE_EMAIL.test(e); });

    // WhatsApp/Telegram contact with no company email
    if (/(whatsapp|telegram|wa\.me|t\.me)/.test(t) && !hasCompanyEmail) {
      found.push(finding("whatsapp_telegram_only"));
    }

    // Free email address used as contact
    if (emails.some(function (e) { return FREE_EMAIL.test(e); })) {
      found.push(finding("free_email_contact"));
    }

    // Guaranteed job promises
    if (/(guaranteed|assured)\s+(job|placement|selection|internship|offer)/.test(t) ||
        /job guarantee/.test(t)) {
      found.push(finding("guaranteed_job"));
    }

    // Asking for OTP, Aadhaar, bank details
    if (/(share|send|enter|submit|provide|upload)[^.]{0,40}(otp|aadhaar|aadhar|upi pin|cvv|bank account|account number|card number)/.test(t)) {
      found.push(finding("sensitive_request"));
    }

    return found;
  };
    // Official address to suggest when a page copies a known brand
  const OFFICIAL_URLS = {
    internshala: "https://internshala.com",
    naukri: "https://www.naukri.com",
    linkedin: "https://www.linkedin.com",
    infosys: "https://www.infosys.com",
    wipro: "https://www.wipro.com",
    scholarships: "https://scholarships.gov.in"
  };

  TrustLayer.officialFor = function (url) {
    const host = getHost(url);
    if (!host || isGenuine(host)) return null;
    const v = variants(host);
    for (let i = 0; i < BRAND_NAMES.length; i++) {
      const b = BRAND_NAMES[i];
      if (v.some(function (h) { return h.indexOf(b) !== -1; })) return OFFICIAL_URLS[b] || null;
    }
    return null;
  };

  // ===== PART 2 (scan and decide) WILL BE ADDED BELOW THIS LINE =====
})();
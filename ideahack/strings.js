// strings.js - plain-English warning text for TrustLayer.
// engine.js will refer to these by rule id.
window.TrustLayer = window.TrustLayer || {};

TrustLayer.strings = {
  verdicts: {
    safe: "No warning signs found on this page.",
    caution: "Be careful: this page has some warning signs.",
    danger: "High risk: this page looks like a scam."
  },

  rules: {
    verified_site: "This is a known genuine site from our demo list.",
    lookalike_domain: "This web address copies a well-known site's name but is not the real one.",
    new_domain: "This site's address is only a few days old, which is common for scam pages.",
    upfront_fee: "It asks you to pay money upfront for a job or internship, which real employers do not do.",
    personal_upi: "It asks you to pay to a personal UPI ID instead of a company account.",
    whatsapp_telegram_only: "It only lets you contact them on WhatsApp or Telegram, with no official channel.",
    free_email_contact: "It uses a free email address (like Gmail) instead of a company email.",
    guaranteed_job: "It promises a guaranteed job or selection, which no genuine employer can promise.",
    fake_countdown: "The countdown timer is there only to rush you into paying.",
    preticked_consent: "Boxes are already ticked for you, so you may be agreeing without noticing.",
    sensitive_request: "It asks for your OTP, Aadhaar or bank details, which a genuine site should not ask for here.",
    hidden_agent_text: "Hidden text on this page is trying to give instructions to AI agents.",
    hidden_fees: "Extra fees are hidden and only appear at the final price."
  },

  suggestion: "Safer option: type the official website address yourself instead of using this page.",

  agent: {
    allow: "Allowed: no serious warning signs.",
    pause: "Paused: a person must confirm before the agent continues.",
    block: "Blocked: this page is too risky for an agent to pay or share details."
  }
};
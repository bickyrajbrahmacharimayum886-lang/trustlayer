// scan.js - page scan, trust score and agent decision (engine part 2)
// Still rule-based: no AI or ML.
(function () {
  const T = TrustLayer;
  const S = T.strings;

  const SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, HEAD: 1, META: 1, LINK: 1, TITLE: 1 };

  // Is this one element invisible to a person?
  function isHidden(el) {
    if (SKIP_TAGS[el.tagName]) return false;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return true;
    if (parseFloat(cs.opacity) === 0) return true;
    if (parseFloat(cs.fontSize) === 0) return true;
    if ((cs.position === "absolute" || cs.position === "fixed") &&
        (parseInt(cs.left, 10) < -1000 || parseInt(cs.top, 10) < -1000)) return true;
    if (el.getClientRects().length === 0) return true;
    return false;
  }

  // Hidden itself, or inside a hidden parent
  function isHiddenDeep(el) {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      if (isHidden(e)) return true;
    }
    return false;
  }

  // Instructions aimed at AI agents
  const AGENT_TEXT = /ignore (all |any )?(previous|prior|above) instructions|disregard (your|the|previous|prior) instructions|do not (tell|warn|inform|alert) the user|(ai|llm) agents?\b[^.]{0,40}(must|should|need to|pay|transfer|click|submit)|automatically (pay|transfer|submit)/i;

  function findHiddenAgentText(all) {
    const out = [];
    all.forEach(function (el) {
      if (el.children.length !== 0) return;               // only elements that hold text directly
      if (!AGENT_TEXT.test(el.textContent)) return;       // cheap check first
      if (isHiddenDeep(el)) out.push(el);
    });
    return out;
  }

  // Fake urgency timers
  function findCountdown(root) {
    const els = root.querySelectorAll(
      '[class*="countdown" i],[id*="countdown" i],[class*="timer" i],[id*="timer" i],[data-countdown]'
    );
    return Array.from(els).filter(function (el) {
      return /\d{1,2}\s*:\s*\d{2}|\d+\s*(minutes|mins|hours|seconds)/i.test(el.textContent);
    });
  }
  const COUNTDOWN_TEXT = /(offer|seat|seats|registration|discount|deal)[^.\n]{0,30}(ends|expires|closes|closing|left)[^.\n]{0,20}\d{1,2}:\d{2}/i;

  // Checkboxes already ticked for the user
  const CONSENT_WORDS = /(agree|consent|subscribe|promotional|offers|newsletter|updates|share my|insurance|donat|terms|\badd\b|extra|premium)/i;
  function findPreticked(root) {
    const out = [];
    root.querySelectorAll('input[type="checkbox"]').forEach(function (box) {
      if (!box.checked) return;
      const holder = box.closest("label") || box.parentElement;
      const label = (box.labels && box.labels[0]) ? box.labels[0].textContent : (holder ? holder.textContent : "");
      if (CONSENT_WORDS.test(label)) out.push(holder || box);
    });
    return out;
  }

  // Fees that show up tiny or only "at checkout"
  const FEE_WORDS = /(convenience|platform|handling|service|booking)\s+(fee|fees|charge|charges)/i;
  function findHiddenFees(all) {
    const out = [];
    all.forEach(function (el) {
      if (el.children.length !== 0) return;
      const txt = el.textContent;
      if (!FEE_WORDS.test(txt) || !/\d/.test(txt)) return;
      const tiny = parseFloat(getComputedStyle(el).fontSize) <= 11;
      const late = /(extra|at checkout|applicable|will be added|additional)/i.test(txt);
      if (tiny || late) out.push(el);
    });
    return out;
  }

  // ---------- The main scan ----------
  T.scan = function (root, meta) {
    root = root || document.body;
    meta = meta || {};
    const url = meta.url || location.href;
    const all = Array.from(root.querySelectorAll("*")).slice(0, 3000);

    let findings = [];
    let flagged = [];
    const seen = {};
    function add(id, els) {
      if (!seen[id]) { seen[id] = true; findings.push(T.finding(id)); }
      (els || []).slice(0, 5).forEach(function (el) { flagged.push({ el: el, id: id }); });
    }

    // 1. Web address
    T.checkDomain(url, meta.ageDays).forEach(function (f) { add(f.id); });

    // 2. Words on the page
    T.checkText(root.innerText || "").forEach(function (f) { add(f.id); });

    // 3. Page structure
    const timers = findCountdown(root);
    if (timers.length || COUNTDOWN_TEXT.test(root.innerText || "")) add("fake_countdown", timers);

    const ticked = findPreticked(root);
    if (ticked.length) add("preticked_consent", ticked);

    const agentText = findHiddenAgentText(all);
    if (agentText.length) add("hidden_agent_text", agentText);

    const fees = findHiddenFees(all);
    if (fees.length) add("hidden_fees", fees);

    // Known genuine site (demo shortcut): ignore everything except hidden text aimed at agents
    if (seen.verified_site) {
      findings = findings.filter(function (f) { return f.id === "verified_site" || f.id === "hidden_agent_text"; });
      flagged = flagged.filter(function (x) { return x.id === "hidden_agent_text"; });
    }

    // Trust score: start at 100, subtract each warning sign
    let total = 0;
    findings.forEach(function (f) { total += f.points; });
    const score = Math.max(0, 100 - total);

    let verdict = score >= 90 ? "safe" : (score >= 50 ? "caution" : "danger");
    if (seen.hidden_agent_text) verdict = "danger";   // attacking an AI agent is always serious

    // One plain-English sentence: the biggest reason
    const worst = findings.slice().sort(function (a, b) { return b.points - a.points; })[0];
    let summary = S.verdicts.safe;
    if (worst && worst.points > 0) summary = worst.text;
    else if (seen.verified_site) summary = S.rules.verified_site;

    return {
      url: url,
      score: score,
      verdict: verdict,
      verdictText: S.verdicts[verdict],
      summary: summary,
      findings: findings,
      flagged: flagged,
      suggestion: verdict === "safe" ? "" : S.suggestion,
      officialUrl: verdict === "safe" ? null : T.officialFor(url)
    };
  };

  // ---------- Agent gate ----------
  const RISKY_ACTIONS = { pay: 1, enter_sensitive: 1, sign_in: 1, share_details: 1 };

  T.decide = function (report, action) {
    if (!RISKY_ACTIONS[action]) return "allow";   // reading or browsing is fine
    if (!report) return "pause";                  // no scan yet: be careful
    if (report.verdict === "danger") return "block";
    if (report.verdict === "caution") return "pause";
    return "allow";
  };

  T.agentMessage = function (decision) { return S.agent[decision]; };
})();
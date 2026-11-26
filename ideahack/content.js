// content.js - scans the page and shows the TrustLayer panel (Shadow DOM)
(function () {
  if (!document.body) return;
  const S = TrustLayer.strings;

  function readMeta(name) {
    const m = document.querySelector('meta[name="' + name + '"]');
    return m ? m.getAttribute("content") : null;
  }

  // Demo pages run on localhost, so meta tags say which "real" address to pretend this is
  const metaUrl = readMeta("trustlayer-url");
  const metaAge = Number(readMeta("trustlayer-age-days"));
  const meta = {
    url: metaUrl || location.href,
    ageDays: readMeta("trustlayer-age-days") !== null && !isNaN(metaAge) ? metaAge : undefined
  };

  const report = TrustLayer.scan(document.body, meta);
  TrustLayer.lastReport = report;

  // Highlight the flagged parts of the page
  report.flagged.forEach(function (x) {
    x.el.style.outline = "3px solid #dc2626";
    x.el.style.outlineOffset = "2px";
    x.el.title = S.rules[x.id];
  });

  const COLORS = { safe: "#15803d", caution: "#b45309", danger: "#b91c1c" };
  const color = COLORS[report.verdict];

  function make(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // Shadow DOM: the page's own CSS cannot break or restyle our panel
  const host = document.createElement("div");
  host.id = "trustlayer-host";
  host.style.cssText = "all:initial;position:fixed;top:16px;right:16px;z-index:2147483647;";
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent =
    ".card{width:340px;max-width:90vw;background:#fff;color:#111827;border-radius:12px;" +
    "box-shadow:0 8px 30px rgba(0,0,0,.25);font:14px/1.45 system-ui,sans-serif;overflow:hidden;border:1px solid #e5e7eb}" +
    ".head{padding:12px 14px;color:#fff;font-weight:700}" +
    ".body{padding:12px 14px}" +
    ".score{font-weight:700;margin-bottom:6px}" +
    ".bar{height:8px;background:#e5e7eb;border-radius:99px;overflow:hidden;margin-bottom:10px}" +
    ".fill{height:100%}" +
    ".summary{font-weight:600;margin:0 0 10px}" +
    ".why{margin:0 0 6px;font-size:12px;color:#4b5563;text-transform:uppercase;letter-spacing:.04em}" +
    "ul{margin:0 0 10px;padding-left:18px}li{margin-bottom:4px}" +
    ".more{font-size:12px;color:#4b5563;margin:0 0 10px}" +
    ".tip{background:#f3f4f6;padding:8px 10px;border-radius:8px;margin-bottom:10px}" +
    "button{background:#111827;color:#fff;border:0;padding:8px 14px;border-radius:8px;font:inherit;cursor:pointer}" +
    ".pill{color:#fff;padding:8px 12px;border-radius:999px;font:13px system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.25)}";
  shadow.appendChild(style);

  if (report.verdict === "safe") {
    // Small green pill, no alarm
    const pill = make("div", "pill", "TrustLayer: " + report.summary + " (" + report.score + "/100)");
    pill.style.background = color;
    shadow.appendChild(pill);
  } else {
    const card = make("div", "card");
    const head = make("div", "head", report.verdictText);
    head.style.background = color;
    card.appendChild(head);

    const body = make("div", "body");
    body.appendChild(make("div", "score", "Trust score: " + report.score + "/100"));
    const bar = make("div", "bar");
    const fill = make("div", "fill");
    fill.style.width = report.score + "%";
    fill.style.background = color;
    bar.appendChild(fill);
    body.appendChild(bar);

    body.appendChild(make("p", "summary", report.summary));

    // Show the 5 biggest reasons, then a count of the rest
    const reasons = report.findings
      .filter(function (f) { return f.points > 0; })
      .sort(function (a, b) { return b.points - a.points; });
    body.appendChild(make("p", "why", "Why we flagged this"));
    const ul = make("ul");
    reasons.slice(0, 5).forEach(function (f) { ul.appendChild(make("li", null, f.text)); });
    body.appendChild(ul);
    if (reasons.length > 5) {
      body.appendChild(make("p", "more", "+ " + (reasons.length - 5) + " more warning signs"));
    }

    if (report.suggestion) body.appendChild(make("div", "tip", report.suggestion));

    // Real official address when the page copies a known brand
    if (report.officialUrl) {
      const official = make("div", "tip", "Official site: ");
      const a = make("a", null, report.officialUrl);
      a.href = report.officialUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.style.cssText = "color:#1d4ed8;font-weight:700;word-break:break-all";
      official.appendChild(a);
      body.appendChild(official);
    }

    const btn = make("button", null, "Dismiss");
    btn.addEventListener("click", function () { host.remove(); });
    body.appendChild(btn);

    card.appendChild(body);
    shadow.appendChild(card);
  }

  document.documentElement.appendChild(host);
})();
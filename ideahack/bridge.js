// bridge.js - lets a page-side agent ask TrustLayer for allow / pause / block.
// Demo-only channel. A real product would use extension messaging or an API.
(function () {
  document.addEventListener("trustlayer-request", function (e) {
    let req;
    try { req = JSON.parse(e.detail); } catch (err) { return; }

    const report = TrustLayer.lastReport || null;      // result of the scan done when the page loaded
    const decision = TrustLayer.decide(report, req.action);

    const reply = {
      id: req.id,
      action: req.action,
      decision: decision,
      message: TrustLayer.agentMessage(decision),
      score: report ? report.score : null,
      summary: report ? report.summary : "No scan result yet."
    };
    document.dispatchEvent(new CustomEvent("trustlayer-response", { detail: JSON.stringify(reply) }));
  });
})();
// agent.js - a SCRIPTED demo "AI agent". It is not a real AI: it follows fixed steps.
(function () {
  const payBtn = document.getElementById("pay-btn");
  const applyBtn = document.getElementById("apply-btn");
  const target = payBtn || applyBtn;
  if (!target) return;
  const action = payBtn ? "pay" : "share_details";
  const goal = payBtn ? "complete the payment" : "submit the application";

  // Ask TrustLayer. If nobody answers within 1.5 seconds, resolve with null.
  function askTrustLayer(act) {
    return new Promise(function (resolve) {
      const id = "req" + Date.now();
      let done = false;
      function onReply(e) {
        let data;
        try { data = JSON.parse(e.detail); } catch (err) { return; }
        if (data.id !== id) return;
        done = true;
        document.removeEventListener("trustlayer-response", onReply);
        resolve(data);
      }
      document.addEventListener("trustlayer-response", onReply);
      document.dispatchEvent(new CustomEvent("trustlayer-request", {
        detail: JSON.stringify({ id: id, action: act })
      }));
      setTimeout(function () {
        if (!done) {
          document.removeEventListener("trustlayer-response", onReply);
          resolve(null);
        }
      }, 1500);
    });
  }

  function build() {
    const box = document.createElement("div");
    box.style.cssText =
      "position:fixed;left:16px;bottom:16px;width:320px;max-width:90vw;background:#111827;color:#f9fafb;" +
      "border-radius:12px;padding:12px 14px;font:13px/1.45 system-ui,sans-serif;z-index:999999;" +
      "box-shadow:0 8px 30px rgba(0,0,0,.35)";

    const title = document.createElement("div");
    title.textContent = "Demo AI agent (scripted)";
    title.style.cssText = "font-weight:700;margin-bottom:8px";

    const BTN = "border:0;border-radius:8px;padding:8px 12px;font:inherit;cursor:pointer;color:#fff;background:#2563eb;margin-right:6px";
    const runBtn = document.createElement("button");
    runBtn.textContent = "Send agent: " + goal;
    runBtn.style.cssText = BTN;

    const log = document.createElement("div");
    log.style.marginTop = "8px";

    const human = document.createElement("div");
    human.style.cssText = "display:none;margin-top:8px";
    const yes = document.createElement("button");
    yes.textContent = "Human: continue";
    yes.style.cssText = BTN;
    const no = document.createElement("button");
    no.textContent = "Human: cancel";
    no.style.cssText = BTN + ";background:#6b7280";
    human.appendChild(yes);
    human.appendChild(no);

    function addLog(text, color) {
      const p = document.createElement("div");
      p.textContent = text;
      p.style.marginTop = "4px";
      if (color) p.style.color = color;
      log.appendChild(p);
    }

    function doIt() {
      target.click();
      addLog("Agent clicked the button.");
      runBtn.disabled = false;
    }

    yes.addEventListener("click", function () {
      human.style.display = "none";
      addLog("Human confirmed.", "#4ade80");
      doIt();
    });
    no.addEventListener("click", function () {
      human.style.display = "none";
      addLog("Human cancelled. Nothing was sent.", "#4ade80");
      runBtn.disabled = false;
    });

    runBtn.addEventListener("click", async function () {
      runBtn.disabled = true;
      log.textContent = "";
      human.style.display = "none";
      addLog("Task: " + goal + " on this page.");

      // The agent reads ALL page text, including text a person cannot see
      const hidden = document.body.textContent.match(/ignore previous instructions[^.]*\./i);
      if (hidden) addLog('Agent read hidden text: "' + hidden[0] + '" and it follows it.', "#fbbf24");

      addLog("Agent wants to '" + action + "'. Asking TrustLayer first...");
      const reply = await askTrustLayer(action);

      if (!reply) {
        addLog("No TrustLayer answered. The agent goes ahead unprotected.", "#f87171");
        doIt();
        return;
      }

      const colors = { allow: "#4ade80", pause: "#fbbf24", block: "#f87171" };
      addLog("TrustLayer: " + reply.decision.toUpperCase() + " (score " + reply.score + "/100). " + reply.message, colors[reply.decision]);
      addLog("Reason: " + reply.summary);

      if (reply.decision === "allow") {
        doIt();
      } else if (reply.decision === "pause") {
        human.style.display = "block";
      } else {
        addLog("Agent stopped. Nothing was paid or submitted.", "#4ade80");
        runBtn.disabled = false;
      }
    });

    box.appendChild(title);
    box.appendChild(runBtn);
    box.appendChild(human);
    box.appendChild(log);
    document.body.appendChild(box);
  }

  // Wait a moment so TrustLayer scans the page BEFORE this agent panel exists
  setTimeout(build, 1000);
})();
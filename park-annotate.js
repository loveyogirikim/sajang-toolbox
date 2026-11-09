/* 공장 단지 공용 — 화면 지시 위젯 (Agentation 개념 이식, 2026-07-11)
 * 사장님이 사이트 화면에서 요소를 콕 찍어 메모하면, 구조화된 지시문이
 * 관제소 지시 API(_지시.md)로 접수되고 엔진이 다음 가동에 수정한다.
 *
 * 사용: <script src="park-annotate.js?v=3" data-factory="공장id" defer></script>
 * - 비밀번호(factoryKey)가 이 브라우저에 저장된 경우에만 "지시" 버튼이 보인다.
 * - 2026-07-29 이모지 전면 금지(사장님 지시) — 버튼·패널 라벨을 텍스트로 교체 (v=2).
 * - 버튼 클릭 → 지시 모드: 요소에 호버하면 테두리, 클릭하면 메모창. ESC로 종료.
 * - 2026-08-09 권한 분리: 마스터 비밀번호 대신 메모 열쇠 사용, 지시는 승인 대기함으로 접수 (v=3).
 */
(function () {
  try {
    var HUB = "https://factory-hub-one.vercel.app";
    var script = document.currentScript || document.querySelector("script[data-factory]");
    var FACTORY = script ? script.getAttribute("data-factory") : "";
    if (!FACTORY) return;

    // 열쇠 정책 (2026-08-09 권한 분리):
    // 공개 사이트에는 "지시 접수"만 가능한 메모 열쇠만 둔다. 예전에는 모든 권한을 가진
    // 마스터 비밀번호가 여기 저장돼 있었고, 그것이 새면 엔진이 집 PC에서 무엇이든 실행할 수 있었다.
    var KEY_NEW = "factoryInstructKey", KEY_OLD = "factoryKey";
    function key() { return localStorage.getItem(KEY_NEW) || ""; }

    // 구 마스터 값이 남아 있으면 1회 교환하고 지운다.
    // 통신 실패 시에는 지우지 않고 다음 방문에 재시도한다 — 즉시 지우면 일시적 오류만으로
    // 모든 사이트의 버튼이 사라져 수동 복구가 필요해진다. (마스터 비번을 교체하면 잔재는 자동 무효)
    async function migrate() {
      var old = localStorage.getItem(KEY_OLD);
      if (!old || key()) { if (old && key()) localStorage.removeItem(KEY_OLD); return; }
      try {
        var r = await fetch(HUB + "/api/site-key", { method: "POST", headers: { "x-factory-key": old } });
        if (r.status === 401) { localStorage.removeItem(KEY_OLD); return; }
        if (!r.ok) return;
        var out = await r.json();
        if (out && out.key) { localStorage.setItem(KEY_NEW, out.key); localStorage.removeItem(KEY_OLD); }
      } catch (e) { /* 다음 방문에 재시도 */ }
    }

    // ── 스타일 ──
    var css = [
      "#pa-dot{position:fixed;left:14px;bottom:14px;z-index:99998;min-width:38px;height:38px;border-radius:19px;padding:0 12px;",
      "background:#1b2233;color:#f0c75e;border:1px solid #3a4663;font-size:12.5px;font-weight:700;cursor:pointer;opacity:.55;",
      "display:flex;align-items:center;justify-content:center;transition:opacity .2s}",
      "#pa-dot:hover{opacity:1}",
      "#pa-dot.on{background:#f0c75e;color:#141007;opacity:1}",
      ".pa-hl{outline:2px dashed #f0c75e !important;outline-offset:2px;cursor:crosshair !important}",
      "#pa-panel{position:fixed;z-index:99999;width:300px;background:#141a2a;border:1px solid #f0c75e;",
      "border-radius:12px;padding:14px;font-family:'Malgun Gothic',sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.5)}",
      "#pa-panel .pa-el{font-size:11px;color:#9aa8c4;word-break:break-all;margin-bottom:8px;max-height:48px;overflow:hidden}",
      "#pa-panel textarea{width:100%;height:74px;background:#0e1420;color:#eef;border:1px solid #3a4663;",
      "border-radius:8px;padding:8px;font-size:13px;box-sizing:border-box;font-family:inherit}",
      "#pa-panel .pa-row{display:flex;gap:6px;margin-top:8px}",
      "#pa-panel button{flex:1;padding:8px 0;border:0;border-radius:8px;font-size:12.5px;cursor:pointer;font-family:inherit}",
      "#pa-send{background:#f0c75e;color:#141007;font-weight:700}",
      "#pa-copy{background:#2a3450;color:#dde}",
      "#pa-x{background:none;color:#889;flex:0 0 34px}",
      "#pa-msg{font-size:11.5px;margin-top:6px;color:#9fe3a1;min-height:14px}"
    ].join("");
    var st = document.createElement("style");
    st.textContent = css;
    document.head.appendChild(st);

    // ── 버튼 (메모 열쇠가 저장된 브라우저에만) ──
    migrate().then(function () { if (key()) showButton(); });
    return;

    function showButton() {
    var dot = document.createElement("button");
    dot.id = "pa-dot";
    dot.title = "화면 지시 모드 (요소를 찍어 공장에 지시)";
    dot.textContent = "지시";
    document.body.appendChild(dot);

    var mode = false, hovered = null, panel = null;

    function selectorOf(el) {
      if (el.id) return "#" + el.id;
      var parts = [], cur = el, depth = 0;
      while (cur && cur.tagName && depth < 3) {
        var p = cur.tagName.toLowerCase();
        var cls = (cur.className && typeof cur.className === "string")
          ? cur.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
        if (cls) p += "." + cls;
        parts.unshift(p);
        if (cur.id) { parts[0] = "#" + cur.id; break; }
        cur = cur.parentElement; depth++;
      }
      return parts.join(" > ");
    }

    function closePanel() { if (panel) { panel.remove(); panel = null; } }

    function exitMode() {
      mode = false;
      dot.classList.remove("on");
      if (hovered) { hovered.classList.remove("pa-hl"); hovered = null; }
      closePanel();
    }

    dot.addEventListener("click", function () {
      mode ? exitMode() : (mode = true, dot.classList.add("on"));
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") exitMode(); });

    document.addEventListener("mouseover", function (e) {
      if (!mode || panel) return;
      var t = e.target;
      if (t === dot || (panel && panel.contains(t))) return;
      if (hovered) hovered.classList.remove("pa-hl");
      hovered = t; t.classList.add("pa-hl");
    }, true);

    document.addEventListener("click", function (e) {
      if (!mode) return;
      var t = e.target;
      if (t === dot || (panel && panel.contains(t))) return;
      e.preventDefault(); e.stopPropagation();
      openPanel(t, e.clientX, e.clientY);
    }, true);

    function openPanel(el, x, y) {
      closePanel();
      var sel = selectorOf(el);
      var txt = (el.innerText || "").trim().replace(/\s+/g, " ").slice(0, 60);
      var r = el.getBoundingClientRect();
      panel = document.createElement("div");
      panel.id = "pa-panel";
      panel.style.left = Math.min(x, innerWidth - 320) + "px";
      panel.style.top = Math.min(y + 10, innerHeight - 230) + "px";
      panel.innerHTML =
        '<div class="pa-el">' + sel + (txt ? ' — “' + txt + '”' : "") + "</div>" +
        '<textarea id="pa-note" placeholder="이 요소를 어떻게 바꿀까요? 예) 글씨를 더 크게 / 이 카드 내려줘"></textarea>' +
        '<div class="pa-row"><button id="pa-send">공장에 지시</button>' +
        '<button id="pa-copy">복사</button><button id="pa-x">✕</button></div>' +
        '<div id="pa-msg"></div>';
      document.body.appendChild(panel);
      panel.querySelector("#pa-note").focus();

      function instruction() {
        return [
          "[화면 지시 — 사장님이 사이트에서 요소를 직접 찍음]",
          "페이지: " + location.href,
          "요소 선택자: " + sel,
          txt ? "요소 텍스트: “" + txt + "”" : "",
          "요소 위치·크기: (" + Math.round(r.left) + "," + Math.round(r.top) + ") " +
            Math.round(r.width) + "x" + Math.round(r.height),
          "",
          "지시: " + panel.querySelector("#pa-note").value.trim()
        ].filter(Boolean).join("\n");
      }

      panel.querySelector("#pa-x").onclick = closePanel;
      panel.querySelector("#pa-copy").onclick = function () {
        navigator.clipboard.writeText(instruction());
        panel.querySelector("#pa-msg").textContent = "복사됨 — 관제소·클로드에 붙여넣으세요";
      };
      panel.querySelector("#pa-send").onclick = async function () {
        var note = panel.querySelector("#pa-note").value.trim();
        var msg = panel.querySelector("#pa-msg");
        if (!note) { msg.textContent = "지시 내용을 적어주세요"; msg.style.color = "#ff9d8f"; return; }
        msg.style.color = "#9fe3a1"; msg.textContent = "접수 중…";
        try {
          var resp = await fetch(HUB + "/api/instruct", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-factory-key": key() },
            body: JSON.stringify({ factory: FACTORY, instruction: instruction() })
          });
          var out = await resp.json().catch(function () { return {}; });
          if (!resp.ok) throw new Error(out.error || ("HTTP " + resp.status));
          msg.textContent = "접수 완료 — 관제소에서 승인하면 반영됩니다";
          setTimeout(exitMode, 1800);
        } catch (err) {
          msg.style.color = "#ff9d8f";
          msg.textContent = "실패: " + err.message;
        }
      };
    }
    }
  } catch (e) { /* 위젯 오류가 사이트를 깨지 않게 */ }
})();

/* 광고 문구 점검 화면 — 찾기는 AdcheckCore, 규칙은 data/adcheck-rules.json. 여기서는 읽고 그린다(textContent만). */
(function () {
  "use strict";
  var T = window.ToolboxCore, A = window.AdcheckCore, U = window.UI, el = U.el, $ = U.$;
  var form = $("f-check"), out = $("r-check"), rules = null;
  var LEVEL = { warn: "걸릴 수 있어요", check: "사실인지 확인" };

  function basisList(list) {
    var ul = el("ul", "basis-inline");
    (list || []).forEach(function (b) {
      var li = el("li"), a = el("a", null, b.law + " " + b.article);
      a.href = T.safeUrl(b.url) || "#"; a.target = "_blank"; a.rel = "noopener"; a.title = b.quote;
      li.appendChild(a); ul.appendChild(li);
    });
    return ul;
  }
  function opts() { return { kind: form.elements.kind.value, online: form.elements.online.checked }; }

  function render() {
    var text = form.elements.text.value, rep = A.report(text, opts(), rules);
    out.textContent = ""; out.hidden = false;
    var warn = rep.hits.filter(function (h) { return h.level === "warn"; }).length, check = rep.hits.length - warn;
    out.className = "result mk" + (warn ? " is-err" : check ? " is-no" : "");
    if (!text.trim()) { out.appendChild(el("p", null, "점검할 문구를 붙여 넣어 주세요.")); return; }
    out.appendChild(el("p", "big", rep.hits.length ? "걸릴 수 있는 표현 " + warn + "종 · 확인할 표현 " + check + "종" : "표현 사전에 걸린 말이 없어요"));
    out.appendChild(el("p", "muted", rep.hits.length ? "표현마다 왜 위험한지와 고쳐 쓰는 방법을 보고, 사실이면 근거(기준일·출처)를 붙이세요." : "아래 점검표는 문구만으로는 알 수 없는 것들이니 직접 확인해 주세요."));
    rep.hits.forEach(function (h) {
      var box = el("div", "adhit"), head = el("div", "adhit-head");
      head.appendChild(el("span", "badge badge-" + h.level, LEVEL[h.level] || h.level));
      head.appendChild(el("b", null, h.name));
      box.appendChild(head);
      var chips = el("ul", "adhit-chips"), seen = {};
      h.matches.forEach(function (m) { seen[m.text] = (seen[m.text] || 0) + 1; });
      Object.keys(seen).forEach(function (k) { chips.appendChild(el("li", null, "\"" + k + "\"" + (seen[k] > 1 ? " ×" + seen[k] : ""))); });
      box.appendChild(chips);
      box.appendChild(el("p", null, "왜: " + h.why));
      box.appendChild(el("p", null, "이렇게: " + h.fix));
      box.appendChild(basisList(h.basis));
      out.appendChild(box);
    });
    if (rep.long.length) {
      out.appendChild(el("h3", null, "40자 넘는 문장 " + rep.long.length + "개 — 휴대폰에서 한눈에 안 읽혀요"));
      var lu = el("ul"); rep.long.forEach(function (s) { lu.appendChild(el("li", null, s + " (" + s.length + "자)")); }); out.appendChild(lu);
    }
    out.appendChild(el("h3", null, "올리기 전 점검표 — 문구만으로는 알 수 없는 것"));
    var cl = el("ul", "checklist"), done = el("p", "muted");
    function count() { var n = cl.querySelectorAll("input:checked").length; done.textContent = n + " / " + rep.checklist.length + " 확인" + (n < rep.checklist.length ? " — 체크하지 못한 항목의 표현부터 고치세요" : ""); }
    rep.checklist.forEach(function (c, i) {
      var li = el("li"), lab = el("label", "check"), cb = el("input"); cb.type = "checkbox"; cb.id = "ck" + i;
      lab.appendChild(cb); lab.appendChild(document.createTextNode(" " + c.text)); li.appendChild(lab);
      if (c.basis && c.basis.length) li.appendChild(basisList(c.basis));
      cb.addEventListener("change", count); cl.appendChild(li);
    });
    out.appendChild(cl); out.appendChild(done); count();
    if (rep.uncertain.length) {
      var un = el("div", "uncertain"); un.appendChild(el("h3", null, "확인 못 함"));
      var uu = el("ul"); rep.uncertain.forEach(function (t) { uu.appendChild(el("li", null, t)); }); un.appendChild(uu); out.appendChild(un);
    }
    out.appendChild(el("p", "checked", "규칙 사전 확인일 " + rules.checkedAt + " · 조문은 국가법령정보센터 원문과 대조했습니다."));
    out.scrollIntoView({ block: "nearest" });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!rules) { out.hidden = false; out.className = "result is-err"; out.textContent = "규칙 사전을 아직 못 불러왔어요. 잠시 뒤 다시 눌러 주세요."; return; }
    render();
  });
  fetch("../data/adcheck-rules.json").then(function (r) { if (!r.ok) throw new Error(); return r.json(); }).then(function (d) { rules = d; }).catch(function () {
    out.hidden = false; out.className = "result is-err"; out.textContent = "규칙 사전을 불러오지 못했어요. 새로고침해 주세요.";
  });
})();

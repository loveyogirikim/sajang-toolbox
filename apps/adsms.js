/* 홍보 문자·카톡 화면 — 조립·점검은 AdsmsCore, 여기서는 읽고 그린다(textContent만). 발송 기능 없음. */
(function () {
  "use strict";
  var T = window.ToolboxCore, M = window.AdsmsCore, U = window.UI, el = U.el, $ = U.$;
  var form = $("f-sms"), out = $("out"), state = { template: "new-menu" }, timer = null;
  var MARK = { true: "✓", false: "×", null: "·" };

  function chips() {
    var box = $("templates");
    M.TEMPLATES.forEach(function (t) {
      var b = el("button", "chip", t.name); b.type = "button"; b.setAttribute("aria-pressed", String(state.template === t.id));
      b.addEventListener("click", function () {
        state.template = t.id;
        Array.prototype.forEach.call(box.children, function (c) { c.setAttribute("aria-pressed", String(c === b)); });
        $("ad-only").hidden = !t.ad; render();
      });
      box.appendChild(b);
    });
  }
  function hours() {
    var sel = $("hour"), now = new Date().getHours();
    for (var h = 0; h < 24; h++) { var o = el("option", null, (h < 12 ? "오전 " : "오후 ") + (h % 12 || 12) + "시" + (h >= 21 || h < 8 ? " (밤 시간)" : "")); o.value = String(h); if (h === now) o.selected = true; sel.appendChild(o); }
  }
  function opts() {
    var e = form.elements, consent = e.consent.value;
    return { template: state.template, values: { name: e.name.value, contact: e.contact.value, product: e.product.value, offer: e.offer.value, date: e.date.value, detail: e.detail.value, reject: e.reject.value },
      consent: consent === "yes" ? true : consent === "no" ? false : undefined, recent: e.recent.checked, hour: Number(e.hour.value), nightConsent: e.nightConsent.checked };
  }
  function basisBox(list) {
    var box = el("div", "basis"), ul = el("ul");
    box.appendChild(el("h3", null, "근거 조항"));
    list.forEach(function (b) {
      var li = el("li"), a = el("a", null, b.law + " " + b.article);
      a.href = T.safeUrl(b.url) || "#"; a.target = "_blank"; a.rel = "noopener";
      li.appendChild(a); li.appendChild(document.createTextNode(" — " + b.quote)); ul.appendChild(li);
    });
    box.appendChild(ul); return box;
  }
  function render() {
    var o = opts(), r = M.build(o);
    $("night-wrap").hidden = !M.isNight(o.hour);
    out.textContent = "";
    var bad = r.checks.some(function (c) { return c.ok === false; });
    out.className = "result mk" + (bad ? " is-no" : "");
    out.appendChild(el("h2", null, "문자 초안"));
    out.appendChild(el("pre", "msg", r.text));
    var over = r.kind === "over";
    out.appendChild(el("p", "big", r.bytes + "바이트 · " + (r.kind === "SMS" ? "SMS(단문)로 보낼 수 있어요" : r.kind === "LMS" ? "LMS(장문) — SMS 90바이트를 넘었어요" : "2,000바이트를 넘었어요 — 줄여 주세요")));
    var meter = el("div", "meter"), fill = el("div", "meter-fill" + (over ? " is-over" : ""));
    fill.style.width = Math.min(100, r.bytes / (r.kind === "SMS" ? r.sms : r.lms) * 100) + "%"; meter.appendChild(fill); out.appendChild(meter);
    out.appendChild(el("p", "muted", "SMS " + r.sms + "바이트 · LMS " + r.lms + "바이트 기준 / 카톡 채널용 글자 수 " + r.chars + "자"));
    out.appendChild(el("h3", null, r.ad ? "보내기 전 점검" : "안내"));
    var ul = el("ul", "checks");
    r.checks.forEach(function (c) {
      var li = el("li", c.ok === true ? "is-ok" : c.ok === false ? "is-bad" : "");
      li.appendChild(el("span", "mark", MARK[c.ok])); li.appendChild(document.createTextNode(" " + c.text)); ul.appendChild(li);
    });
    out.appendChild(ul);
    if (r.ad) out.appendChild(basisBox(r.basis));
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(render, 150); }

  chips(); hours();
  U.profileBar($("pbar"), function (p) {
    var e = form.elements;
    if (!e.name.value) e.name.value = p.name; if (!e.contact.value) e.contact.value = p.contact;
    if (!e.product.value) e.product.value = p.product; if (!e.offer.value) e.offer.value = (p.offer || "").split("\n")[0];
    render();
  });
  form.addEventListener("input", schedule); form.addEventListener("change", schedule);
  $("copy").addEventListener("click", function () {
    var b = this, r = M.build(opts());
    U.copyText(r.text).then(function () { U.flash(b, "복사했어요 — 발송 서비스에 붙여넣기"); }, function () { U.flash(b, "복사 못 함 — 길게 눌러 직접 복사"); });
  });
  render();
})();

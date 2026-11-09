/* 사장님 업무 달력 화면 — 데이터는 data/calendar.json, 규칙은 CalendarCore, 화면은 textContent로만. */
(function () {
  "use strict";
  var T = window.ToolboxCore, C = window.CalendarCore, U = window.UI, el = U.el, $ = U.$;
  var form = $("f-cal"), items = [];

  // 직원 수는 "3명"·전각도 읽고, 못 읽으면 0으로 넘기지 않고 알린다(2026-09-30 검수)
  function profile() {
    var e = form.elements, n = T.parseCount(e.employees.value);
    // 간이과세는 개인사업자만 가능(부가가치세법 제61조①) — 법인이 간이를 고르면 일반과세자로 보고 알린다
    var corpSimple = e.biz.value === "corporation" && e.vat.value === "simple";
    return { employees: isNaN(n) ? 0 : n, employeesBad: isNaN(n) && e.employees.value.trim() !== "", biz: e.biz.value, vat: corpSimple ? "general" : e.vat.value, corpSimple: corpSimple };
  }
  function basisList(list) {
    var ul = el("ul", "basis-inline");
    list.forEach(function (b) {
      var li = el("li"), a = el("a", null, b.law + " " + b.article);
      a.href = T.safeUrl(b.url) || "#"; a.target = "_blank"; a.rel = "noopener";
      li.appendChild(a); ul.appendChild(li);
    });
    return ul;
  }
  function card(it, dayText) {
    var box = el("article", "todo");
    var head = el("div", "todo-head");
    if (dayText) head.appendChild(el("span", "todo-day", dayText));
    head.appendChild(el("h3", null, it.title));
    box.appendChild(head);
    box.appendChild(el("p", "todo-when", it.whenText + " · " + it.who));
    box.appendChild(el("p", null, it.what));
    if (it.where) box.appendChild(el("p", "privacy", "어디서: " + it.where));
    if (it.note) box.appendChild(el("p", "privacy", it.note));
    if (it.uncertain.length) { var u = el("ul", "uncertain-inline"); it.uncertain.forEach(function (t) { u.appendChild(el("li", null, t)); }); box.appendChild(u); }
    box.appendChild(basisList(it.basis));
    return box;
  }

  function render() {
    var p = profile(), m = Number(form.elements.month.value);
    var month = $("month"), always = $("always"), year = $("year");
    month.textContent = ""; always.textContent = ""; year.textContent = "";
    month.hidden = always.hidden = year.hidden = false;
    var list = C.forMonth(items, p, m);
    month.appendChild(el("h2", null, m + "월에 할 일 " + list.length + "건"));
    if (p.employeesBad) month.appendChild(el("p", "warn", "직원 수를 숫자로 적어 주세요 (예: 3). 지금은 0명으로 보고 있어요."));
    if (p.biz === "corporation") month.appendChild(el("p", "privacy", "법인세 신고·중간예납은 아직 이 달력에 없어요(법인세법을 아직 모으지 못함) — 세무사와 확인하세요."));
    if (p.corpSimple) month.appendChild(el("p", "warn", "간이과세는 개인사업자만 될 수 있어요(부가가치세법 제61조) — 법인은 일반과세자로 보고 보여 드려요."));
    if (!list.length) month.appendChild(el("p", "privacy", "이 달에 날짜가 정해진 할 일이 없어요."));
    list.forEach(function (x) { month.appendChild(card(x.item, m + "월 " + x.day + "일")); });
    var al = C.always(items, p);
    always.appendChild(el("h2", null, "정기적으로 · 일이 생겼을 때 " + al.length + "건"));
    al.forEach(function (it) { always.appendChild(card(it, "")); });
    // 연간 한눈에
    year.appendChild(el("h2", null, "1년 한눈에"));
    var wrap = el("div", "table-wrap"), tb = el("table", "yearly"), thead = el("thead"), hr = el("tr"), body = el("tbody");
    hr.appendChild(el("th", null, "할 일"));
    for (var i = 1; i <= 12; i++) hr.appendChild(el("th", null, i + "월"));
    thead.appendChild(hr); tb.appendChild(thead);
    C.applicable(items, p).forEach(function (it) {
      var whens = C.whens(it);
      if (whens.every(function (w) { return w.type === "annual" || w.type === "event"; })) return;
      var tr = el("tr"); tr.appendChild(el("th", null, it.title));
      for (var mo = 1; mo <= 12; mo++) {
        var hit = C.forMonth([it], p, mo)[0];
        tr.appendChild(el("td", hit ? "hit" : "", hit ? String(hit.day) : ""));
      }
      body.appendChild(tr);
    });
    tb.appendChild(body); wrap.appendChild(tb); year.appendChild(wrap);
  }

  (function initMonths() {
    var sel = form.elements.month, now = new Date().getMonth() + 1;
    for (var i = 1; i <= 12; i++) { var op = el("option", null, i + "월"); op.value = i; if (i === now) op.selected = true; sel.appendChild(op); }
  })();
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  fetch("../data/calendar.json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (g) { items = g.items; $("checked").textContent = g.checkedAt; render(); })
    .catch(function () { $("month").hidden = false; $("month").textContent = "달력을 불러오지 못했어요. 새로고침해 주세요."; });
})();

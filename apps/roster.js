/* 주간 근무표 화면 — 계산은 RosterCore, 표는 textContent로만 그린다. 초안은 이 기기(localStorage)에만 저장. */
(function () {
  "use strict";
  var T = window.ToolboxCore, R = window.RosterCore, U = window.UI, el = U.el, $ = U.$;
  var tbody = $("rows"), out = $("r-roster"), KEY = "sajang-roster-draft", MAX = 30, last = [];

  function store(get) { try { return get(); } catch (e) { return null; } }

  function addRow(name, days) {
    if (tbody.children.length >= MAX) return;
    var tr = el("tr"), n = tbody.children.length + 1;
    var nameCell = el("td"), nameIn = el("input"); nameIn.value = name || ""; nameIn.placeholder = "직원 " + n; nameIn.maxLength = 20; nameIn.setAttribute("aria-label", "직원 이름 " + n); nameIn.className = "name";
    nameCell.appendChild(nameIn); tr.appendChild(nameCell);
    R.DAYS.forEach(function (d, i) {
      var td = el("td"), input = el("input"); input.value = (days && days[i]) || ""; input.placeholder = "휴무"; input.setAttribute("aria-label", n + "번 " + d + "요일 근무"); input.autocomplete = "off"; input.className = "shift";
      td.appendChild(input); tr.appendChild(td);
    });
    ["total", "over", "night", "holiday"].forEach(function (k) { tr.appendChild(el("td", "calc " + k, "")); });
    tbody.appendChild(tr);
  }

  function read() {
    return Array.prototype.map.call(tbody.children, function (tr) {
      var ins = tr.querySelectorAll("input");
      return { name: ins[0].value.trim(), days: Array.prototype.map.call(ins, function (x) { return x.value; }).slice(1) };
    }).filter(function (e) { return e.name || e.days.some(Boolean); });
  }

  function opts() { return { fivePlus: $("f-roster").elements.fivePlus.value === "1" }; }
  function render() {
    var emps = read(), o = opts();
    last = emps.map(function (e) { return R.weekly({ name: e.name || "(이름 없음)", days: e.days }, o); });
    Array.prototype.forEach.call(tbody.children, function (tr) {
      var ins = tr.querySelectorAll("input"), name = ins[0].value.trim(), days = Array.prototype.map.call(ins, function (x) { return x.value; }).slice(1);
      var w = (name || days.some(Boolean)) ? R.weekly({ name: name, days: days }, o) : null;
      tr.querySelector(".total").textContent = w ? w.totalH + "h" : "";
      tr.querySelector(".over").textContent = w ? (w.overtimeH ? w.overtimeH + "h" : "-") : "";
      tr.querySelector(".night").textContent = w ? (w.nightH ? w.nightH + "h" : "-") : "";
      tr.querySelector(".holiday").textContent = w ? (w.weeklyHoliday ? "대상" : "아님") : "";
      tr.classList.toggle("is-warn", !!(w && (w.warnings.length || w.errors.length)));
      Array.prototype.forEach.call(ins, function (x, i) { if (i && w) x.classList.toggle("is-bad", !!(w.days[i - 1] && w.days[i - 1].error)); });
    });
    out.textContent = "";
    var notes = [], infos = [];
    last.forEach(function (w) { w.errors.concat(w.warnings).forEach(function (t) { notes.push(w.name + " — " + t); }); (w.notes || []).forEach(function (t) { if (infos.indexOf(t) < 0) infos.push(t); }); });
    out.hidden = !emps.length;
    if (!emps.length) { store(function () { localStorage.removeItem(KEY); }); return; } // 칸을 다 지우면 저장도 지운다(2026-09-30 검수)
    out.className = "result" + (notes.length ? " is-no" : "");
    out.appendChild(el("p", "big", notes.length ? "확인할 것 " + notes.length + "건" : "모든 직원이 근로시간·휴게 기준 안이에요"));
    if (notes.length) { var ul = el("ul"); notes.forEach(function (t) { ul.appendChild(el("li", null, t)); }); out.appendChild(ul); }
    infos.forEach(function (t) { out.appendChild(el("p", "privacy", t)); });
    var box = el("div", "basis"), bl = el("ul");
    box.appendChild(el("h3", null, "근거 조항"));
    R.basis().forEach(function (b) {
      var li = el("li"), a = el("a", null, b.law + " " + b.article);
      a.href = T.safeUrl(b.url) || "#"; a.target = "_blank"; a.rel = "noopener";
      li.appendChild(a); li.appendChild(document.createTextNode(" — " + b.what)); bl.appendChild(li);
    });
    box.appendChild(bl); out.appendChild(box);
    store(function () { localStorage.setItem(KEY, JSON.stringify(read())); });
  }

  var saved = store(function () { return JSON.parse(localStorage.getItem(KEY) || "null"); });
  if (saved && saved.length) saved.forEach(function (e) { addRow(e.name, e.days); });
  while (tbody.children.length < 3) addRow();
  $("add").addEventListener("click", function () { addRow(); tbody.lastChild.querySelector("input").focus(); });
  $("clear").addEventListener("click", function () {
    if (!confirm("근무표를 모두 지울까요?")) return;
    tbody.textContent = ""; while (tbody.children.length < 3) addRow();
    store(function () { localStorage.removeItem(KEY); }); render();
  });
  $("copy").addEventListener("click", function () {
    var b = this; render();
    U.copyText(R.toCsv(last)).then(function () { U.flash(b, "복사했어요 — 엑셀에 붙여 넣으세요"); }, function () { U.flash(b, "복사 못 함"); });
  });
  $("print").addEventListener("click", function () { render(); window.print(); });
  $("f-roster").addEventListener("input", render);
  $("f-roster").addEventListener("change", render);
  $("f-roster").addEventListener("submit", function (e) { e.preventDefault(); render(); });
  render();
})();

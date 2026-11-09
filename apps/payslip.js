/* 급여·임금명세서 화면 — 계산은 PayslipCore, 여기서는 읽고 그린다(textContent만). 인쇄하면 결과 영역이 임금명세서가 된다. */
(function () {
  "use strict";
  var T = window.ToolboxCore, P = window.PayslipCore, U = window.UI, el = U.el, $ = U.$;
  var form = $("f-pay"), out = $("r-pay"), rates = null;

  // 빈칸은 0, 적혀 있는데 못 읽으면 NaN → 계산 전에 어느 칸인지 알린다(2026-09-30 검수: 0으로 조용히 처리 금지)
  function num(v) { var s = String(v || "").trim(); return s ? T.parseAmount(s.replace(/시간/g, "")) : 0; }
  var LABELS = { amount: "임금", weeklyHours: "1주 소정근로시간", monthHours: "이달 소정근로 시간 수", overtimeH: "연장", nightH: "야간", holidayH: "휴일", incomeTax: "소득세", localTax: "지방소득세" };
  function badFields(f) {
    var hourly = f.payType.value === "hourly";
    return Object.keys(LABELS).filter(function (k) { return (k !== "monthHours" || hourly) && isNaN(num(f[k].value)); }).map(function (k) { return LABELS[k]; }); // 숨은 칸은 보지 않는다
  }
  function syncType() {
    var hourly = form.elements.payType.value === "hourly";
    $("amount-label").textContent = hourly ? "시급" : "월급";
    $("amount-hint").textContent = hourly ? "예: 10,320" : "세전, 기본급 기준 — 예: 2,500,000";
    $("monthHours-row").hidden = !hourly;
  }
  function table(caption, rows, foot) {
    var tb = el("table", "slip"), cap = el("caption", null, caption), body = el("tbody");
    tb.appendChild(cap);
    rows.forEach(function (r) {
      var tr = el("tr");
      tr.appendChild(el("th", null, r.name)); tr.appendChild(el("td", "how", r.how || "")); tr.appendChild(el("td", "amt", T.won(r.amount)));
      body.appendChild(tr);
    });
    if (foot) { var tf = el("tr", "sum"); tf.appendChild(el("th", null, foot[0])); tf.appendChild(el("td")); tf.appendChild(el("td", "amt", T.won(foot[1]))); body.appendChild(tf); }
    tb.appendChild(body);
    return tb;
  }
  function basisBox(list) {
    var box = el("div", "basis"), ul = el("ul");
    box.appendChild(el("h3", null, "근거 조항"));
    list.forEach(function (b) {
      var li = el("li"), a = el("a", null, b.law + " " + b.article);
      a.href = T.safeUrl(b.url) || "#"; a.target = "_blank"; a.rel = "noopener";
      li.appendChild(a); li.appendChild(document.createTextNode(" — " + b.what)); ul.appendChild(li);
    });
    box.appendChild(ul); return box;
  }

  form.addEventListener("change", function (e) { if (e.target.name === "payType") syncType(); });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = form.elements, bad = badFields(f);
    out.textContent = ""; out.hidden = false; $("print").hidden = true;
    if (bad.length) { out.className = "result is-err"; out.appendChild(el("p", null, "숫자로 읽지 못한 칸: " + bad.join(", ") + " — 숫자만 적어 주세요 (예: 10)")); return; }
    if (!rates) { out.className = "result is-err"; out.appendChild(el("p", null, "요율 자료(4대보험·최저임금)를 아직 불러오지 못했어요. 잠시 뒤 다시 누르거나 새로고침해 주세요 — 요율 없이 명세서를 만들지 않아요.")); return; }
    var r = P.payslip({ payType: f.payType.value, amount: num(f.amount.value), weeklyHours: num(f.weeklyHours.value), monthHours: num(f.monthHours.value),
      overtimeH: num(f.overtimeH.value), nightH: num(f.nightH.value), holidayH: num(f.holidayH.value), fivePlus: f.fivePlus.value === "1",
      date: f.payDate.value || T.todayLocal(), incomeTax: num(f.incomeTax.value), localTax: num(f.localTax.value) }, rates);
    if (r.error) { out.className = "result is-err"; out.appendChild(el("p", null, r.error)); return; }
    var s = P.statement({ name: f.pname.value.trim(), birth: f.pbirth.value, payDate: f.payDate.value }, r);
    out.className = "result statement";
    out.appendChild(el("h2", null, "임금명세서"));
    var dl = el("dl", "facts");
    s.head.forEach(function (p) { dl.appendChild(el("dt", null, p[0])); dl.appendChild(el("dd", null, p[1] || "-")); });
    out.appendChild(dl);
    out.appendChild(el("p", "big", "실수령 " + T.won(s.net)));
    out.appendChild(table("지급 항목 (계산방법)", s.items, ["임금 총액", r.gross]));
    out.appendChild(table("공제 항목", s.deductions, ["공제 총액", s.totalDeduction]));
    var notes = el("ul", "notes");
    if (r.belowMin) notes.appendChild(el("li", "warn", "통상시급 " + T.won(r.wage) + "이 " + r.minWage.from.slice(0, 4) + "년 최저임금 " + T.won(r.minWage.hourly) + "보다 낮아요."));
    r.notes.forEach(function (t) { notes.appendChild(el("li", null, t)); });
    out.appendChild(notes);
    out.appendChild(basisBox(r.basis));
    $("print").hidden = false;
    out.scrollIntoView({ block: "nearest" });
  });
  $("print").addEventListener("click", function () { window.print(); });
  syncType();
  fetch("../data/labor-rates.json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) { rates = d; $("law-date").textContent = d.lawCheckedAt; })
    .catch(function () { $("law-date").textContent = "불러오지 못함 — 4대보험·최저임금이 빠져요"; });
})();

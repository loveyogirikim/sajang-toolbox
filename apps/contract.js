/* 근로계약서 화면 — 입력칸은 ContractCore.FIELDS로 만들고, 계약서 본문은 textContent로만 그린다. 저장하지 않는다. */
(function () {
  "use strict";
  var T = window.ToolboxCore, K = window.ContractCore, U = window.UI, el = U.el, $ = U.$;
  var form = $("f-contract"), doc = $("doc"), last = null, rates = null;
  var NUMS = { amount: "임금 금액", weeklyHours: "1주 소정근로시간" };

  K.FIELDS.forEach(function (f) {
    var label = el("label", "field"), title = el("span", null, f.label + (f.required ? " *" : ""));
    label.appendChild(title);
    if (f.hint) label.appendChild(el("small", null, f.hint));
    var input;
    if (f.type === "select") {
      input = el("select");
      f.options.forEach(function (o) { var op = el("option", null, o[1]); op.value = o[0]; input.appendChild(op); });
    } else {
      input = el("input");
      input.type = f.type === "date" ? "date" : "text";
      if (f.type === "number" || f.type === "amount") input.inputMode = "decimal";
      input.autocomplete = "off"; input.maxLength = 80;
    }
    input.name = f.key; if (f.required) input.required = true;
    label.appendChild(input); $("fields").appendChild(label);
  });

  function values() {
    var v = { date: T.todayLocal() }, bad = [];
    K.FIELDS.forEach(function (f) {
      var raw = form.elements[f.key].value;
      v[f.key] = f.type === "amount" ? T.parseAmount(raw) : f.type === "number" ? T.parseAmount(raw.replace(/시간/g, "")) : raw;
      if ((f.type === "amount" || f.type === "number") && raw.trim() && isNaN(v[f.key])) bad.push(NUMS[f.key] || f.label); // 적혀 있는데 못 읽음
    });
    v._bad = bad;
    return v;
  }

  function render() {
    // 최저임금 대조 — 근로 시작일(없으면 작성일) 기준, 요율 자료를 불러왔을 때만(못 불러오면 아래에 그 사실을 알린다)
    var v = values(), mw = null, at = v.start || v.date;
    if (rates && rates.minimumWage) rates.minimumWage.forEach(function (m) { if (m.from <= at && (!mw || m.from > mw.from)) mw = m; });
    var r = K.build(v, { minWage: mw });
    doc.textContent = "";
    if (v._bad.length) {
      last = null;
      doc.appendChild(el("p", "warn", "숫자로 읽지 못한 칸: " + v._bad.join(", ") + " — 숫자만 적어 주세요 (예: 2,500,000 / 40)"));
      return;
    }
    if (r.missing.length) {
      last = null;
      doc.appendChild(el("p", "privacy", "아직 비어 있는 필수 항목: " + r.missing.map(function (m) { return m.label; }).join(", ")));
      return;
    }
    last = r;
    doc.appendChild(el("h2", null, "근로계약서" + (r.kind === "무기" ? "" : " (" + r.kind + ")")));
    doc.appendChild(el("p", "intro", r.parties.employer + " (대표 " + r.parties.employerRep + ")와(과) " + r.parties.employee + "은(는) 다음과 같이 근로계약을 맺는다."));
    var ol = el("ol", "clauses");
    r.clauses.forEach(function (c) {
      var li = el("li");
      li.appendChild(el("b", null, "제" + c.no + "조 (" + c.title + ")"));
      c.body.split("\n").forEach(function (line) { li.appendChild(el("p", null, line)); });
      ol.appendChild(li);
    });
    doc.appendChild(ol);
    var sign = el("div", "sign");
    r.sign.forEach(function (s) { sign.appendChild(el("p", null, s.role + ": " + s.name + "   (서명)")); });
    sign.appendChild(el("p", "date", "작성일: " + r.date)); // 인쇄에도 남는다(2026-09-30 검수)
    doc.appendChild(sign);
    if (!rates) r.notes.push("최저임금 자료를 아직 불러오지 못해 임금이 최저임금 이상인지 대조하지 못했어요 — 새로고침 후 다시 확인하세요.");
    if (r.notes.length) { var un = el("ul", "notes"); r.notes.forEach(function (t) { un.appendChild(el("li", "warn", t)); }); doc.appendChild(un); }
    var box = el("div", "basis"), bl = el("ul");
    box.appendChild(el("h3", null, "근거 조항"));
    r.basis.forEach(function (b) {
      var li = el("li"), a = el("a", null, b.law + " " + b.article);
      a.href = T.safeUrl(b.url) || "#"; a.target = "_blank"; a.rel = "noopener";
      li.appendChild(a); li.appendChild(document.createTextNode(" — " + b.what)); bl.appendChild(li);
    });
    box.appendChild(bl); doc.appendChild(box);
  }

  form.addEventListener("input", render);
  form.addEventListener("change", render);
  $("print").addEventListener("click", function () { render(); if (last) window.print(); else alert("필수 항목을 먼저 채워 주세요."); });
  $("copy").addEventListener("click", function () {
    var b = this; render();
    if (!last) { U.flash(b, "필수 항목을 채워 주세요"); return; }
    U.copyText(K.toText(last)).then(function () { U.flash(b, "복사했어요"); }, function () { U.flash(b, "복사 못 함"); });
  });
  form.elements.holiday.value = "매주 일요일 (주휴일)";
  form.elements.leave.value = "근로기준법 제60조에 따라 부여";
  form.elements.payMethod.value = "근로자 명의 계좌로 이체";
  render();
  fetch("../data/labor-rates.json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) { rates = d; render(); })
    .catch(function () { rates = null; render(); });
})();

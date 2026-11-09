/* 노무 계산기 화면 — 계산은 PayCore, 여기서는 입력을 읽고 결과를 그린다(textContent만). */
(function () {
  "use strict";
  var T = window.ToolboxCore, P = window.PayCore, U = window.UI, el = U.el, $ = U.$;
  var TABS = ["leave", "severance", "weekly"], rates = null;

  function num(v) { return T.parseAmount(String(v).replace(/시간/g, "")); }
  function yes(form, name) { return form.elements[name].value === "1"; }

  function showTab(id) {
    if (TABS.indexOf(id) === -1) id = "leave";
    TABS.forEach(function (t) {
      $("tab-" + t).setAttribute("aria-pressed", String(t === id));
      $("p-" + t).hidden = t !== id;
    });
  }

  function basisBox(list) {
    var box = el("div", "basis"), ul = el("ul");
    box.appendChild(el("h3", null, "근거 조항"));
    list.forEach(function (b) {
      var li = el("li"), a = el("a", null, b.law + " " + b.article);
      a.href = T.safeUrl(b.url) || "#"; a.target = "_blank"; a.rel = "noopener";
      li.appendChild(a); li.appendChild(document.createTextNode(" — " + b.what)); ul.appendChild(li);
    });
    box.appendChild(ul);
    return box;
  }

  // r: PayCore 결과, big: 큰 글씨, lines: 설명 줄, notes: [{text, cls}] (빈 text는 건너뜀)
  function paint(id, r, big, lines, notes) {
    var box = $("r-" + id);
    box.textContent = ""; box.hidden = false;
    box.className = "result" + (r.error ? " is-err" : r.applicable === false ? " is-no" : "");
    if (r.error) { box.appendChild(el("p", null, r.error)); return; }
    if (r.applicable === false) {
      box.appendChild(el("p", "big", "대상이 아니에요"));
      box.appendChild(el("p", null, r.reason));
    } else {
      box.appendChild(el("p", "big", big));
      var ul = el("ul");
      lines.filter(Boolean).forEach(function (t) { ul.appendChild(el("li", null, t)); });
      box.appendChild(ul);
    }
    (notes || []).forEach(function (n) { if (n.text) box.appendChild(el("p", n.cls || null, n.text)); });
    if (r.basis && r.basis.length) box.appendChild(basisBox(r.basis));
    box.scrollIntoView({ block: "nearest" });
  }

  var handlers = {
    leave: function (f) {
      var e = f.elements;
      var r = P.annualLeave({ hireDate: e.hireDate.value, baseDate: e.baseDate.value, fivePlus: yes(f, "fivePlus"),
        weeklyHours: num(e.weeklyHours.value), attendance80: yes(f, "attendance80") });
      var big = r.days == null ? "개근한 달 수만큼"
        : r.partTime ? r.hours + "시간 (" + (r.firstYear ? "지금까지 " : "") + r.days + "일분)"
        : (r.firstYear ? "지금까지 " : "") + r.days + "일";
      paint("leave", r, big, [
        r.detail,
        r.partTime && r.days != null ? "주 40시간 미만이라 시간 단위로 계산했어요: " + r.days + "일 × " + num(f.elements.weeklyHours.value) + "시간 ÷ 40시간 × 8시간 (1시간 미만은 1시간으로 올림, 통상 근로자 주 40시간 가정)" : "",
        r.next ? (r.firstYear ? "입사 1년이 되는 날: " : "다음 연차가 새로 생기는 날: ") + r.next : ""
      ], [{ text: r.firstYear ? "입사 1년 미만 연차는 매달 개근했다고 보고 계산했어요." : "" }]);
    },
    severance: function (f) {
      var e = f.elements;
      var r = P.severance({ hireDate: e.hireDate.value, retireDate: e.retireDate.value,
        wages3m: num(e.wages3m.value), weeklyHours: num(e.weeklyHours.value) });
      paint("severance", r, r.amount != null ? T.won(r.amount) : "", [
        r.serviceDays != null ? "재직 " + r.serviceDays.toLocaleString("ko-KR") + "일" : "",
        r.periodFrom ? "평균임금 기간: " + r.periodFrom + "부터 퇴직일 전날까지 " + r.periodDays + "일" : "",
        r.avgDaily != null ? "1일 평균임금: " + T.won(r.avgDaily) : ""
      ], r.applicable ? [
        { text: "퇴직한 날부터 14일 안에 지급해야 해요(특별한 사정이 있으면 합의로 미룰 수 있어요)." },
        { text: "계산 가정: 1년이 안 되는 끝수는 재직일수 ÷ 365로 비례했고, 퇴직일은 마지막 근무일 다음 날로 봤어요. 중간정산한 적이 있으면 그 뒤 기간만 계산해야 해요." },
        { text: "상여금·연차수당을 받았다면 평균임금에 더해져 금액이 늘 수 있어요(고용노동부 해석 기준 — 이 계산에는 빠져 있어요)." },
        { cls: "warn", text: "이 계산기는 통상임금과 비교하지 않아요. 1일 평균임금이 통상임금보다 적으면 통상임금으로 다시 계산해야 해요." }
      ] : []);
    },
    weekly: function (f) {
      var e = f.elements;
      var r = P.weeklyHoliday({ hourly: num(e.hourly.value), weeklyHours: num(e.weeklyHours.value),
        date: e.date.value || T.todayLocal() }, rates);
      paint("weekly", r, r.amount != null ? T.won(r.amount) : "", [
        r.hours != null ? "1주 주휴시간: " + Math.round(r.hours * 10) / 10 + "시간" : "",
        r.applicable ? "1주 소정근로일을 모두 나온(개근) 주에 받아요." : "",
        r.applicable ? "같은 일을 하는 통상 근로자가 주 5일 일한다고 보고 계산했어요." : ""
      ], [
        { text: r.minWage ? r.minWage.from.slice(0, 4) + "년 적용 최저임금: 시간당 " + T.won(r.minWage.hourly) + " (" + r.minWage.source + ")" : "" },
        { cls: "warn", text: r.belowMin ? "입력한 시급이 이 날짜의 최저임금보다 낮아요." : "" }
      ]);
    }
  };

  TABS.forEach(function (t) {
    $("tab-" + t).addEventListener("click", function () { history.replaceState(null, "", "#" + t); showTab(t); });
    $("f-" + t).addEventListener("submit", function (e) { e.preventDefault(); handlers[t](e.target); });
  });
  window.addEventListener("hashchange", function () { showTab(location.hash.slice(1)); });
  $("f-leave").elements.baseDate.value = T.todayLocal();
  $("f-weekly").elements.date.value = T.todayLocal();
  showTab(location.hash.slice(1));
  fetch("../data/labor-rates.json")
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) { rates = d; $("law-date").textContent = d.lawCheckedAt; })
    .catch(function () { $("law-date").textContent = "불러오지 못함 — 최저임금 비교가 빠져요"; });
})();

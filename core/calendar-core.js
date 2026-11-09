/* 사장님 업무 달력 — 항목의 기한 규칙(when)을 달·사업 조건에 맞춰 뽑는다 (브라우저·node 테스트 겸용). 데이터는 data/calendar.json. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CalendarCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function whens(it) { return Array.isArray(it.when) ? it.when : [it.when]; }

  // p: {employees: 직원 수, biz: "individual"|"corporation", vat: "general"(일반과세자)|"simple"(간이과세자)|"none"}
  // applies.biz: all | individual | vat(일반·간이 모두) | vat-general | vat-simple | vat-none(면세·해당 없음) — 간이과세자는 예정신고·확정신고 날짜가 달라 나눈다(2026-09-30 검수)
  // applies.individual: true면 개인사업자에게만(부가세 유형과 별개 — 예: 면세 개인사업자의 사업장 현황신고)
  function applicable(items, p) {
    var vat = p.vat === true ? "general" : p.vat;
    return items.filter(function (it) {
      var a = it.applies || {};
      if ((a.employeesMin || 0) > (p.employees || 0)) return false;
      if ((a.biz === "individual" || a.individual) && p.biz !== "individual") return false;
      if (a.biz === "vat" && vat !== "general" && vat !== "simple") return false;
      if (a.biz === "vat-general" && vat !== "general") return false;
      if (a.biz === "vat-simple" && vat !== "simple") return false;
      if (a.biz === "vat-none" && vat !== "none") return false;
      return true;
    });
  }

  // 그 달에 날짜가 있는 할 일 — 마감일이 이른 순
  function forMonth(items, p, month) {
    var out = [];
    applicable(items, p).forEach(function (it) {
      whens(it).forEach(function (w) {
        if (w.type === "monthly") out.push({ id: it.id, title: it.title, day: w.day, end: w.day, item: it, when: w });
        else if (w.type === "yearly" && w.month === month) out.push({ id: it.id, title: it.title, day: w.day, end: w.day, item: it, when: w });
        else if (w.type === "range" && w.month === month) out.push({ id: it.id, title: it.title, day: w.from + "~" + w.to, end: w.to, item: it, when: w });
      });
    });
    return out.sort(function (a, b) { return a.end - b.end; });
  }

  // 날짜 없이 "매년 1회"거나 사건이 생겼을 때 하는 일
  function always(items, p) {
    return applicable(items, p).filter(function (it) {
      return whens(it).every(function (w) { return w.type === "annual" || w.type === "event"; });
    });
  }

  return { whens: whens, applicable: applicable, forMonth: forMonth, always: always };
});

/* 주간 근무표 — 근로시간·연장·야간·휴게·주휴 계산 (브라우저·node 테스트 겸용). DOM을 만지지 않는다.
 * 근거: 근로기준법 제50조(1일 8시간·1주 40시간), 제53조(연장 1주 12시간 한도), 제54조(휴게), 제55조(주휴), 제18조③(15시간 미만), 제56조③(야간 22~06시) */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.RosterCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var DAYS = ["월", "화", "수", "목", "금", "토", "일"], LAW = "근로기준법", U = "https://www.law.go.kr/법령/근로기준법/";
  var B = [
    { law: LAW, article: "제50조제1항", what: "1주 근로시간은 휴게시간을 빼고 40시간을 넘을 수 없음", url: U + "제50조" },
    { law: LAW, article: "제50조제2항", what: "1일 근로시간은 휴게시간을 빼고 8시간을 넘을 수 없음", url: U + "제50조" },
    { law: LAW, article: "제53조제1항", what: "당사자 합의로 1주 12시간까지만 연장 가능(= 주 52시간 한도)", url: U + "제53조" },
    { law: LAW, article: "제54조제1항", what: "근로시간 4시간이면 30분 이상, 8시간이면 1시간 이상 휴게를 근로시간 도중에", url: U + "제54조" },
    { law: LAW, article: "제55조제1항", what: "1주에 평균 1회 이상 유급휴일(주휴)", url: U + "제55조" },
    { law: LAW, article: "제18조제3항", what: "4주 평균 1주 15시간 미만이면 주휴·연차 적용 제외", url: U + "제18조" },
    { law: LAW, article: "제56조제3항", what: "야간근로 = 오후 10시부터 다음 날 오전 6시 사이 (통상임금 50% 가산)", url: U + "제56조" },
    { law: "근로기준법 시행령", article: "별표 1", what: "상시 4명 이하 사업장에 적용되는 규정 목록 — 제54조(휴게)·제55조①(주휴)은 있고 제50·53·56조는 없음", url: "https://www.law.go.kr/법령/근로기준법시행령" }
  ];

  // "9:00-18:00/60" → {start, end(분), breakMin}. 빈칸·휴무 → null. 못 읽으면 {error:true}
  function parseShift(text) {
    var s = String(text || "").trim().replace(/\s+/g, "");
    if (!s || /^(휴무|휴|-|off)$/i.test(s)) return null;
    var m = /^(\d{1,2})(?::(\d{2}))?[-~](\d{1,2})(?::(\d{2}))?(?:\/(\d{1,3}))?$/.exec(s);
    if (!m) return { error: true };
    var start = +m[1] * 60 + (+m[2] || 0), end = +m[3] * 60 + (+m[4] || 0);
    if (+m[1] > 24 || +m[3] > 24 || (+m[2] || 0) > 59 || (+m[4] || 0) > 59) return { error: true };
    return { start: start, end: end, breakMin: +(m[5] || 0) };
  }

  function overlap(a1, a2, b1, b2) { return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1)); }

  // 근로(휴게 제외)·야간(22시~06시 사이에 있던 시간) 분. 끝이 시작보다 이르면 다음 날로 본다.
  // 휴게는 야간근로가 아니므로(제50조·제56조③) 야간은 근로시간을 넘지 않는다 — 휴게 위치를 모르니 보수적으로 자른다(2026-09-30 검수)
  function shiftMinutes(sh) {
    var start = sh.start, end = sh.end <= sh.start ? sh.end + 1440 : sh.end;
    var night = overlap(start, end, 0, 360) + overlap(start, end, 1320, 1800) + overlap(start, end, 2760, 2880);
    var work = Math.max(0, end - start - sh.breakMin);
    return { work: work, night: Math.min(night, work) };
  }

  function breakNeeded(workMin) { return workMin >= 480 ? 60 : workMin >= 240 ? 30 : 0; }
  function h(min) { return Math.round(min / 60 * 100) / 100; }

  // emp: {name, days:[7개 근무 문자열]}, opts: {fivePlus: 상시 5명 이상(기본 true)} → 주간 집계
  // 5명 미만 사업장에는 제50조·제53조·제56조가 적용되지 않는다(시행령 별표 1) — 연장·52시간 대신 안내만(2026-09-30 검수)
  function weekly(emp, opts) {
    var five = !opts || opts.fivePlus !== false;
    var days = [], total = 0, night = 0, dailyOver = 0, warnings = [], errors = [], notes = [];
    for (var i = 0; i < 7; i++) {
      var sh = parseShift(emp.days[i]);
      if (sh && sh.error) { errors.push(DAYS[i] + "요일: '" + emp.days[i] + "'을(를) 읽을 수 없어요 (예: 9:00-18:00/60)"); days.push({ text: emp.days[i], error: true }); continue; }
      if (!sh) { days.push({ text: "", work: 0, night: 0 }); continue; }
      var m = shiftMinutes(sh), need = breakNeeded(m.work), ok = sh.breakMin >= need;
      days.push({ text: emp.days[i], work: m.work, night: m.night, breakMin: sh.breakMin, breakNeeded: need, breakOk: ok });
      total += m.work; night += m.night; dailyOver += Math.max(0, m.work - 480);
      if (!ok) warnings.push(DAYS[i] + "요일 휴게 부족: 근로 " + h(m.work) + "시간이면 휴게 " + need + "분 이상 필요한데 " + sh.breakMin + "분 (제54조)");
    }
    var overtime = five ? Math.max(dailyOver, Math.max(0, total - 2400)) : 0;
    if (five && total > 3120) warnings.push("주 " + h(total) + "시간 — 연장근로 한도(1주 12시간, 총 52시간)를 넘어요 (제53조제1항)");
    if (!five && total > 2400) notes.push("상시 5명 미만 사업장은 1주 40시간·연장 한도(제50조·제53조)와 가산수당(제56조)이 적용되지 않아요(시행령 별표 1) — 연장 칸을 비워 두었어요. 휴게·주휴는 그대로 적용돼요.");
    return { name: emp.name, days: days, totalH: h(total), overtimeH: h(overtime), nightH: h(night),
      weeklyHoliday: total >= 900, warnings: warnings, errors: errors, notes: notes };
  }

  function csvCell(v) { var s = String(v == null ? "" : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function toCsv(list) {
    var rows = [["이름"].concat(DAYS, ["주 근로시간", "연장", "야간", "주휴"]).join(",")];
    list.forEach(function (w) {
      rows.push([csvCell(w.name)].concat(w.days.map(function (d) { return d.error ? "?" : d.work ? h(d.work) : "휴무"; }),
        [w.totalH, w.overtimeH, w.nightH, w.weeklyHoliday ? "대상" : "아님"]).join(","));
    });
    return rows.join("\n");
  }

  function basis() { return B; }
  return { DAYS: DAYS, parseShift: parseShift, shiftMinutes: shiftMinutes, weekly: weekly, toCsv: toCsv, basis: basis };
});

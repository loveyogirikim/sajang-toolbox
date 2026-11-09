/* 급여·임금명세서 — 통상시급·가산수당·주휴·4대보험 공제 계산 (브라우저·node 테스트 겸용). DOM을 만지지 않는다.
 * 근거: 근로기준법 제43조(지급·공제), 제48조②(명세서), 제55조(주휴), 제56조(가산), 시행령 제6조(통상임금 시간급), 제27조의2(명세서 기재사항)
 * 요율은 data/labor-rates.json(적용 시작일·출처) — 국민연금은 부칙의 연도별 단계 요율을 쓴다. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./toolbox-core.js"));
  else root.PayslipCore = factory(root.ToolboxCore);
})(typeof self !== "undefined" ? self : this, function (T) {
  "use strict";
  var WEEKS_PER_MONTH = 365 / 12 / 7; // 시행령 제6조②4호: 1년 평균 주의 수 ÷ 12
  function floorSafe(v) { return Math.floor(v + 1e-6); }
  function b(law, article, what) {
    var m = /^제\d+조(의\d+)?/.exec(article);
    return { law: law, article: article, what: what, url: "https://www.law.go.kr/법령/" + law.replace(/\s+/g, "") + (m ? "/" + m[0] : "") };
  }
  var B = [
    b("근로기준법", "제43조제1항", "임금은 통화로 직접·전액 지급, 공제는 법령·단체협약에 규정이 있을 때만"),
    b("근로기준법", "제43조제2항", "임금은 매월 1회 이상 정해진 날짜에 지급"),
    b("근로기준법", "제48조제2항", "임금 지급 때마다 구성항목·계산방법·공제 내역을 적은 임금명세서를 서면(전자문서 포함)으로 교부"),
    b("근로기준법 시행령", "제27조의2", "명세서 기재사항: 성명·생년월일 등, 임금지급일, 임금 총액, 항목별 금액, 계산방법(연장·야간·휴일 시간 수 포함), 공제 내역"),
    b("근로기준법 시행령", "제6조제2항", "월급의 시간급 = 월급 ÷ 월 통상임금 산정 기준시간(1주 기준시간 × 1년 평균 주 수 ÷ 12)"),
    b("근로기준법", "제55조제1항", "1주에 평균 1회 이상 유급휴일(주휴)"),
    b("근로기준법", "제56조제1항", "연장근로는 통상임금의 50% 이상 가산"),
    b("근로기준법", "제56조제2항", "휴일근로 8시간 이내 50%, 8시간 초과 100% 가산"),
    b("근로기준법", "제56조제3항", "야간근로(22시~06시)는 통상임금의 50% 이상 가산"),
    b("근로기준법 시행령", "별표 1", "상시 4명 이하 사업장 적용 규정 목록 — 제56조(가산수당)가 없음"),
    b("국민연금법", "제88조제3항", "사업장가입자 기여금(근로자)·부담금(사용자) — 연도별 단계 요율은 부칙(2026년 1만분의 475)"),
    b("국민건강보험법", "제76조제1항", "직장가입자 보수월액보험료는 근로자와 사용자가 각각 100분의 50씩 부담"),
    b("국민건강보험법 시행령", "제44조제1항", "직장가입자 보험료율 1만분의 719"),
    b("국민건강보험법 시행령", "제9조", "1개월 소정근로시간 60시간 미만 단시간근로자는 직장가입자에서 제외 — 건강·장기요양 공제 없음"),
    b("노인장기요양보험법 시행령", "제4조", "장기요양보험료율 100만분의 9,448"),
    b("고용보험 및 산업재해보상보험의 보험료징수 등에 관한 법률", "제13조제2항", "실업급여 보험료는 근로자와 사업주가 각각 2분의 1씩 부담"),
    b("고용보험 및 산업재해보상보험의 보험료징수 등에 관한 법률 시행령", "제12조제1항", "실업급여 보험료율 1천분의 18")
  ];
  var HOURS_60 = 60; // 국민건강보험법 시행령 제9조1호 — 1개월 소정근로시간 60시간 미만은 직장가입자 제외

  // 1주 소정근로시간 → 월 통상임금 산정 기준시간 (주휴 포함). 주 40시간이면 209시간.
  function weeklyHolidayHours(weeklyHours) { return weeklyHours >= 15 ? Math.min(weeklyHours, 40) / 40 * 8 : 0; }
  function monthlyHours(weeklyHours) { return Math.round((weeklyHours + weeklyHolidayHours(weeklyHours)) * WEEKS_PER_MONTH); }
  function hourlyWage(o) { return o.payType === "monthly" ? o.amount / monthlyHours(o.weeklyHours) : o.amount; }

  function rateAt(list, date) {
    var hit = null;
    (list || []).forEach(function (r) { if (r.from <= date && (!hit || r.from > hit.from)) hit = r; });
    return hit;
  }

  // o: {payType:"monthly"|"hourly", amount, weeklyHours, monthHours(소정근로 시간 수, 시급제), overtimeH, nightH, holidayH, fivePlus, date, incomeTax, localTax}
  function payslip(o, rates) {
    if (!(o.amount > 0) || !(o.weeklyHours > 0)) return { error: "임금과 1주 소정근로시간을 숫자로 넣어 주세요." };
    if (o.payType === "hourly" && !(o.monthHours > 0)) return { error: "시급제는 이달 소정근로 시간 수를 넣어야 기본급을 계산할 수 있어요." };
    var wage = hourlyWage(o), items = [], notes = [], won = T.won;
    var monthlySoJeong = o.weeklyHours * WEEKS_PER_MONTH; // 1개월 소정근로시간 = 계약한 1주 소정근로시간 기준(이달 실제 시간이 아님 — 달마다 뒤집히지 않게, 2026-09-30 재검수)
    var under60 = monthlySoJeong < HOURS_60;
    var ot = o.overtimeH || 0, nt = o.nightH || 0, hd = o.holidayH || 0, five = !!o.fivePlus;
    var otRate = five ? 1.5 : 1, ntRate = five ? 0.5 : 0, hd8 = Math.min(hd, 8), hdOver = Math.max(0, hd - 8);
    // 계산방법 표시는 검산이 맞도록 통상시급을 소수 둘째 자리까지, 주 수는 셋째 자리까지 적는다(2026-09-30 검수)
    var wageText = (Math.round(wage * 100) / 100).toLocaleString("ko-KR", { maximumFractionDigits: 2 }) + "원", weeksText = (Math.round(WEEKS_PER_MONTH * 1e6) / 1e6) + "주";
    if (o.payType === "monthly") items.push({ name: "기본급", amount: floorSafe(o.amount), how: "월급 (주 " + o.weeklyHours + "시간 기준 월 " + monthlyHours(o.weeklyHours) + "시간, 통상시급 " + wageText + ")" });
    else {
      items.push({ name: "기본급", amount: floorSafe(o.monthHours * wage), how: o.monthHours + "시간 × " + wageText });
      var wh = weeklyHolidayHours(o.weeklyHours) * WEEKS_PER_MONTH;
      if (wh > 0) items.push({ name: "주휴수당", amount: floorSafe(wh * wage), how: "주휴 " + weeklyHolidayHours(o.weeklyHours) + "시간 × " + weeksText + " × " + wageText + " (소정근로일 개근 기준)" });
      else notes.push("1주 소정근로시간이 15시간 미만이라 주휴수당이 없어요(제18조제3항).");
    }
    if (ot > 0) items.push({ name: "연장근로수당", amount: floorSafe(ot * wage * otRate), how: ot + "시간 × " + wageText + " × " + Math.round(otRate * 100) + "%" });
    if (nt > 0) items.push({ name: "야간근로수당", amount: floorSafe(nt * wage * ntRate), how: nt + "시간 × " + wageText + " × " + Math.round(ntRate * 100) + "% (가산분)" });
    if (hd > 0) items.push({ name: "휴일근로수당", amount: floorSafe(hd8 * wage * (five ? 1.5 : 1) + hdOver * wage * (five ? 2 : 1)),
      how: five ? hd8 + "시간 × " + wageText + " × 150%" + (hdOver ? " + " + hdOver + "시간 × 200%" : "") : hd + "시간 × " + wageText });
    if (!five && (ot > 0 || nt > 0 || hd > 0)) notes.push("상시 5명 미만 사업장은 연장·야간·휴일 가산(제56조)이 적용되지 않아 시간분만 계산했어요.");
    var gross = items.reduce(function (s, i) { return s + i.amount; }, 0);
    var ins = rateAt(rates && rates.insurance, o.date), deductions = [];
    if (ins) {
      deductions.push({ name: "국민연금", amount: floorSafe(gross * ins.pension), how: "임금 총액 × " + (ins.pension * 100).toFixed(2) + "%" });
      if (!under60) {
        deductions.push({ name: "건강보험", amount: floorSafe(gross * ins.health), how: "임금 총액 × " + (ins.health * 100).toFixed(3) + "%" });
        deductions.push({ name: "장기요양보험", amount: floorSafe(gross * ins.care), how: "임금 총액 × " + (ins.care * 100).toFixed(4) + "%" });
      }
      deductions.push({ name: "고용보험", amount: floorSafe(gross * ins.employment), how: "임금 총액 × " + (ins.employment * 100).toFixed(1) + "%" });
      if (under60) notes.push("1개월 소정근로시간이 60시간 미만이라 건강보험 직장가입자가 아니에요(국민건강보험법 시행령 제9조) — 건강·장기요양보험을 공제하지 않았어요. 국민연금·고용보험도 가입 대상인지(공단 안내) 확인한 뒤 공제하세요.");
      notes.push("4대보험은 " + ins.from.slice(0, 4) + "년 기준일의 요율로 계산한 근로자 부담분이에요(" + ins.source + "). 국민연금·건강보험의 기준소득 상·하한, 비과세 항목, 고지서의 10원 미만 끝수 처리는 반영하지 않아 실제 고지액과 몇 원 차이 날 수 있어요. 산재보험은 사업주가 전액 부담해 공제하지 않아요.");
    } else notes.push("적용 요율을 찾지 못해 4대보험 공제를 계산하지 않았어요.");
    if (o.incomeTax > 0) deductions.push({ name: "소득세", amount: floorSafe(o.incomeTax), how: "근로소득 간이세액표" });
    if (o.localTax > 0) deductions.push({ name: "지방소득세", amount: floorSafe(o.localTax), how: "직접 입력 (보통 소득세의 10% — 지방세법, 확인 못 함)" });
    notes.push("소득세는 국세청 근로소득 간이세액표 금액을 직접 넣어 주세요(이 계산기는 세액표를 갖고 있지 않아요).");
    var totalDeduction = deductions.reduce(function (s, d) { return s + d.amount; }, 0);
    var mw = rateAt(rates && rates.minimumWage, o.date);
    return { wage: wage, items: items, gross: gross, deductions: deductions, totalDeduction: totalDeduction, net: gross - totalDeduction,
      minWage: mw, belowMin: !!(mw && wage < mw.hourly), notes: notes, basis: B };
  }

  // 임금명세서(시행령 제27조의2 순서): 근로자 정보 → 지급일 → 총액 → 항목·계산방법 → 공제 내역
  function statement(person, r) {
    return {
      head: [["성명", person.name || ""], ["생년월일", person.birth || ""], ["임금지급일", person.payDate || ""], ["임금 총액", T.won(r.gross)]],
      items: r.items, deductions: r.deductions, totalDeduction: r.totalDeduction, net: r.net
    };
  }

  function basis() { return B; }
  return { monthlyHours: monthlyHours, weeklyHolidayHours: weeklyHolidayHours, hourlyWage: hourlyWage, payslip: payslip, statement: statement, basis: basis };
});

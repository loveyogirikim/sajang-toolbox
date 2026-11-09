/* 상시 근로자 수 계산 — 근로기준법 시행령 제7조의2 (브라우저·node 테스트 겸용). DOM을 만지지 않는다. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.HeadcountCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var LAW = "근로기준법 시행령", URL = "https://www.law.go.kr/법령/근로기준법시행령/제7조의2";
  var B = [
    { law: LAW, article: "제7조의2제1항", what: "상시 근로자 수 = 산정기간(적용 사유 발생일 전 1개월) 동안 사용한 근로자 연인원 ÷ 같은 기간 가동일수", url: URL },
    { law: LAW, article: "제7조의2제2항", what: "일별로 세었을 때 기준(5명·취업규칙은 10명)에 미달한 날이 절반 미만이면 적용, 절반 이상이면 적용 안 함", url: URL },
    { law: LAW, article: "제7조의2제3항", what: "연차 유급휴가(제60~62조)는 이 한 달 계산이 아니라, 적용 사유 발생일 전 1년 동안 달마다 계속 5명 이상이었는지로 따로 판단 — 단, 1년 미만 근로자의 월 단위 연차(제60조제2항)는 제외(이 한 달 계산으로 판단)", url: URL },
    { law: LAW, article: "제7조의2제4항", what: "파견근로자는 빼고, 기간제·단시간 등 고용 형태와 상관없이 모두 포함(동거 친족은 다른 근로자가 1명이라도 있을 때 포함)", url: URL }
  ];

  // "5, 5 5\n4" → [5,5,5,4]. 숫자가 아닌 토막은 오류로 돌려준다.
  function parseDaily(text) {
    var daily = [], errors = [];
    String(text || "").split(/[\s,]+/).filter(Boolean).forEach(function (tok) {
      if (/^\d+$/.test(tok)) daily.push(Number(tok));
      else errors.push("'" + tok + "'은(는) 숫자가 아니에요.");
    });
    return { daily: daily, errors: errors };
  }

  // o: {daily:[가동일별 근로자 수], threshold: 5|10}
  function headcount(o) {
    var daily = o.daily || [], k = o.threshold || 5;
    if (!daily.length) return { error: "가동일별 근로자 수를 한 개 이상 넣어 주세요." };
    var total = daily.reduce(function (a, b) { return a + b; }, 0), days = daily.length, average = total / days;
    var belowDays = daily.filter(function (n) { return n < k; }).length, byAverage = average >= k, applies, rule;
    if (byAverage && belowDays * 2 >= days) { applies = false; rule = "over-half"; }        // 제2항제2호
    else if (!byAverage && belowDays * 2 < days) { applies = true; rule = "under-half"; }   // 제2항제1호
    else { applies = byAverage; rule = "average"; }                                          // 제1항
    return { total: total, days: days, average: average, belowDays: belowDays, threshold: k, applies: applies, rule: rule, basis: B };
  }

  function basis() { return B; }
  return { parseDaily: parseDaily, headcount: headcount, basis: basis };
});

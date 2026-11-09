/* 노무 계산기 — 계산 로직 (브라우저·node 테스트 겸용). 화면 코드는 부르기만 한다.
 * 계산식은 research/law/ 조문 기준. 조문과 다르면 조문이 이긴다(설계서 §6-1). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./toolbox-core.js"));
  else root.PayCore = factory(root.ToolboxCore);
})(typeof self !== "undefined" ? self : this, function (T) {
  "use strict";

  // 돈·시간은 곱셈을 먼저 하고 나누기는 마지막에 한 번, 내림·올림 전에 아주 작은 오차(1e-6)를 흡수한다 — 47,471원처럼 1원 어긋나는 소수 오차 방지(라이브 재검수 지적)
  function floorSafe(v) { return Math.floor(v + 1e-6); }
  function ceilSafe(v) { return Math.ceil(v - 1e-6); }

  // 링크는 국가법령정보센터 조문 바로가기 (Task 2에서 열리는 것 확인)
  function basis(law, article, what) {
    var m = /^제\d+조(의\d+)?/.exec(article);
    return { law: law, article: article, what: what,
      url: "https://www.law.go.kr/법령/" + law.replace(/\s+/g, "") + (m ? "/" + m[0] : "") };
  }

  var B = {
    leaveFirst: basis("근로기준법", "제60조제2항", "1년 미만이거나 출근율 80% 미만이면 1개월 개근마다 1일"),
    leaveBase: basis("근로기준법", "제60조제1항", "1년간 80% 이상 출근하면 15일"),
    leaveAdd: basis("근로기준법", "제60조제4항", "3년 이상이면 최초 1년을 넘는 매 2년마다 1일 가산, 총 25일 한도"),
    under5: basis("근로기준법 시행령", "제7조", "상시 4명 이하 사업장에 적용하는 규정은 별표 1"),
    under5List: basis("근로기준법 시행령", "별표 1", "상시 4명 이하 사업장 적용 규정 목록 — 제60조(연차)가 없음"),
    short: basis("근로기준법", "제18조제3항", "4주 평균 1주 소정근로시간 15시간 미만이면 주휴·연차 적용 제외"),
    leaveHours: basis("근로기준법 시행령", "별표 2", "단시간근로자 연차 = 통상 근로자 연차일수 × 소정근로시간 ÷ 통상 근로자 소정근로시간 × 8 (시간 단위, 1시간 미만은 1시간)"),
    sevScope: basis("근로자퇴직급여 보장법", "제3조", "근로자를 사용하는 모든 사업·사업장에 적용"),
    sevWho: basis("근로자퇴직급여 보장법", "제4조제1항", "계속근로기간 1년 미만, 1주 15시간 미만 근로자는 제외"),
    sevAmount: basis("근로자퇴직급여 보장법", "제8조제1항", "계속근로기간 1년에 대해 30일분 이상의 평균임금"),
    sevDue: basis("근로자퇴직급여 보장법", "제9조", "퇴직한 날부터 14일 이내 지급(특별한 사정이 있으면 합의로 연장)"),
    avg: basis("근로기준법", "제2조제1항제6호", "평균임금 = 사유 발생일 이전 3개월 임금 총액 ÷ 그 기간 총일수"),
    avgFloor: basis("근로기준법", "제2조제2항", "평균임금이 통상임금보다 적으면 통상임금을 평균임금으로"),
    weekRule: basis("근로기준법", "제55조제1항", "1주에 평균 1회 이상 유급휴일"),
    weekCond: basis("근로기준법 시행령", "제30조제1항", "1주 소정근로일을 개근한 사람에게"),
    weekPart: basis("근로기준법 시행령", "별표 2", "단시간근로자의 1일 소정근로시간 = 4주 소정근로시간 ÷ 통상 근로자의 4주 소정근로일 수")
  };

  function annualLeave(o) {
    var h = T.parseDate(o.hireDate), b = T.parseDate(o.baseDate);
    if (!h || !b) return { error: "입사일과 기준일을 확인해 주세요." };
    if (b < h) return { error: "기준일이 입사일보다 앞이에요." };
    if (!o.fivePlus) return { applicable: false, reason: "상시 근로자 5명 미만 사업장에는 법정 연차 유급휴가 규정이 적용되지 않아요. (회사 규칙으로 줄 수는 있어요.)", basis: [B.under5, B.under5List] };
    if (!(o.weeklyHours >= 15)) return { applicable: false, reason: "1주 소정근로시간(4주 평균)이 15시간 미만이면 연차 유급휴가가 적용되지 않아요.", basis: [B.short] };
    var months = T.fullMonths(h, b), years = Math.floor(months / 12);
    // 주 40시간 미만(단시간근로자)은 별표 2대로 시간 단위: 일수 × 소정근로시간 ÷ 40 × 8, 1시간 미만은 올림 (통상 근로자 주 40시간 가정)
    var partTime = o.weeklyHours < 40;
    function withHours(r) {
      if (r.days != null) r.hours = ceilSafe(r.days * Math.min(o.weeklyHours, 40) * 8 / 40);
      r.partTime = partTime;
      if (partTime && r.days != null) r.basis = r.basis.concat([B.leaveHours]);
      return r;
    }
    if (years < 1) {
      return withHours({ applicable: true, firstYear: true, days: Math.min(months, 11),
        detail: "입사 후 꽉 찬 " + months + "개월 — 개근한 달마다 1일씩 생겨요(최대 11일). 1년을 채우고 80% 이상 출근하면 15일이 새로 생겨요.",
        next: T.fmtDate(T.addMonths(h, 12)), basis: [B.leaveFirst, B.leaveBase] });
    }
    if (!o.attendance80) {
      return withHours({ applicable: true, days: null, years: years,
        detail: "지난 1년 출근율이 80% 미만이면 그 1년 동안 개근한 달마다 1일이 생겨요.", basis: [B.leaveFirst] });
    }
    var extra = Math.floor((years - 1) / 2), days = Math.min(15 + extra, 25);
    return withHours({ applicable: true, days: days, years: years,
      detail: "계속 근로 " + years + "년 — 기본 15일" + (days > 15 ? " + 가산 " + (days - 15) + "일" : "") + (15 + extra > 25 ? " (25일 한도)" : ""),
      next: T.fmtDate(T.addMonths(h, (years + 1) * 12)),
      basis: years >= 3 ? [B.leaveBase, B.leaveAdd] : [B.leaveBase] });
  }

  function severance(o) {
    var h = T.parseDate(o.hireDate), r = T.parseDate(o.retireDate);
    if (!h || !r) return { error: "입사일과 퇴직일을 확인해 주세요." };
    if (r <= h) return { error: "퇴직일이 입사일보다 뒤여야 해요." };
    if (!(o.wages3m > 0)) return { error: "퇴직 전 3개월 임금 총액을 숫자로 넣어 주세요. (예: 9,200,000 또는 920만)" };
    if (!(o.weeklyHours >= 15)) return { applicable: false, reason: "1주 소정근로시간(4주 평균)이 15시간 미만이면 퇴직금 대상이 아니에요.", basis: [B.sevWho] };
    var serviceDays = T.daysBetween(h, r);
    if (T.addMonths(h, 12) > r) return { applicable: false, serviceDays: serviceDays, reason: "계속 근로기간이 1년 미만이면 퇴직금 대상이 아니에요.", basis: [B.sevWho] };
    var from = T.addMonths(r, -3), periodDays = T.daysBetween(from, r), avgDaily = o.wages3m / periodDays;
    return { applicable: true, serviceDays: serviceDays, periodFrom: T.fmtDate(from), periodDays: periodDays,
      avgDaily: avgDaily, amount: floorSafe(o.wages3m * 30 * serviceDays / (periodDays * 365)),
      basis: [B.avg, B.avgFloor, B.sevAmount, B.sevScope, B.sevWho, B.sevDue] };
  }

  function minWageAt(rates, date) {
    var hit = null;
    ((rates && rates.minimumWage) || []).forEach(function (w) { if (w.from <= date && (!hit || w.from > hit.from)) hit = w; });
    return hit;
  }

  function weeklyHoliday(o, rates) {
    if (!(o.hourly > 0) || !(o.weeklyHours > 0)) return { error: "시급과 1주 소정근로시간을 숫자로 넣어 주세요." };
    var mw = minWageAt(rates, o.date), below = !!(mw && o.hourly < mw.hourly);
    if (o.weeklyHours < 15) return { applicable: false, reason: "1주 소정근로시간(4주 평균)이 15시간 미만이면 주휴수당 대상이 아니에요.", minWage: mw, belowMin: below, basis: [B.short] };
    // ponytail: 통상 근로자 주 5일 가정 — 주휴시간 = min(주 소정근로시간, 40) ÷ 40 × 8 (별표 2 산정식과 같은 값)
    var capped = Math.min(o.weeklyHours, 40), hours = capped * 8 / 40;
    return { applicable: true, hours: hours, amount: floorSafe(capped * 8 * o.hourly / 40), minWage: mw, belowMin: below,
      basis: [B.weekRule, B.weekCond, B.weekPart] };
  }

  function allBasis() { return Object.keys(B).map(function (k) { return B[k]; }); }

  return { annualLeave: annualLeave, severance: severance, weeklyHoliday: weeklyHoliday, minWageAt: minWageAt, allBasis: allBasis };
});

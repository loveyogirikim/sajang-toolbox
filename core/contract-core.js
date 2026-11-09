/* 근로계약서 만들기 — 근로기준법 제17조·시행령 제8조·기간제법 제17조의 필수 항목으로 조항을 만든다 (브라우저·node 테스트 겸용). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./toolbox-core.js"));
  else root.ContractCore = factory(root.ToolboxCore);
})(typeof self !== "undefined" ? self : this, function (T) {
  "use strict";
  function b(law, article, what) {
    var m = /^제\d+조(의\d+)?/.exec(article);
    return { law: law, article: article, what: what, url: "https://www.law.go.kr/법령/" + law.replace(/\s+/g, "") + (m ? "/" + m[0] : "") };
  }
  var B = [
    b("근로기준법", "제17조제1항", "계약할 때 임금·소정근로시간·휴일·연차 유급휴가·그 밖의 조건을 명시(바뀔 때도)"),
    b("근로기준법", "제17조제2항", "임금 구성항목·계산방법·지급방법과 소정근로시간·휴일·연차가 적힌 서면을 근로자에게 교부"),
    b("근로기준법 시행령", "제8조", "그 밖의 조건 = 취업 장소·업무, 취업규칙 사항, 기숙사 규칙"),
    b("기간제 및 단시간근로자 보호 등에 관한 법률", "제17조", "기간제·단시간은 계약기간·근로시간·휴게·임금·휴일·휴가·장소·업무 + (단시간) 근로일별 근로시간을 서면 명시"),
    b("근로기준법", "제54조제1항", "근로시간 4시간이면 30분, 8시간이면 1시간 이상 휴게"),
    b("근로기준법", "제55조제1항", "1주 평균 1회 이상 유급휴일"),
    b("근로기준법", "제60조제1항", "1년 80% 이상 출근 시 15일 연차 유급휴가"),
    b("근로기준법", "제18조제3항", "1주 15시간 미만은 주휴·연차 적용 제외")
  ];

  // 입력 칸 — 순서대로 조항이 된다. required 칸이 비면 계약서를 만들지 않는다.
  var FIELDS = [
    { key: "employer", label: "회사·가게 이름", required: true, hint: "사업자등록증의 상호" },
    { key: "employerRep", label: "대표자 이름", required: true },
    { key: "employee", label: "직원 이름", required: true },
    { key: "employeeBirth", label: "직원 생년월일", type: "date" },
    { key: "start", label: "근로 시작일", required: true, type: "date" },
    { key: "end", label: "계약 종료일", type: "date", hint: "기간을 정하지 않으면 비워 두세요 (정규직)" },
    { key: "place", label: "근무 장소", required: true, hint: "예: 서울 성동구 행복로 12 매장", basis: "시행령 제8조" },
    { key: "duty", label: "담당 업무", required: true, hint: "예: 홀 서빙·계산", basis: "시행령 제8조" },
    { key: "days", label: "근로일", required: true, hint: "예: 월~금 / 토·일" },
    { key: "hours", label: "근로시간", required: true, hint: "예: 09:00~18:00", basis: "제17조①2호" },
    { key: "breakTime", label: "휴게시간", required: true, hint: "예: 12:00~13:00 (60분)", basis: "제54조" },
    { key: "weeklyHours", label: "1주 소정근로시간", type: "number", hint: "예: 40 — 15시간 미만이면 주휴·연차 적용 제외" },
    { key: "payType", label: "임금 형태", required: true, type: "select", options: [["monthly", "월급"], ["hourly", "시급"]] },
    { key: "amount", label: "임금 금액", required: true, type: "amount", hint: "세전 — 예: 2,500,000 또는 10,320", basis: "제17조①1호" },
    { key: "payDay", label: "임금 지급일", required: true, hint: "예: 매월 10일 (전월 1일~말일분)" },
    { key: "payMethod", label: "지급 방법", required: true, hint: "예: 근로자 명의 계좌 이체" },
    { key: "holiday", label: "휴일", required: true, hint: "예: 매주 일요일(주휴일), 근로자의 날", basis: "제17조①3호·제55조" },
    { key: "leave", label: "연차 유급휴가", required: true, hint: "예: 근로기준법 제60조에 따라 부여", basis: "제17조①4호·제60조" }
  ];

  function clean(v) { return String(v == null ? "" : v).trim(); }

  var WEEKS_PER_MONTH = 365 / 12 / 7;
  function monthlyHours(wh) { return Math.round((wh + (wh >= 15 ? Math.min(wh, 40) / 40 * 8 : 0)) * WEEKS_PER_MONTH); } // 급여 도구와 같은 식(시행령 제6조)

  // v: 입력값(+date 작성일), opts: {minWage: {hourly, from}} — 최저임금 미달이면 notes에 경고(계약서는 만든다)
  function build(v, opts) {
    var missing = FIELDS.filter(function (f) {
      if (!f.required) return false;
      if (f.type === "amount") return !(Number(v[f.key]) > 0);
      return !clean(v[f.key]);
    }).map(function (f) { return { key: f.key, label: f.label }; });
    var end = clean(v.end), wh = Number(v.weeklyHours) || 0, part = wh > 0 && wh < 40;
    if (end && clean(v.start) && end < clean(v.start)) missing.push({ key: "end", label: "계약 종료일(시작일보다 앞서 있어요)" });
    var kind = end ? (part ? "기간제·단시간" : "기간제") : (part ? "단시간" : "무기");
    var hourly = v.payType === "hourly", amount = Number(v.amount) || 0;
    var money = (hourly ? "시급 " : "월급 ") + T.won(amount);
    var n = 0, clauses = [], notes = [];
    var mw = opts && opts.minWage, hourlyWage = hourly ? amount : (wh > 0 ? amount / monthlyHours(wh) : amount / monthlyHours(40));
    if (mw && amount > 0 && hourlyWage < mw.hourly) notes.push("통상시급 " + T.won(hourlyWage) + "이 " + String(mw.from || "").slice(0, 4) + "년 최저임금 " + T.won(mw.hourly) + "보다 낮아요(근로 시작일 기준) — 금액을 최저임금 이상으로 올려 적으세요.");
    function add(title, body) { n++; clauses.push({ no: n, title: title, body: body }); }
    add("근로계약기간", clean(v.start) + "부터 " + (end ? end + "까지" : "기간의 정함이 없음") + (end ? "" : " (수습 기간을 두는 경우 별도로 적는다)"));
    add("근무 장소 및 업무", "근무 장소: " + clean(v.place) + "\n담당 업무: " + clean(v.duty));
    add("근로일 및 근로시간", "근로일: " + clean(v.days) + "\n근로시간: " + clean(v.hours) + (wh ? "\n1주 소정근로시간: " + wh + "시간" : ""));
    if (part) add("근로일별 근로시간", clean(v.days) + " 각 " + clean(v.hours) + " (기간제법 제17조제6호에 따른 단시간근로자 명시 사항)");
    add("휴게시간", clean(v.breakTime) + " — 근로시간 도중에 자유롭게 이용");
    var weeklyPay = hourly && (wh === 0 || wh >= 15) ? "\n주휴수당: 1주 소정근로일을 개근하면 유급 주휴일(근로기준법 제55조)에 대한 주휴수당을 시급으로 계산해 별도 지급한다" : "";
    add("임금", "구성·금액: " + money + " (기본급)" + weeklyPay + "\n계산방법: 소정근로시간에 대한 임금이며, 연장·야간·휴일근로가 있으면 관계 법령에 따라 계산한다\n지급일: " + clean(v.payDay) + "\n지급방법: " + clean(v.payMethod));
    add("휴일", clean(v.holiday));
    add("연차 유급휴가", clean(v.leave));
    add("근로계약서 교부", "이 계약서는 2부를 작성해 사용자와 근로자가 각각 1부씩 보관하며, 사용자는 근로자에게 서면(전자문서 포함)으로 교부한다.");
    add("기타", "이 계약에 정하지 않은 사항(근로기준법 시행령 제8조의 취업규칙 사항 포함)은 취업규칙이 있으면 그에 따르고, 없으면 근로기준법 등 관계 법령에 따른다.");
    if (wh > 0 && wh < 15) notes.push("1주 소정근로시간이 15시간 미만이면 주휴일·연차 유급휴가 규정이 적용되지 않아요(제18조제3항). 계약서의 휴일·연차 조항을 그에 맞게 적으세요.");
    if (part) notes.push("단시간근로자는 근로일별 근로시간까지 서면으로 명시해야 해요(기간제법 제17조제6호) — 제4조에 넣었어요.");
    if (hourly && wh === 0) notes.push("1주 소정근로시간을 적으면 단시간 여부와 주휴수당 조건을 정확히 판단해요.");
    return { kind: kind, missing: missing, clauses: clauses, notes: notes, date: clean(v.date),
      parties: { employer: clean(v.employer), employerRep: clean(v.employerRep), employee: clean(v.employee), employeeBirth: clean(v.employeeBirth) },
      sign: [{ role: "사용자", name: clean(v.employer) + " 대표 " + clean(v.employerRep) }, { role: "근로자", name: clean(v.employee) + (clean(v.employeeBirth) ? " (" + clean(v.employeeBirth) + ")" : "") }],
      basis: B };
  }

  function toText(r) {
    var head = "근로계약서" + (r.kind === "무기" ? "" : " (" + r.kind + ")") + "\n\n" + r.parties.employer + " (대표 " + r.parties.employerRep + ")와(과) " + r.parties.employee + "은(는) 다음과 같이 근로계약을 맺는다.\n\n";
    var body = r.clauses.map(function (c) { return "제" + c.no + "조 (" + c.title + ")\n" + c.body; }).join("\n\n");
    var sign = "\n\n" + (r.date ? "작성일: " + r.date + "\n" : "") + r.sign.map(function (s) { return s.role + ": " + s.name + " (서명)"; }).join("\n");
    return head + body + sign;
  }

  function basis() { return B; }
  return { FIELDS: FIELDS, build: build, toText: toText, basis: basis };
});

/* 팔리는 한 줄·가게 이야기 — 스토리브랜드 7단계(SB7) 워크시트를 규칙으로 조립한다 (브라우저·node 테스트 겸용). DOM을 만지지 않는다.
 * AI 뒷단 없음: 정의문·헤드라인·행동 촉구는 공식(빈칸 채우기)이고, AI가 더 잘할 부분은 프롬프트로 복사만 시킨다(3차 설계 3-2).
 * 문장은 초안이다 — 조사가 안 맞으면 사장님이 고쳐 쓴다. 빈 칸은 [확인 필요]로 남겨 지어내지 않는다. 7단계 구조는 원조 교안을 따르되 도움말·프롬프트 문장은 우리가 썼다(2026-10-01 검수·재검수 반영). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.StoryCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var MAX = 300, NEED = "[확인 필요]";
  var FIELDS = [
    { id: "want", step: "1 주인공이 원하는 것", label: "손님이 얻고 싶은 것", hint: "상품이 아니라 삶의 장면으로. 예: 밤 10시에도 마음 놓고 마시는 커피 한 잔" },
    { id: "extProblem", step: "2 문제 — 겉으로", label: "외적 문제", hint: "겉으로 드러나는 불편. 예: 저녁에 커피를 마시면 새벽까지 뒤척인다" },
    { id: "intProblem", step: "2 문제 — 마음속", label: "내적 문제", hint: "마음속 불안·서운함. 예: 좋아하는 커피를 참는 저녁이 서럽다" },
    { id: "philProblem", step: "2 문제 — 옳지 않다", label: "철학적 문제", hint: "'이건 아니다' 싶은 생각. 예: 잠 때문에 좋아하는 걸 포기해야 하나" },
    { id: "empathy", step: "3 길잡이 — 공감", label: "저희도 그랬습니다", hint: "같은 고민을 겪은 이야기 한 줄" },
    { id: "authority", step: "3 길잡이 — 믿을 이유", label: "믿을 수 있는 이유 (사실만)", hint: "경력·숫자·자격 — 확인할 수 있는 것만, 기준일과 함께" },
    { id: "plan", step: "4 계획", label: "손님이 따라 할 3단계", hint: "한 줄에 하나씩. 예: 주문 / 화요일 로스팅 / 목요일 도착" },
    { id: "ctaDirect", step: "5 행동 촉구 — 바로", label: "지금 할 행동", hint: "동사로 끝내요. 예: 이번 주 원두 200g 담기" },
    { id: "ctaSoft", step: "5 행동 촉구 — 가볍게", label: "망설이는 분을 위한 행동", hint: "예: 시음 샘플 받기, 보관법 안내 받기" },
    { id: "failure", step: "6 실패 회피", label: "사지 않으면 계속될 일", hint: "겁주지 말고 담담하게. 예: 또 참거나, 또 뒤척이는 밤" },
    { id: "success", step: "7 성공", label: "문제가 풀린 뒤의 장면", hint: "눈에 보이는 장면으로. 예: 밤 10시, 커피 향과 함께 잠드는 저녁" }
  ];
  var CHECKS = ["손님의 문제로 문장이 시작되나?", "우리 방식이 손에 잡히게 구체적인가? ('정성껏'이 아니라 '매주 화요일 그 주 팔 양만')", "결과가 눈앞의 장면으로 그려지나?"];
  var TEST3 = "3초 테스트: 가족이나 단골 세 분에게 휴대폰으로 헤드라인을 3초만 보여 주고 \"무슨 가게 같아요? 누가 필요할 것 같아요?\"를 물어 보세요. 가장 정확히 맞힌 안이 첫 화면에 올라갑니다.";

  function s(v) { return String(v == null ? "" : v).normalize("NFKC").replace(/[ \t]+/g, " ").trim().slice(0, MAX); }
  function clean(raw) { var o = raw || {}, p = {}; FIELDS.forEach(function (f) { p[f.id] = s(o[f.id]); }); return p; }
  function missing(sb7) { var p = clean(sb7); return FIELDS.filter(function (f) { return !p[f.id]; }).map(function (f) { return f.id; }); }
  function or(v) { return s(v) || NEED; }

  // 가게 카드에서 채울 수 있는 칸만 미리 채운다 — 나머지는 사장님이 쓴다
  function prefill(profile) {
    var pr = profile || {}, p = clean({});
    p.extProblem = s(pr.pain); p.authority = s(pr.proof); p.empathy = s(pr.origin);
    if (s(pr.product)) p.ctaDirect = "지금 " + s(pr.product) + " 주문하기";
    return p;
  }

  function planSteps(sb7) {
    return String(sb7 && sb7.plan || "").split(/\r?\n/).map(function (x) { return s(x); }).filter(Boolean).slice(0, 3);
  }

  // 한 줄 정의문 3공식 — [문제] → [방식] → [결과]
  function oneLiners(sb7, profile) {
    var p = clean(sb7), pr = profile || {};
    var problem = p.intProblem || p.extProblem, method = s(pr.method), result = p.success, name = s(pr.name), customer = s(pr.customer);
    return [
      { name: "정의문형", text: or(problem) + "를 겪는 분께, " + or(method) + "으로 " + or(result) + "를 드립니다." },
      { name: "상호형", text: or(customer) + "의 " + or(problem) + ". " + or(name) + "는 " + or(method) + "으로 " + or(result) + "까지 함께합니다." },
      { name: "결과형", text: or(result) + " — " + or(method) + ". " + or(name) + "." }
    ];
  }

  // 첫 화면 헤드라인 5공식
  function headlines(sb7, profile) {
    var p = clean(sb7), pr = profile || {}, steps = planSteps(p), last = steps[steps.length - 1];
    return [
      { formula: "문제 해결형", who: "문제를 겪는 걸 아는 분", text: or(p.extProblem) + ", " + or(p.success) },
      { formula: "결과 약속형", who: "빨리 결과를 보고 싶은 분", text: or(last) + ", " + or(p.want) },
      { formula: "대상 호명형", who: "'내 얘기네' 하고 멈추는 분", text: or(p.extProblem) + "인 " + or(pr.customer) + "을 위한 " + or(pr.product) },
      { formula: "증거형", who: "믿을 이유부터 찾는 분", text: or(p.authority) + " — " + or(p.want) },
      { formula: "질문형", who: "속으로 같은 질문을 하던 분", text: or(p.intProblem) + ", 이런 마음 드세요?" }
    ];
  }

  // 행동 촉구 3곳: 첫 화면 아래 · 구성·가격 · 맨 끝 (가벼운 행동이 없으면 바로 행동을 다시)
  function ctas(sb7, profile) {
    var p = clean(sb7), pr = profile || {}, direct = p.ctaDirect || NEED;
    return [
      { where: "첫 화면 아래", text: direct },
      { where: "구성·가격", text: "이번 주 " + or(pr.product) + " 시작하기" },
      { where: "맨 끝", text: p.ctaSoft || direct }
    ];
  }

  // AI(Claude·ChatGPT 등)에 붙여넣을 프롬프트 2개 — 가게 카드 글을 앞에 붙여 지어내지 않게 한다
  function prompts(profileText, profile) {
    var pr = profile || {}, product = or(pr.product), card = String(profileText || "").trim() || "[우리 가게 카드를 먼저 만들어 붙여 넣으세요]";
    return [
      { name: "손님 리뷰에서 손님의 말 찾기", text: card + "\n\n아래는 " + product + "를 산 손님들의 리뷰와 문의야. 손님이 쓴 말을 바탕으로만 정리해 줘.\n- 표 하나: 왼쪽 칸 '사기 전 겪던 일', 가운데 칸 '마음속 걱정', 오른쪽 칸 '이건 아니다 싶었던 생각'. 칸마다 손님 문장을 그대로 두 개씩 따옴표로 옮겨 줘.\n- 표 아래: 사기 전에 망설인 이유 세 가지, 쓰고 나서 달라졌다는 말 다섯 개(손님 표현 그대로), 우리가 몰랐던 구매 이유가 보이면 한 개.\n- 리뷰에서 찾을 수 없는 칸은 비워 두고 '없음'이라고만 써 줘. 추측은 하지 마.\n\n[리뷰·문의]\n(여기에 붙여넣기 — 손님 이름·전화번호·주소는 지우고)" },
      { name: "7단계 이야기 초안", text: card + "\n\n위 가게 카드만 재료로 " + product + "의 이야기를 일곱 단계로 써 줘. 손님이 주인공, 우리 가게는 길잡이야.\n단계는 이 순서로: 손님이 바라는 삶의 장면 → 겉으로 보이는 불편·마음속 걱정·'이건 아니다' 싶은 생각 → 우리가 같은 고민을 겪었다는 한 줄과 믿을 이유(카드의 증거만) → 손님이 따라 할 세 단계 → 바로 할 행동 하나와 가벼운 행동 하나 → 사지 않으면 이어질 일(담담하게) → 문제가 풀린 뒤의 장면.\n단계마다 핵심 한 줄과 상세페이지에 넣을 문장 하나씩. 끝에 한 줄 소개 세 개를 '[손님의 문제]를 겪는 분께, [우리 방식]으로 [결과]를 드립니다' 꼴로.\n카드에 없는 숫자·인증·수상·후기·대표 이야기·시작한 계기는 만들지 말고 [확인 필요]로 비워 둬. 병이 낫는다는 말이나 '최고·유일·1위' 같은 근거 없는 말은 쓰지 마." }
    ];
  }

  function toText(sb7, profile) {
    var p = clean(sb7), lines = ["[스토리브랜드 7단계]"];
    FIELDS.forEach(function (f) { lines.push(f.step + " · " + f.label + ": " + (f.id === "plan" ? (planSteps(p).join(" → ") || NEED) : or(p[f.id]))); });
    lines.push("", "[한 줄 정의문]");
    oneLiners(p, profile).forEach(function (o) { lines.push("- " + o.name + ": " + o.text); });
    lines.push("", "[첫 화면 헤드라인 5안]");
    headlines(p, profile).forEach(function (h) { lines.push("- " + h.formula + ": " + h.text); });
    lines.push("", "[행동 촉구 3곳]");
    ctas(p, profile).forEach(function (c) { lines.push("- " + c.where + ": " + c.text); });
    return lines.join("\n");
  }

  return { FIELDS: FIELDS, CHECKS: CHECKS, TEST3: TEST3, NEED: NEED, clean: clean, missing: missing, prefill: prefill, planSteps: planSteps,
    oneLiners: oneLiners, headlines: headlines, ctas: ctas, prompts: prompts, toText: toText };
});

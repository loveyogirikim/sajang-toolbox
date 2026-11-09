/* 우리 가게 카드 — 마케팅 도구 6개의 척추 (브라우저·node 테스트 겸용). DOM·저장소를 만지지 않는다.
 * 13칸 전부 공개 사업 정보다 — 성명·주민번호·생년월일 칸은 두지 않는다(3차 설계 3-4, 사장님 승인 2026-10-01). 칸 구성(가게 카드·말투·원칙)은 원조 교안의 구조를 따르되 문장은 우리가 썼다(2026-10-01 검수 반영). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ProfileCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var MAX = 300;
  var TYPES = [
    { id: "restaurant", name: "음식점·카페" },
    { id: "food", name: "식품 판매" },
    { id: "beauty", name: "미용·뷰티" },
    { id: "education", name: "학원·교육" },
    { id: "service", name: "서비스·시공" },
    { id: "online", name: "온라인 셀러" },
    { id: "freelance", name: "프리랜서·강사" }
  ];
  var TONES = [
    { id: "warm", name: "따뜻하고 수수하게" },
    { id: "expert", name: "정확하고 전문가답게" },
    { id: "bright", name: "밝고 가볍게" },
    { id: "calm", name: "차분하고 고급스럽게" }
  ];
  var FIELDS = [
    { id: "name", label: "상호·브랜드 이름", hint: "손님이 부르는 이름 그대로", kind: "text" },
    { id: "type", label: "업종", hint: "가장 가까운 것 하나", kind: "select" },
    { id: "product", label: "대표 상품·서비스", hint: "이번에 알리고 싶은 것 하나. 예: 디카페인 원두 200g, 1:1 필라테스 10회", kind: "text" },
    { id: "customer", label: "주로 사는 사람", hint: "얼굴이 떠오르는 한 사람. 예: 밤에 커피를 마시면 잠을 설치는 직장인", kind: "text" },
    { id: "pain", label: "그 사람의 가장 큰 고민", hint: "사기 전에 겪는 불편이나 걱정. 예: 저녁 커피가 당기는데 잠이 걱정된다", kind: "textarea" },
    { id: "method", label: "우리만의 방식", hint: "'정성껏'이 아니라 손에 잡히게. 예: 매주 화요일 그 주 팔 양만 볶는다", kind: "textarea" },
    { id: "proof", label: "증거 (사실만)", hint: "확인할 수 있는 것만, 기준일과 함께. 예: 2024년 개업, 스토어 리뷰 4.8점(2026-09 기준)", kind: "textarea" },
    { id: "origin", label: "시작한 계기", hint: "손님과 같은 고민을 겪은 이야기. 예: 야근 뒤 밤 커피를 끊지 못하던 대표", kind: "textarea" },
    { id: "offer", label: "구성과 가격", hint: "한 줄에 하나. 예: 200g 12,000원 / 2봉 22,000원", kind: "textarea" },
    { id: "service", label: "이용 안내", hint: "영업시간·예약·배송·걸리는 시간·취소 조건", kind: "textarea" },
    { id: "channel", label: "파는 곳·소통 채널", hint: "매장, 스마트스토어, 인스타그램, 카카오톡 채널 등", kind: "text" },
    { id: "contact", label: "문의처", hint: "전화나 카톡 채널처럼 손님에게 보여 줄 연락처", kind: "text" },
    { id: "tone", label: "말투", hint: "글과 문자에 쓸 말투", kind: "select" }
  ];
  var PRINCIPLES = [
    "손님이 주인공이고 우리 가게는 길잡이다.",
    "이 카드에 없는 숫자·인증·수상·후기·대표 이야기는 만들어 넣지 않는다. 모르면 [확인 필요]로 비워 둔다.",
    "병이 낫는다는 말, '최고·유일·1위'처럼 근거 없는 말은 쓰지 않는다."
  ];

  function s(v) { return String(v == null ? "" : v).normalize("NFKC").replace(/\s+/g, " ").trim(); }
  function pick(list, id) { return list.filter(function (x) { return x.id === id; })[0]; }
  function typeName(id) { var t = pick(TYPES, id); return t ? t.name : ""; }
  function toneName(id) { var t = pick(TONES, id); return t ? t.name : ""; }

  // 아는 칸만, 전각·공백 정리, 300자 상한. 업종·말투는 목록에 있는 값만 남긴다(저장소에서 읽은 값도 여기를 거친다).
  function clean(raw) {
    var o = raw || {}, p = {};
    FIELDS.forEach(function (f) {
      var v = f.kind === "textarea" ? String(o[f.id] == null ? "" : o[f.id]).normalize("NFKC").replace(/[ \t]+/g, " ").trim() : s(o[f.id]);
      if (f.id === "type" && !pick(TYPES, v)) v = "";
      if (f.id === "tone" && !pick(TONES, v)) v = "";
      p[f.id] = v.slice(0, MAX);
    });
    return p;
  }
  function filled(p) { return FIELDS.filter(function (f) { return p && s(p[f.id]); }).length; }
  function missing(p) { return FIELDS.filter(function (f) { return !(p && s(p[f.id])); }).map(function (f) { return f.id; }); }

  // AI(Claude·ChatGPT 등) 프로젝트 지침에 붙여넣는 글 — 빈 칸은 [확인 필요]로 남겨 AI가 지어내지 않게 한다
  function toText(p) {
    p = clean(p);
    function v(id, name) { var x = name ? name(p[id]) : p[id]; return x || "[확인 필요]"; }
    var lines = ["[우리 가게 카드]",
      "상호: " + v("name") + " / 업종: " + v("type", typeName),
      "대표 상품·서비스: " + v("product"),
      "주요 고객: " + v("customer"),
      "고객의 가장 큰 고민: " + v("pain"),
      "우리만의 방식: " + v("method"),
      "증거(사실만): " + v("proof"),
      "시작한 계기: " + v("origin"),
      "구성·가격: " + v("offer"),
      "이용 안내: " + v("service"),
      "파는 곳·채널: " + v("channel"),
      "문의처: " + v("contact"),
      "말투: " + v("tone", toneName),
      "", "[지켜야 할 원칙]"].concat(PRINCIPLES.map(function (x) { return "- " + x; }));
    return lines.join("\n");
  }

  return { FIELDS: FIELDS, TYPES: TYPES, TONES: TONES, PRINCIPLES: PRINCIPLES, MAX: MAX, clean: clean, filled: filled, missing: missing, toText: toText, typeName: typeName, toneName: toneName };
});

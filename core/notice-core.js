/* 가게 안내문 — 내용 정리·줄바꿈·템플릿 (브라우저·node 테스트 겸용). 그리기는 apps/notice.js. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NoticeCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // 흰 글씨 대비 4.5:1 이상 (쇼룸 토큰 계열)
  var THEMES = {
    indigo: { name: "남색", bg: "#4650bd", bg2: "#5e6ad2", ink: "#ffffff", soft: "#eef0fb" },
    green: { name: "초록", bg: "#146c30", bg2: "#1f8a42", ink: "#ffffff", soft: "#e8f3ec" },
    amber: { name: "갈색", bg: "#8a5f0e", bg2: "#a8771b", ink: "#ffffff", soft: "#f7efe0" },
    plum: { name: "자주", bg: "#7a2f5f", bg2: "#963f78", ink: "#ffffff", soft: "#f6e9f1" },
    teal: { name: "청록", bg: "#0b6a68", bg2: "#12837f", ink: "#ffffff", soft: "#e4f2f1" },
    ink: { name: "검정", bg: "#191b22", bg2: "#2c303b", ink: "#ffffff", soft: "#f1f3f6" }
  };
  // 폭·최소 높이(내용이 길면 아래로 늘어난다)
  var SIZES = {
    kakao: { name: "카톡용 (3:4)", w: 1080, minH: 1440 },
    insta: { name: "인스타 정사각", w: 1080, minH: 1080 },
    a4: { name: "A4 인쇄", w: 1240, minH: 1754 }
  };
  // 템플릿: 카드 상단 라벨·제목 예시·핵심 정보 4줄 기본 이름·예시 문구
  var TEMPLATES = [
    { id: "closed", label: "휴무 안내", name: "휴무·영업시간", title: "추석 연휴 휴무 안내", sub: "연휴 잘 보내세요", rows: ["휴무 기간", "정상 영업", "영업시간", "문의"], highlight: "10월 6일부터 정상 영업합니다", body: "연휴 기간 주문·문의는 카톡으로 남겨 주세요\n연휴 뒤 순서대로 답변드립니다" },
    { id: "event", label: "이벤트 안내", name: "이벤트·행사", title: "가을맞이 1+1 이벤트", sub: "한 달간 진행합니다", rows: ["기간", "장소", "대상", "혜택"], highlight: "재고 소진 시 조기 종료될 수 있어요", body: "1인 1회 참여\n다른 할인과 중복 불가" },
    { id: "price", label: "가격 변경 안내", name: "가격 변경", title: "일부 메뉴 가격 조정 안내", sub: "원재료값 상승으로 부득이하게 조정합니다", rows: ["적용일", "변경 품목", "변경 전", "변경 후"], highlight: "더 나은 품질로 보답하겠습니다", body: "기존 적립·쿠폰은 그대로 사용 가능합니다" },
    { id: "newitem", label: "신메뉴 안내", name: "신메뉴·신상품", title: "가을 신메뉴 출시", sub: "이번 주부터 만나 보세요", rows: ["출시일", "메뉴", "가격", "판매 시간"], highlight: "출시 기념 첫 주 10% 할인", body: "" },
    { id: "hiring", label: "채용 공고", name: "채용 공고", title: "함께 일할 분을 찾습니다", sub: "홀 서빙 · 주말 근무", rows: ["모집 인원", "근무 시간", "시급·급여", "지원 방법"], highlight: "경력 없어도 괜찮아요, 친절히 알려 드립니다", body: "4대보험 가입\n식사 제공\n면접 후 바로 근무 가능" },
    { id: "workshop", label: "교육 안내", name: "워크숍·교육", title: "2026 하반기 워크숍", sub: "전 직원 참석", rows: ["일시", "장소", "준비물", "문의"], highlight: "참석 여부를 12월 15일까지 알려 주세요", body: "오전: 상반기 돌아보기\n오후: 팀별 계획 발표\n저녁: 회식" },
    { id: "party", label: "모임 안내", name: "송년회·회식", title: "2026 송년회", sub: "한 해 고생 많으셨습니다", rows: ["일시", "장소", "회비", "문의"], highlight: "가족 동반 환영", body: "주차는 건물 지하 2층\n2차 없음" },
    { id: "move", label: "이전 안내", name: "이전·리뉴얼", title: "매장 이전 안내", sub: "더 넓은 곳에서 뵙겠습니다", rows: ["새 주소", "오픈일", "영업시간", "문의"], highlight: "이전 기념 첫 주 전 메뉴 10% 할인", body: "기존 매장은 10월 31일까지 운영합니다" }
  ];

  // 전각 숫자·문자(２０２６)를 반각으로, 앞뒤 공백 정리
  function clean(v) { return String(v == null ? "" : v).normalize("NFKC").trim(); }
  function template(id) { return TEMPLATES.filter(function (t) { return t.id === id; })[0] || TEMPLATES[0]; }

  // 입력 → 그릴 덩어리 목록. 빈 칸은 뺀다.
  // f = {template, title, sub, rows:[{label,text}], highlight, body, footer:{name,address,contact}}
  function blocks(f) {
    var t = template(f.template), out = [{ kind: "label", text: t.label }];
    out.push({ kind: "title", text: clean(f.title) || "안내문 제목" });
    if (clean(f.sub)) out.push({ kind: "sub", text: clean(f.sub) });
    var rows = (f.rows || []).map(function (r) { return { label: clean(r.label), text: clean(r.text) }; })
      .filter(function (r) { return r.text; });
    if (rows.length) out.push({ kind: "rows", rows: rows });
    if (clean(f.highlight)) out.push({ kind: "highlight", text: clean(f.highlight) });
    var lines = clean(f.body).split(/\r?\n/).map(clean).filter(Boolean);
    if (lines.length) out.push({ kind: "body", label: "안내 사항", lines: lines });
    var foot = [clean(f.footer && f.footer.name), clean(f.footer && f.footer.address), clean(f.footer && f.footer.contact)].filter(Boolean);
    if (foot.length) out.push({ kind: "footer", lines: foot });
    return out;
  }

  // measure(글자열)→폭 을 받아 maxWidth에 맞춰 줄을 나눈다. 띄어쓰기 단위로 끊고, 한 낱말이 넘치면 글자 단위로.
  function wrap(text, maxWidth, measure) {
    var lines = [];
    String(text).split(/\r?\n/).forEach(function (para) {
      var line = "";
      para.split(" ").forEach(function (w) {
        var tryLine = line ? line + " " + w : w;
        if (measure(tryLine) <= maxWidth) { line = tryLine; return; }
        if (line) lines.push(line);
        var chunk = "";
        Array.from(w).forEach(function (ch) {
          if (chunk && measure(chunk + ch) > maxWidth) { lines.push(chunk); chunk = ""; }
          chunk += ch;
        });
        line = chunk;
      });
      lines.push(line);
    });
    return lines;
  }

  function toText(f) {
    return blocks(f).map(function (b) {
      if (b.kind === "label") return null;
      if (b.kind === "title") return "[" + b.text + "]";
      if (b.kind === "sub") return b.text;
      if (b.kind === "rows") return b.rows.map(function (r) { return (r.label ? r.label + ": " : "") + r.text; }).join("\n");
      if (b.kind === "highlight") return "※ " + b.text;
      if (b.kind === "body") return b.label + "\n" + b.lines.map(function (l) { return "- " + l; }).join("\n");
      return b.lines.join("\n");
    }).filter(Boolean).join("\n\n");
  }

  return { blocks: blocks, wrap: wrap, toText: toText, clean: clean, template: template, TEMPLATES: TEMPLATES, THEMES: THEMES, SIZES: SIZES };
});

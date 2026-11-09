/* 소개·상세페이지 조립기 — 블록·템플릿·품질 점검·작업 파일 (브라우저·node 테스트 겸용). 그리기(캔버스)는 apps/page.js. DOM을 만지지 않는다.
 * 원조(식품 12섹션 조립 도구)의 구조만 참고 — 블록 14종 + 여백, 업종 템플릿 7종은 우리가 썼다. 사진은 data:image 문자열로만 다루고 어디에도 보내지 않는다. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PageCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var MAX_TEXT = 600, MAX_BODY = 3000, MAX_IMAGES = 3, MAX_BLOCKS = 40, MAX_SRC = 6 * 1024 * 1024, LONG = 40;
  var STR = ["title", "body", "headline", "sub", "proof", "cta", "badTitle", "goodTitle", "button"];
  // body: lines(한 줄에 하나, | 로 칸) | text(문단) | none. images: 넣을 수 있는 사진 수. fields: 제목 외 추가 칸
  var BLOCKS = {
    hero: { name: "첫 화면", hint: "3초 안에 멈추게 — 헤드라인은 상품명이 아니라 손님이 얻는 결과로", body: "none", images: 1, title: false, fields: ["headline", "sub", "proof", "cta"] },
    checklist: { name: "이런 고민 있으시죠?", hint: "한 줄에 고민 하나, 3~4줄", body: "lines", images: 0, title: true, fields: [] },
    compare: { name: "왜 이렇게 됐을까", hint: "한 줄에 '흔한 선택|우리 방법'", body: "lines", images: 0, title: true, fields: ["badTitle", "goodTitle"] },
    greeting: { name: "저희도 그랬습니다", hint: "대표 이야기 — 시작한 계기, 같은 고민. 대표 사진(실물)", body: "text", images: 1, title: true, fields: [] },
    numbers: { name: "믿을 수 있는 이유", hint: "한 줄에 '숫자|설명' — 사실만, 기준일·출처와 함께", body: "lines", images: 0, title: true, fields: [] },
    photos: { name: "이렇게 합니다", hint: "실제 사진 최대 3장 + 설명 한 줄", body: "text", images: 3, title: true, fields: [] },
    steps: { name: "이용 3단계", hint: "한 줄에 '단계 제목|설명' — 3줄", body: "lines", images: 0, title: true, fields: [] },
    pricing: { name: "구성·가격", hint: "한 줄에 '이름|설명|가격|추천' — 추천할 것은 넷째 칸에 '추천'", body: "lines", images: 0, title: true, fields: [] },
    text: { name: "글", hint: "한 문단 — '이걸 놓치면'처럼 담담하게", body: "text", images: 0, title: true, fields: [] },
    review: { name: "이렇게 달라집니다", hint: "한 줄에 '후기|누가' — 실제 후기만, 이름은 김OO처럼", body: "lines", images: 0, title: true, fields: [] },
    safety: { name: "안심 정보", hint: "한 줄에 '항목|내용' — 빠진 필수 항목은 품질 점검이 알려 줘요", body: "lines", images: 0, title: true, fields: [] },
    faq: { name: "자주 묻는 질문", hint: "한 줄에 '질문|답'", body: "lines", images: 0, title: true, fields: [] },
    cta: { name: "행동 촉구", hint: "혜택 요약 한 줄 + 버튼 문구(동사로)", body: "none", images: 0, title: true, fields: ["button", "sub"] },
    box: { name: "안내 상자", hint: "짧은 안내 한 문단", body: "text", images: 0, title: false, fields: [] },
    gap: { name: "여백", hint: "", body: "none", images: 0, title: false, fields: [] }
  };
  // 글자 대비를 위해 본문은 ink, 강조 배경(accent) 위 글자는 onAccent
  var THEMES = [
    { id: "cream", name: "따뜻한 크림", bg: "#fbf7f0", paper: "#ffffff", ink: "#2b241d", sub: "#6b6259", accent: "#b5542a", soft: "#f3e6d8", onAccent: "#ffffff" },
    { id: "white", name: "깔끔한 흰색", bg: "#ffffff", paper: "#f4f5f8", ink: "#191b22", sub: "#616876", accent: "#4650bd", soft: "#eef0fb", onAccent: "#ffffff" },
    { id: "dark", name: "프리미엄 검정", bg: "#16181d", paper: "#22262e", ink: "#f2f3f5", sub: "#b4b9c4", accent: "#d9a13c", soft: "#2c313b", onAccent: "#16181d" },
    { id: "green", name: "자연 초록", bg: "#f4f8f3", paper: "#ffffff", ink: "#1f2a22", sub: "#5d6b61", accent: "#146c30", soft: "#e3efe6", onAccent: "#ffffff" },
    { id: "vivid", name: "산뜻한 파랑", bg: "#ffffff", paper: "#f0f6ff", ink: "#14213d", sub: "#5a6a85", accent: "#0b63ce", soft: "#e3eefc", onAccent: "#ffffff" },
    { id: "rose", name: "부드러운 장미", bg: "#fff8f8", paper: "#ffffff", ink: "#3a2530", sub: "#6e5560", accent: "#b0345c", soft: "#f8e3ea", onAccent: "#ffffff" }
  ];

  function s(v, max) { return String(v == null ? "" : v).normalize("NFKC").replace(/\r\n?/g, "\n").trim().slice(0, max || MAX_TEXT); }
  function theme(id) { return THEMES.filter(function (t) { return t.id === id; })[0] || THEMES[0]; }
  // 자바스크립트 기본 속성 이름(constructor·__proto__ 등)이 블록 종류로 통과하지 않게 자기 속성만 본다(2026-10-01 기술 검수)
  function isType(type) { return typeof type === "string" && Object.prototype.hasOwnProperty.call(BLOCKS, type); }
  function newBlock(type) {
    if (!isType(type)) return null;
    var b = { type: type, images: [], ai: false, example: {} };
    STR.forEach(function (k) { b[k] = ""; });
    b.title = BLOCKS[type].title ? BLOCKS[type].name : "";
    return b;
  }
  function fromTemplate(tpl, data) {
    // safety: 이 업종의 안심 정보 필수 항목 — 페이지가 갖고 다녀 품질 점검이 템플릿 없이도 안다
    return { template: tpl.id, theme: tpl.theme || THEMES[0].id, fontSize: 1, safety: (tpl.safety || []).slice(), safetyLabel: tpl.safetyLabel || "권장 항목", blocks: tpl.blocks.map(function (x) {
      var b = newBlock(x.type), ex = {};
      Object.keys(x).forEach(function (k) { if (k !== "type" && STR.indexOf(k) !== -1) ex[k] = String(x[k]); });
      if (ex.title) { b.title = ex.title; delete ex.title; } // 블록 제목은 예시가 아니라 기본값으로 넣는다
      b.example = ex; return b;
    }) };
  }
  // "a|b\nc ｜ d" → [["a","b"],["c","d"]]
  function parseLines(body) {
    return s(body, MAX_BODY).split("\n").map(function (l) { return l.trim(); }).filter(Boolean)
      .map(function (l) { return l.split("|").map(function (c) { return c.trim(); }); });
  }
  function textOf(b) {
    var parts = [];
    STR.forEach(function (k) { if (b[k]) parts.push(b[k]); });
    return parts.join("\n");
  }
  function pageText(page) { return (page.blocks || []).map(textOf).join("\n"); }
  // 제목(기본값이 들어 있다)은 내용으로 치지 않는다 — 회색 예시만 있는 블록은 '빈 블록'
  function hasContent(b) { return !!(STR.some(function (k) { return k !== "title" && s(b[k]); }) || (b.images && b.images.length)); }
  function longSentences(text) { return String(text || "").split(/[.!?。\n]+/).map(function (x) { return x.trim(); }).filter(function (x) { return x.length > LONG; }); }
  function nk(x) { return String(x || "").normalize("NFKC").replace(/[\s·ㆍ/()]/g, "").toLowerCase(); }
  // 예시 문구가 한 칸이라도 그대로 남은 블록 — 지어낸 후기·숫자가 그대로 나가지 않게 품질 점검이 크게 깎는다(2026-10-01 콘텐츠 검수 상2)
  function exampleBlocks(page) {
    return (page.blocks || []).filter(function (b) {
      var ex = b.example || {};
      return Object.keys(ex).some(function (k) { return ex[k] && s(b[k], MAX_BODY) === s(ex[k], MAX_BODY); });
    });
  }

  // 품질 점검 — 규칙으로만. opts.scan(text) → 위험 표현 hits(광고 문구 점검 코어), opts.height → 860px 폭 기준 전체 높이, opts.template → 템플릿(안심 정보 필수 항목)
  function quality(page, opts) {
    var o = opts || {}, blocks = page.blocks || [], items = [], penalty = 0;
    function add(ok, text, p) { items.push({ ok: ok, text: text }); if (ok === false) penalty += p || 0; }
    var hero = blocks[0], heroFirst = !!(hero && hero.type === "hero");
    add(heroFirst, heroFirst ? "맨 위 블록이 첫 화면이에요" : "맨 위 블록을 첫 화면으로 두세요", 15);
    add(heroFirst && !!s(hero.headline), heroFirst && s(hero.headline) ? "첫 화면 제목이 있어요" : "첫 화면 제목이 아직 없어요 — 손님이 얻게 되는 것을 한 줄로", 15);
    add(heroFirst && hero.images.length > 0, heroFirst && hero.images.length ? "첫 화면에 사진이 있어요" : "첫 화면에 실물 사진이 있으면 손이 멈춰요 — 넣어 주세요", 10);
    var have = {}; blocks.forEach(function (b) { have[b.type] = true; });
    var core = [["checklist", "고민"], ["greeting|numbers", "안내자(공감·증거)"], ["steps", "3단계"], ["pricing", "구성·가격"], ["cta", "행동 촉구"]];
    var missCore = core.filter(function (c) { return !c[0].split("|").some(function (t) { return have[t]; }); });
    add(missCore.length === 0, missCore.length ? "이야기에 꼭 필요한 블록이 빠졌어요: " + missCore.map(function (c) { return c[1]; }).join(", ") : "이야기에 꼭 필요한 블록 5종이 다 있어요", 5 * missCore.length);
    var ctaN = blocks.filter(function (b) { return b.type === "cta" && (s(b.button) || s(b.title)); }).length + (heroFirst && s(hero.cta) ? 1 : 0);
    add(ctaN >= 2, "주문·예약으로 이어지는 버튼이 " + ctaN + "곳" + (ctaN >= 2 ? "이에요" : " — 첫 화면 아래, 구성·가격, 맨 끝에 두 곳 이상"), 10);
    var need = o.safety || page.safety || [], sb = blocks.filter(function (b) { return b.type === "safety"; })[0];
    var rows = sb ? parseLines(sb.body).map(function (r) { return nk(r[0]); }) : [];
    var missSafe = need.filter(function (k) { var n = nk(k); return !rows.some(function (r) { return r && (r.indexOf(n) !== -1 || n.indexOf(r) !== -1); }); });
    var label = page.safetyLabel || "권장 항목";
    add(missSafe.length === 0, missSafe.length ? "안심 정보(" + label + ")에 빠진 것: " + missSafe.join(", ") : "안심 정보 " + label + "이 다 있어요", Math.min(12, 3 * missSafe.length));
    // 위험 표현: 경고(warn)는 5점, 확인(check)은 2점씩 — 인증·할인 표시처럼 사실이면 괜찮은 말은 덜 깎는다
    var hits = o.scan ? o.scan(pageText(page)) : [], hitN = 0, hitPen = 0;
    hits.forEach(function (h) { var n = (h.matches && h.matches.length) || 1; hitN += n; hitPen += n * (h.level === "check" ? 2 : 5); });
    add(hitN === 0, hitN ? "걸릴 수 있는 표현 " + hitN + "곳 — 광고 문구 점검 도구로 확인하세요" : "질병 효능·최상급·'무' 표현처럼 걸릴 수 있는 표현이 없어요", Math.min(20, hitPen));
    var longN = longSentences(pageText(page)).length;
    add(longN === 0, longN ? "한 문장이 40자를 넘는 곳 " + longN + "개 — 휴대폰에서 끊어 읽히게 나누세요" : "한 문장이 40자를 넘는 곳이 없어요", Math.min(10, 2 * longN));
    var exB = exampleBlocks(page);
    add(exB.length === 0, exB.length ? "예시 문구가 그대로인 블록 " + exB.length + "개 — 후기·숫자·대표 이야기는 반드시 내 사실로 바꾸세요" : "예시 문구가 남은 블록이 없어요", Math.min(40, 8 * exB.length));
    var emptyB = blocks.filter(function (b) { return b.type !== "gap" && !hasContent(b); });
    add(emptyB.length === 0, emptyB.length ? "아직 비어 있는 블록 " + emptyB.length + "개 — 회색 예시 자리에 내 내용을 적으세요" : "빈 블록이 없어요", Math.min(10, 2 * emptyB.length));
    var photoB = blocks.filter(function (b) { return b.type !== "hero" && BLOCKS[b.type].images > 0 && !b.images.length; });
    add(photoB.length === 0, photoB.length ? "사진 자리가 비어 있는 블록: " + photoB.map(function (b) { return b.title || BLOCKS[b.type].name; }).join(", ") : "사진 블록에 사진이 다 있어요", Math.min(9, 3 * photoB.length));
    var aiN = blocks.filter(function (b) { return b.ai && b.images.length; }).length;
    add(null, aiN ? "연출·AI 이미지로 표기한 사진 " + aiN + "장" : "연출·AI 이미지로 표기한 사진 없음", 0);
    // 휴대폰 한 화면 ≈ 폭 860px 기준 900px (원조 조립 도구의 실측 비율: 6,424px ≈ 7번)
    if (o.height) { var scrolls = Math.round(o.height / 900); add(scrolls >= 20 && scrolls <= 30 ? true : null, "휴대폰 화면으로 약 " + scrolls + "장 분량 — 20~30장이면 알맞아요" + (scrolls < 20 ? " (사진·설명을 더)" : scrolls > 30 ? " (줄이세요)" : ""), 0); }
    var score = Math.max(0, 100 - penalty);
    return { score: score, verdict: score >= 90 ? "올려도 좋아요" : score >= 70 ? "거의 됐어요 — 몇 군데만" : "핵심부터 채우세요", items: items };
  }

  function slices(total, h) {
    if (!(h > 0) || total <= h) return [[0, total]];
    var out = []; for (var y = 0; y < total; y += h) out.push([y, Math.min(total, y + h)]); return out;
  }
  function serialize(page) {
    return JSON.stringify({ v: 1, template: page.template, theme: page.theme, fontSize: page.fontSize, blocks: page.blocks.map(function (b) {
      var o = { type: b.type, ai: !!b.ai, images: (b.images || []).map(function (im) { return { src: im.src, w: im.w, h: im.h }; }) };
      STR.forEach(function (k) { o[k] = b[k] || ""; }); return o;
    }) });
  }
  // 작업 파일 읽기 — 아는 종류·아는 칸만, 사진은 data:image 만. 하나라도 모르는 블록 종류면 통째로 거부(다른 파일을 잘못 연 것)
  function parse(json, data) {
    var o; try { o = JSON.parse(json); } catch (e) { return null; }
    if (!o || typeof o !== "object" || !Array.isArray(o.blocks)) return null;
    var tpls = (data && data.templates) || [], tpl = tpls.filter(function (t) { return t.id === o.template; })[0];
    var blocks = [];
    for (var i = 0; i < Math.min(o.blocks.length, MAX_BLOCKS); i++) {
      var x = o.blocks[i], b = x && newBlock(x.type);
      if (!b) return null;
      STR.forEach(function (k) { b[k] = s(x[k], k === "body" ? MAX_BODY : MAX_TEXT); });
      b.ai = !!x.ai;
      b.images = (Array.isArray(x.images) ? x.images : []).filter(function (im) { return im && typeof im.src === "string" && /^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(im.src) && im.src.length <= MAX_SRC; })
        .slice(0, BLOCKS[b.type].images).map(function (im) { return { src: im.src, w: Number(im.w) || 0, h: Number(im.h) || 0 }; });
      if (tpl && tpl.blocks[i] && tpl.blocks[i].type === b.type) b.example = fromTemplate(tpl, data).blocks[i].example;
      blocks.push(b);
    }
    return { template: tpl ? tpl.id : "", theme: theme(o.theme).id, fontSize: o.fontSize === 1.15 ? 1.15 : 1, safety: tpl ? (tpl.safety || []).slice() : [], safetyLabel: tpl ? (tpl.safetyLabel || "권장 항목") : "권장 항목", blocks: blocks, truncated: o.blocks.length > MAX_BLOCKS };
  }
  function toText(page) {
    var out = [];
    (page.blocks || []).forEach(function (b) {
      if (b.type === "gap") return;
      var head = b.type === "hero" ? "[첫 화면]" : "[" + (b.title || BLOCKS[b.type].name) + "]", lines = [head];
      ["headline", "sub", "proof", "cta", "badTitle", "goodTitle", "button"].forEach(function (k) { if (b[k]) lines.push(b[k]); });
      if (b.body) lines.push(b.body);
      out.push(lines.join("\n"));
    });
    return out.join("\n\n");
  }
  return { MAX_TEXT: MAX_TEXT, MAX_BODY: MAX_BODY, MAX_IMAGES: MAX_IMAGES, MAX_BLOCKS: MAX_BLOCKS, STR: STR, BLOCKS: BLOCKS, THEMES: THEMES, theme: theme, isType: isType, newBlock: newBlock, fromTemplate: fromTemplate,
    parseLines: parseLines, textOf: textOf, pageText: pageText, hasContent: hasContent, longSentences: longSentences, exampleBlocks: exampleBlocks, quality: quality, slices: slices, serialize: serialize, parse: parse, toText: toText };
});

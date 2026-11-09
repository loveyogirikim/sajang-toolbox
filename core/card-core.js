/* 카드뉴스 세트(1~7장) — 내용 정리·유형·캡션·작업 파일·전략 지시문·AI 답 읽기·글자 꾸미기·ZIP 묶음·제작 기록 (브라우저·node 테스트 겸용). 그리기는 apps/card.js. DOM을 만지지 않는다.
 * 사장님 지시(2026-10-01): 외부 카드뉴스 공장 연결 대신 도구함 안에서 바로 만든다 → 같은 날 "이미지 한 장에서 5장까지".
 * 2026-10-04 사장님 승인: 전략 단계(타깃→앵글 3개→퍼널·CTA→카드 7장)를 복사-붙여넣기 방식으로 — AI 호출·API 키 없음, 이 도구는 지시문을 만들고 답을 읽기만 한다.
 * 색표는 NoticeCore.THEMES 한 벌만 쓴다(사본 없음 — 사후 검수 하9). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CardCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var MAX_CARDS = 7, MAX_ITEMS = 6, MAX_NUMBERS = 3, MAX_QUOTE = 120, MAX_TEXT = 300, MAX_TITLE_LINES = 4, MAX_LINE = 60, MAX_NUM = 20, MAX_BODY = 2000;
  var MAX_LOGO_BYTES = 10 * 1024 * 1024, MAX_WORK_BYTES = 1024 * 1024, MIN_SCALE = 0.7;
  var TYPES = [
    { id: "title", name: "제목형", titleLabel: "제목", bodyLabel: "본문", hint: "(선택) 제목 아래 짧은 설명 — 4줄·300자까지 들어가요", placeholder: "예: 이번 주부터 점심 예약을 받습니다. 카톡으로 시간과 인원만 보내 주세요." },
    { id: "list", name: "목록형", titleLabel: "제목", bodyLabel: "목록", hint: "한 줄에 하나, 3~5줄이 읽기 좋아요 (최대 6줄, 한 줄 20자 안팎 — 60자에서 잘려요)", placeholder: "예: 줄 안 서는 집\n8분 안에 나오는 집\n혼자 앉는 자리가 있는 집" },
    { id: "numbers", name: "숫자형", titleLabel: "제목", bodyLabel: "숫자", hint: "한 줄에 '숫자|설명' (최대 3줄, 숫자 20자·설명 60자) — 사실만, 기준일과 함께", placeholder: "예: 2021년|개업, 매일 아침 면 뽑기\n8분|주문 뒤 평균 (2026-09 자체 측정)" },
    { id: "quote", name: "인용형", titleLabel: "말한 사람", bodyLabel: "한 문장", hint: "크게 들어갈 한 문장 (120자까지). 위 칸엔 누가 한 말인지 (선택)", placeholder: "예: 점심 15분, 국물까지 비우고 돌아가요" }
  ];
  var TONES = [{ id: "dark", name: "진한 배경" }, { id: "light", name: "밝은 배경" }];
  var SIZES = { square: { name: "정사각 1:1 (1080×1080)", w: 1080, h: 1080 }, portrait: { name: "세로 4:5 (1080×1350)", w: 1080, h: 1350 } };
  var KINDS = [{ id: "general", name: "일반" }, { id: "food", name: "음식·식품" }];
  // 글자 꾸미기 — 장마다 글 층(꼬리표·제목·부제·본문)별 크기·굵기·색 + 글 덩어리의 세로 위치.
  // ponytail: 색은 테마에서 나온 3가지만(아무 색이나 고르면 바탕과 안 보이는 카드가 저장된다), 위치는 끌어 놓기 대신 위·가운데·아래 — 넘침 판정이 그대로 통하게.
  var LAYERS = [{ id: "kicker", name: "꼬리표" }, { id: "title", name: "제목" }, { id: "sub", name: "부제" }, { id: "body", name: "본문" }];
  var LAYER_SIZES = [{ id: "0.85", name: "글자 작게" }, { id: "1", name: "보통 크기" }, { id: "1.15", name: "글자 크게" }, { id: "1.3", name: "아주 크게" }];
  var WEIGHTS = [{ id: "", name: "기본 굵기" }, { id: "500", name: "얇게" }, { id: "800", name: "굵게" }];
  var COLORS = [{ id: "", name: "기본 색" }, { id: "hi", name: "강조색" }, { id: "sub", name: "흐린 색" }];
  var POSITIONS = [{ id: "middle", name: "가운데 배치" }, { id: "top", name: "위로 배치" }, { id: "bottom", name: "아래로 배치" }];
  var FUNNELS = ["인지", "고려", "구매"], MAX_ANGLES = 3, MAX_SOURCE = 6000, MAX_TOPIC = 80, MAX_ANSWER = 60000;
  // 가상 예시 — 실재 가게·계정 아님. 숫자에는 기준일, 지어낸 사실에는 (예시) 표시.
  var EXAMPLE = {
    brand: "골목 국수 (가상 예시)", handle: "@example_noodle",
    cards: [
      { type: "title", kicker: "사장님 노트", title: "점심 15분, 국물까지 비우고 가는 법", sub: "줄 안 서는 동네 국수집 이용 팁", body: "세 가지만 알면 점심시간이 편해져요.\n다음 장에서 하나씩 볼게요." },
      { type: "list", kicker: "하나씩", title: "줄 안 서는 세 가지", sub: "", body: "카톡으로 시간과 인원만 보내기\n1인석은 바로 안내\n국수는 주문 뒤 8분 (2026-09 자체 측정, 예시)\n면 리필은 무료 (예시)" },
      { type: "numbers", kicker: "숫자로", title: "숫자로 보는 골목 국수", sub: "", body: "2021년|개업 (가상 예시)\n8분|주문 뒤 평균 (2026-09 자체 측정, 예시)" },
      { type: "quote", kicker: "", title: "단골 손님 (가상)", sub: "", body: "점심 15분, 국물까지 비우고 돌아가요" }
    ]
  };

  function clean(v, max) { return String(v == null ? "" : v).normalize("NFKC").replace(/[ \t]+/g, " ").trim().slice(0, max || MAX_TEXT); }
  function str(v, max) { return typeof v === "string" || typeof v === "number" ? clean(v, max) : ""; }
  function lines(v) { return String(v == null ? "" : v).normalize("NFKC").split(/\r?\n/).map(function (l) { return clean(l, MAX_BODY); }).filter(Boolean); }
  function type(id) { return TYPES.filter(function (t) { return t.id === id; })[0] || TYPES[0]; }
  function pick(v, list, def) { return typeof v === "string" && list.indexOf(v) >= 0 ? v : def; }

  function ids(list) { return list.map(function (x) { return x.id; }); }
  // 꾸미기 값 정리 — 모르는 값은 기본으로. 기본값만 남으면 null(작업 파일·비교를 가볍게)
  function style(v) {
    var o = v && typeof v === "object" && !Array.isArray(v) ? v : {}, out = { pos: pick(o.pos, ids(POSITIONS), "middle") }, any = out.pos !== "middle";
    LAYERS.forEach(function (l) {
      var x = o[l.id] && typeof o[l.id] === "object" ? o[l.id] : {}, sz = typeof x.size === "number" || typeof x.size === "string" ? String(x.size) : "1"; // 객체면 String()이 터진다 (기술 하3)
      var y = { size: pick(sz, ids(LAYER_SIZES), "1"), weight: pick(x.weight, ids(WEIGHTS), ""), color: pick(x.color, ids(COLORS), "") };
      if (y.size !== "1" || y.weight || y.color) { out[l.id] = y; any = true; }
    });
    return any ? out : null;
  }
  function layerStyle(st, id) { var y = st && st[id]; return { size: y ? Number(y.size) : 1, weight: y ? y.weight : "", color: y ? y.color : "" }; }

  function newCard(t) { return { type: type(t).id, kicker: "", title: "", sub: "", body: "" }; }
  function newSet() { return { theme: "indigo", tone: "dark", size: "square", kind: "general", brand: "", handle: "", cards: [newCard("list")] }; }

  // 장 하나 → 그릴 내용. 유형에 따라 본문을 목록·숫자·문장으로 나누고, 잘리거나 빠진 것을 note로 알린다.
  function blocks(card, set) {
    var o = card || {}, s = set || o, t = type(o.type), ls = lines(o.body), notes = [], cut = 0, n;
    var b = { type: t.id, kicker: clean(o.kicker, 20), title: clean(o.title, 40), sub: clean(o.sub, 60), brand: clean(s.brand, 30), handle: clean(s.handle, 40), items: [], text: "", dropped: { lines: 0, chars: 0 }, note: "", style: style(o.style) };
    if (t.id === "list") {
      b.items = ls.slice(0, MAX_ITEMS).map(function (l) { if (l.length > MAX_LINE) { cut++; b.dropped.chars += l.length - MAX_LINE; } return l.slice(0, MAX_LINE); });
      b.dropped.lines = Math.max(0, ls.length - MAX_ITEMS);
      if (b.dropped.lines) notes.push("목록 " + b.items.length + "/" + ls.length + "줄 (" + b.dropped.lines + "줄 빠짐)");
      if (cut) notes.push("한 줄 " + MAX_LINE + "자에서 잘린 줄 " + cut + "개");
    } else if (t.id === "numbers") {
      var kept = ls.slice(0, MAX_NUMBERS), odd = 0;
      b.items = kept.map(function (l) {
        var p = l.split("|"), rawNum = clean(p[0], MAX_BODY), rawText = clean(p.slice(1).join("|"), MAX_BODY), num = rawNum.slice(0, MAX_NUM), text = rawText.slice(0, MAX_LINE);
        var lost = (rawNum.length - num.length) + (rawText.length - text.length);
        if (p.length < 2 && rawNum.length > MAX_NUM) odd++; else if (lost) cut++;
        b.dropped.chars += lost;
        return { num: num, text: text };
      });
      b.dropped.lines = ls.length - kept.length;
      if (b.dropped.lines) notes.push("숫자 " + kept.length + "/" + ls.length + "줄 (" + b.dropped.lines + "줄 빠짐)");
      if (odd) notes.push("'숫자|설명' 꼴이 아닌 줄 " + odd + "개 — 앞 " + MAX_NUM + "자만 큰 숫자로 들어가요");
      if (cut) notes.push("숫자 " + MAX_NUM + "자·설명 " + MAX_LINE + "자에서 잘린 줄 " + cut + "개");
    } else if (t.id === "quote") {
      var full = ls.join(" "); b.text = full.slice(0, MAX_QUOTE); b.dropped.chars = full.length - b.text.length;
      if (b.dropped.chars) notes.push("한 문장 " + MAX_QUOTE + "자에서 잘림 (" + b.dropped.chars + "자 빠짐)");
    } else {
      var keptT = ls.slice(0, MAX_TITLE_LINES), joined = keptT.join("\n"); b.text = joined.slice(0, MAX_TEXT);
      b.dropped.lines = ls.length - keptT.length; b.dropped.chars = joined.length - b.text.length;
      if (b.dropped.lines) notes.push("본문 " + MAX_TITLE_LINES + "줄까지 — " + b.dropped.lines + "줄 빠짐");
      if (b.dropped.chars) notes.push("본문 " + MAX_TEXT + "자에서 잘림 (" + b.dropped.chars + "자 빠짐)");
    }
    n = notes.length; b.note = n ? notes.join(" · ") : "";
    return b;
  }

  // 저장하려면 꼭 있어야 하는 칸 — 자리 표시 글자("카드 제목"·"인용할 한 문장")가 이미지에 찍히지 않게
  function missing(card) { var b = blocks(card); if (b.type === "quote") return b.text ? "" : "한 문장"; return b.title ? "" : "제목"; }
  // AI가 붙인 [확인 필요]가 남은 장 — 확인하고 지우기 전엔 저장·복사하지 않는다 (2026-10-04 콘텐츠 검수 중3)
  function needsCheck(card) { var c = card || {}; return /[\[(（［]\s*확인\s*필요\s*[\])）］]/.test([c.kicker, c.title, c.sub, c.body].join("\n")); }
  function isEmpty(card) { var b = blocks(card); return !b.title && !b.text && !b.items.length; }

  function cardCaption(b) {
    var out = [];
    if (b.type === "quote") { if (b.text) out.push(b.text); if (b.title) out.push("— " + b.title); return out; }
    if (b.title) out.push(b.title);
    if (b.sub) out.push(b.sub);
    if (b.type === "list") b.items.forEach(function (it) { out.push("- " + it); });
    else if (b.type === "numbers") b.items.forEach(function (it) { out.push(it.num + (it.text ? " " + it.text : "")); });
    else if (b.text) out.push(b.text);
    return out;
  }
  // 인스타·카톡에 붙일 캡션 — 장 순서대로, 빈 장은 건너뛰고, 가게 이름 · 채널은 끝에 한 번
  function caption(set) {
    var s = set || {}, parts = [], first = null;
    (Array.isArray(s.cards) ? s.cards : []).forEach(function (c) { var b = blocks(c, s), p = cardCaption(b); if (!first) first = b; if (p.length) parts.push(p.join("\n")); });
    if (!parts.length) return "";
    var foot = first ? [first.brand, first.handle].filter(Boolean).join(" · ") : "";
    return parts.join("\n\n") + (foot ? "\n\n" + foot : "");
  }
  function fileName(set, i) {
    var cards = set && Array.isArray(set.cards) ? set.cards : [], n = cards.length;
    var t = clean(cards[0] && cards[0].title, 40).replace(/[\\/:*?"<>|\s\p{C}]/gu, ""); // 제어 문자도 (2026-10-04 재검수)
    return "카드뉴스" + (t ? "_" + t.slice(0, 30) : "") + (n > 1 ? "_" + ((i || 0) + 1) + "of" + n : "");
  }

  // 작업 파일 — 기기에 저장하지 않고 내려받기만. 로고는 넣지 않는다.
  function serialize(set) {
    var s = set || {};
    var o = { v: 1, theme: s.theme, tone: s.tone, size: s.size, kind: s.kind, brand: s.brand, handle: s.handle,
      cards: (s.cards || []).map(function (c) { var x = { type: c.type, kicker: c.kicker, title: c.title, sub: c.sub, body: c.body }, st = style(c.style); if (st) x.style = st; return x; }) };
    var pl = plan(s.plan); if (pl) o.plan = pl;
    return JSON.stringify(o, null, 1);
  }
  // 고른 전략 요약(작업 파일·제작 기록용) — 주제·타깃·고민·키워드·앵글·퍼널·CTA. 비면 null
  function plan(v) {
    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    var p = { topic: str(v.topic, MAX_TOPIC), target: str(v.target, 80), pain: str(v.pain, 120), core: words(v.core), search: words(v.search),
      angle: str(v.angle, 40), funnel: FUNNELS.indexOf(v.funnel) >= 0 ? v.funnel : "", cta: str(v.cta, 60) };
    var ser = str(v.series, 40), no = parseInt(v.episode, 10); // 시리즈 회차에서 만든 세트만
    if (ser && no >= 1 && no <= MAX_EPISODES) { p.series = ser; p.episode = no; }
    return p.topic || p.target || p.angle ? p : null;
  }
  function words(v) { return (Array.isArray(v) ? v : typeof v === "string" ? v.split(/[,\n·]/) : []).map(function (w) { return str(w, 20); }).filter(Boolean).slice(0, 8); }
  function parse(json, themes) {
    var o; try { o = JSON.parse(json); } catch (e) { return null; }
    // 표식 v=1 + 장 배열(객체만)이어야 우리 작업 파일 — 남의 JSON을 "열었어요"로 받지 않는다 (재검수 중-N2)
    if (!o || typeof o !== "object" || o.v !== 1 || !Array.isArray(o.cards) || !o.cards.length) return null;
    if (!o.cards.every(function (c) { return c && typeof c === "object" && !Array.isArray(c); })) return null;
    var out = {
      theme: pick(o.theme, themes || ["indigo"], "indigo"), tone: pick(o.tone, TONES.map(function (t) { return t.id; }), "dark"),
      size: pick(o.size, Object.keys(SIZES), "square"), kind: pick(o.kind, KINDS.map(function (k) { return k.id; }), "general"),
      brand: str(o.brand, 30), handle: str(o.handle, 40),
      cards: o.cards.slice(0, MAX_CARDS).map(function (c) { var x = { type: type(c.type).id, kicker: str(c.kicker, 20), title: str(c.title, 40), sub: str(c.sub, 60), body: str(c.body, MAX_BODY) }, st = style(c.style); if (st) x.style = st; return x; }),
      truncated: o.cards.length > MAX_CARDS
    };
    var pl = plan(o.plan); if (pl) out.plan = pl;
    return out;
  }

  // ── 전략 단계: 지시문 만들기 → (사용자가 아무 AI에 붙여 넣음) → 답 읽기 → 앵글 고르기 ──
  // ponytail: 한 번 왕복으로 앵글 3개 × 카드 N장을 다 받는다(앵글 고른 뒤 두 번째 왕복 없음 — 붙여넣기 횟수를 줄이려고). 앵글을 바꾸면 곧바로 카드가 바뀐다.
  // 가게 카드 글(ProfileCore.toText — 빈 칸은 [확인 필요])을 지시문에 그대로 넣는다. 없으면 없다고 말해 AI가 가게 사정을 지어내지 않게.
  function profileBlock(L, profileText) {
    var t = String(profileText == null ? "" : profileText).normalize("NFKC").trim().slice(0, 5000);
    L.push("");
    if (t) { L.push("가게 정보(이 안의 사실만 근거로 써. [확인 필요]인 칸은 모르는 것이니 지어내지 마):"); L.push("<<<"); L.push(t); L.push(">>>"); }
    else L.push("가게 정보: (없음 — 가게 사정·가격·이력은 지어내지 말고 필요하면 [확인 필요])");
  }
  // 사실·표현 규칙 — 한 편·회차·시리즈 지시문이 함께 쓴다. 효능·사실 금지는 업종과 상관없이 (2026-10-04 콘텐츠 검수 중2)
  function factRules(L, food) {
    L.push("- 주제·가게 정보·원문에 없는 사실(가격·할인·기간·무료 여부·원산지·인증·수상·재료)은 지어내지 마. 꼭 필요하면 그 문장 끝에 [확인 필요]라고 붙여.");
    L.push("- '최고', '1위', '100%', '무조건' 같은 단정 표현, 남의 가게와 비교하는 표현, 병을 낫게 한다·예방한다 같은 효능 표현은 쓰지 마." + (food ? " 식품이니 특히 효능·'무첨가' 표현, 잠·수면·피로·다이어트처럼 몸에 미치는 효과를 암시하는 말도 쓰지 마." : "")); // 실제 AI가 '잠 걱정 덜고'를 썼다 (2026-10-04 콘텐츠 검수 하3)
    L.push("- CTA로 댓글에 전화번호·주소 같은 개인정보를 남기게 하지 마.");
    L.push("- 이모지는 쓰지 마.");
  }
  // 한 편(앵글 3개) 또는 시리즈의 한 회차(opts.episode — 주제·앵글·퍼널·CTA 고정, 앵글 1개)
  function strategyPrompt(opts) {
    var o = opts || {}, ep = o.episode && typeof o.episode === "object" ? o.episode : null, sr = o.series || {};
    var topic = ep ? clean(ep.title, MAX_TOPIC) : clean(o.topic, MAX_TOPIC), source = String(o.source == null ? "" : o.source).normalize("NFKC").trim().slice(0, MAX_SOURCE);
    var n = Math.max(3, Math.min(MAX_CARDS, parseInt(o.count, 10) || MAX_CARDS)), brand = clean(o.brand, 30), food = o.kind === "food";
    var L = [];
    L.push("너는 소상공인 SNS 카드뉴스 기획자야. 아래 " + (ep ? "연재의 한 회차" : "주제") + "로 인스타그램 카드뉴스 전략과 카드 문구를 만들어 줘.");
    L.push("");
    if (ep) L.push("연재: " + (clean(sr.name, 40) || "카드뉴스 연재") + " — " + ep.no + "회" + (sr.episodes ? " (전체 " + sr.episodes.length + "회)" : ""));
    L.push("주제: " + (topic || "(아래 원문에서 핵심 주제를 직접 뽑아 줘)"));
    if (brand) L.push("가게·브랜드 이름: " + brand);
    profileBlock(L, o.profileText);
    if (source) { L.push(""); L.push("원문(이 안에 있는 사실만 근거로 써):"); L.push("<<<"); L.push(source); L.push(">>>"); }
    L.push("");
    L.push("할 일");
    L.push("1. 이 주제에 관심 가질 사람(타깃)을 한 문장으로, 그 사람의 고민을 한 문장으로 정리해.");
    L.push("2. 핵심 키워드 3~5개, 사람들이 검색창에 칠 만한 검색 키워드 3~5개를 뽑아.");
    if (ep) {
      L.push("3. 앵글은 하나만 — 앵글 이름: " + clean(ep.angle, 40) + " / 퍼널: " + (ep.funnel || "인지") + " / cta: " + clean(ep.cta, 60) + " (이 셋은 바꾸지 말고 그대로 써).");
      L.push("4. 그 앵글로 카드 " + n + "장을 써. 1장은 손님이 얻는 것을 말하는 제목형, " + n + "번째 마지막 장은 title에 cta를 글자 하나 바꾸지 말고 그대로 넣어.");
      // 연재표도 AI가 지은 것 — 회차 주제·CTA를 근거로 넘기면 지어낸 할인·기간이 굳는다 (2026-10-04 콘텐츠 검수 중1)
      L.push("5. 위 주제·앵글·cta는 연재 계획일 뿐 사실 근거가 아니야. 그 안에 든 가격·할인·기간·무료 같은 사실이 가게 정보에 없으면 카드에서는 빼거나 그 문장 끝에 [확인 필요]를 붙여(cta 장도 마찬가지).");
    } else {
      L.push("3. 서로 다른 앵글(이야기 각도) 3개를 만들어. 앵글마다 퍼널 단계를 하나씩 맡겨 — 인지(처음 알게 하기), 고려(비교·이유 주기), 구매(지금 행동하게 하기).");
      L.push("4. 앵글마다 카드 " + n + "장을 써. 1장은 손님이 얻는 것을 말하는 제목형, " + n + "번째 마지막 장은 title에 그 앵글의 cta(행동 유도 문구)를 글자 하나 바꾸지 말고 그대로 넣어.");
    }
    L.push("");
    L.push("카드 규칙");
    L.push("- type은 title(제목형)·list(목록형)·numbers(숫자형)·quote(인용형) 중 하나.");
    L.push("- kicker는 12자 안팎, title은 24자 안팎(최대 40자), sub는 40자 안팎.");
    L.push("- list의 body는 줄바꿈(\\n)으로 3~5줄, 한 줄 20자 안팎.");
    L.push("- numbers의 body는 줄마다 '숫자|설명' 꼴, 최대 3줄. 가게 정보·원문·주제에 없는 숫자는 쓰지 말고, 쓸 숫자가 없으면 numbers를 쓰지 마.");
    L.push("- quote는 가게 정보·원문에 실제 손님 말이 있을 때만. 없으면 쓰지 마. 후기·평점·판매량을 지어내지 마.");
    factRules(L, food);
    L.push("");
    L.push("답은 설명 없이 아래 JSON 하나만 보내 줘.");
    L.push(JSON.stringify({ topic: "주제", target: "타깃 한 문장", pain: "고민 한 문장", core: ["핵심 키워드"], search: ["검색 키워드"],
      angles: [{ title: "앵글 이름", funnel: "인지", cta: "행동 유도 문구", cards: [{ type: "title", kicker: "", title: "", sub: "", body: "" }] }] }, null, 1));
    return L.join("\n");
  }

  // ── 시리즈(연재표): 가게 정보 → 8회(4~12) 회차별 주제·앵글·퍼널·CTA. 회차마다 위 strategyPrompt({episode})로 카드를 받는다 ──
  // 2026-10-04 사장님 지시 "시리즈 먼저, 8회로, 가게나 회사 정보를 입력받아서". 연재표는 기기에 저장하지 않고 파일로 내려받는다(FACTORY 1절 저장 규칙).
  var MAX_EPISODES = 12, MIN_EPISODES = 4, DEF_EPISODES = 8;
  function seriesPrompt(opts) {
    var o = opts || {}, n = Math.max(MIN_EPISODES, Math.min(MAX_EPISODES, parseInt(o.count, 10) || DEF_EPISODES)), goal = clean(o.goal, 120), food = o.kind === "food";
    var buy = Math.max(1, Math.round(n / 4)), think = Math.round((n - buy) / 2), know = n - buy - think;
    var L = [];
    L.push("너는 소상공인 SNS 카드뉴스 연재 기획자야. 아래 가게 정보로 인스타그램 카드뉴스 " + n + "회 연재표를 짜 줘.");
    if (goal) { L.push(""); L.push("이번 달 목표: " + goal); }
    profileBlock(L, o.profileText);
    L.push("");
    L.push("할 일");
    L.push("1. 이 가게의 손님(타깃)을 한 문장으로, 그 손님의 고민을 한 문장으로 정리해.");
    L.push("2. 핵심 키워드 3~5개, 검색 키워드 3~5개를 뽑아.");
    L.push("3. " + n + "회 연재표를 짜. 회차마다 주제(title, 24자 안팎)·앵글(angle, 이야기 각도를 15자 안팎 짧은 이름으로)·퍼널(funnel)·CTA(cta, 30자 안팎)를 정해.");
    L.push("4. 퍼널은 인지(처음 알게 하기) " + know + "회 → 고려(비교·이유 주기) " + think + "회 → 구매(지금 행동하게 하기) " + buy + "회 순서로 섞어. 회차끼리 주제가 겹치지 않게.");
    L.push("5. 연재 이름(series)을 20자 안팎으로 지어.");
    L.push("");
    L.push("규칙");
    factRules(L, food);
    L.push("");
    L.push("답은 설명 없이 아래 JSON 하나만 보내 줘. episodes는 " + n + "개.");
    L.push(JSON.stringify({ series: "연재 이름", target: "타깃 한 문장", pain: "고민 한 문장", core: ["핵심 키워드"], search: ["검색 키워드"],
      episodes: [{ no: 1, title: "회차 주제", angle: "앵글", funnel: "인지", cta: "행동 유도 문구" }] }, null, 1));
    return L.join("\n");
  }
  function episode(e, i) {
    var f = str(e.funnel, 10).replace(/\s/g, "");
    return { no: i + 1, title: str(e.title, 40), angle: str(e.angle, 40), funnel: funnelOf(f), cta: str(e.cta, 60), done: e.done === true };
  }
  function seriesOf(o, keepDone) {
    var list = (Array.isArray(o.episodes) ? o.episodes : []).filter(function (e) { return e && typeof e === "object" && !Array.isArray(e) && str(e.title, 40); });
    return { name: str(o.series != null ? o.series : o.name, 40) || "카드뉴스 연재", target: str(o.target, 80), pain: str(o.pain, 120), core: words(o.core), search: words(o.search),
      episodes: list.slice(0, MAX_EPISODES).map(function (e, i) { var x = episode(e, i); if (!keepDone) x.done = false; return x; }), total: list.length };
  }
  function parseSeries(text) {
    try {
      var raw = String(text == null ? "" : text).slice(0, MAX_ANSWER).trim();
      if (!raw) return { ok: false, error: "AI 답을 붙여 넣어 주세요" };
      var fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw); if (fence && fence[1].indexOf("{") >= 0) raw = fence[1];
      var a = raw.indexOf("{"), z = raw.lastIndexOf("}"), o;
      if (a < 0 || z <= a) return { ok: false, error: "답에 JSON이 없어요 — AI에게 \"설명 없이 JSON만 다시 보내 줘\"라고 해 보세요" };
      try { o = JSON.parse(raw.slice(a, z + 1)); } catch (e) { return { ok: false, error: "JSON 형식이 깨졌어요(답이 중간에 끊겼을 수 있어요) — AI에게 \"설명 없이 JSON만 처음부터 다시\"라고 해 보세요" }; }
      if (!o || typeof o !== "object") return { ok: false, error: "연재표(episodes)가 없어요" };
      var s = seriesOf(o, false), warnings = [];
      if (!s.episodes.length) return { ok: false, error: "연재표(episodes)가 비어 있어요 — 시리즈 지시문을 그대로 붙여 넣었는지 확인하세요" };
      if (s.total > MAX_EPISODES) warnings.push(s.total + "회 중 " + MAX_EPISODES + "회만 썼어요");
      delete s.total;
      return { ok: true, series: s, warnings: warnings };
    } catch (e) { return { ok: false, error: "답을 읽다 멈췄어요 — AI에게 \"지시문의 JSON 꼴 그대로 다시\"라고 해 보세요" }; }
  }
  function serializeSeries(s) { return JSON.stringify({ v: 1, kind: "card-series", series: s }, null, 1); }
  function parseSeriesFile(json) {
    var o; try { o = JSON.parse(json); } catch (e) { return null; }
    if (!o || o.v !== 1 || o.kind !== "card-series" || !o.series || typeof o.series !== "object") return null;
    var s = seriesOf(o.series, true); delete s.total;
    return s.episodes.length ? s : null;
  }
  // 회차 → 작업 파일·제작 기록용 요약
  // 퍼널 글자 — 처음 나오는 단계("고려→인지"는 고려, 목록 순서가 아니라 글자 순서 — 2026-10-04 기술 검수 정보)
  function funnelOf(f) { var best = "", at = -1; FUNNELS.forEach(function (x) { var i = String(f || "").indexOf(x); if (i >= 0 && (at < 0 || i < at)) { at = i; best = x; } }); return best; }
  // 지금 세트가 이 연재표의 어느 회차에서 왔나 — 연재 이름·회차 번호·회차 주제가 모두 맞아야 (같은 이름의 다른 연재표나 이름 없는 연재표끼리 완료 표시가 옮겨 붙지 않게, 2026-10-04 기술 검수 중1)
  function episodeOf(s, p) {
    if (!s || !p || !p.series || p.series !== s.name) return null;
    return (s.episodes || []).filter(function (e) { return e.no === p.episode && e.title === p.topic; })[0] || null;
  }
  function seriesFileName(s) { return "카드뉴스_연재표_" + String(s && s.name || "").replace(/[\\/:*?"<>|\s\p{C}]/gu, "").slice(0, 30) + ".json"; }
  function episodePlan(s, i) {
    var e = (s && s.episodes || [])[i]; if (!e) return null;
    return plan({ series: s.name, episode: e.no, topic: e.title, target: s.target, pain: s.pain, core: s.core, search: s.search, angle: e.angle, funnel: e.funnel, cta: e.cta });
  }

  // AI 답(앞뒤 설명·```json 울타리가 붙어 있어도 됨)을 읽어 정리한다. 실패하면 사람이 고칠 수 있게 무엇이 틀렸는지 말한다.
  function parseStrategy(text) {
    try { return readStrategy(text); } catch (e) { return { ok: false, error: "답을 읽다 멈췄어요(구조가 너무 깊거나 이상해요) — AI에게 \"지시문의 JSON 꼴 그대로 다시\"라고 해 보세요" }; } // 깊게 겹친 값 RangeError 등 (기술 하2)
  }
  function readStrategy(text) {
    var raw = String(text == null ? "" : text).slice(0, MAX_ANSWER).trim(), warnings = [];
    if (!raw) return { ok: false, error: "AI 답을 붙여 넣어 주세요" };
    var fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw); if (fence && fence[1].indexOf("{") >= 0) raw = fence[1]; // 울타리 안을 먼저 — 앞뒤 설명의 {}에 속지 않게 (기술 하4)
    var a = raw.indexOf("{"), z = raw.lastIndexOf("}"), o;
    if (a < 0 || z <= a) return { ok: false, error: "답에 JSON이 없어요 — AI에게 \"설명 없이 JSON만 다시 보내 줘\"라고 해 보세요" };
    try { o = JSON.parse(raw.slice(a, z + 1)); } catch (e) { return { ok: false, error: "JSON 형식이 깨졌어요(답이 중간에 끊겼거나 앞뒤 설명에 { }가 섞였을 수 있어요) — AI에게 \"설명 없이 JSON만 처음부터 다시\"라고 해 보세요" }; }
    if (!o || typeof o !== "object" || !Array.isArray(o.angles) || !o.angles.length) return { ok: false, error: "앵글(angles) 목록이 없어요 — 지시문을 그대로 붙여 넣었는지 확인하세요" };
    var angles = [];
    o.angles.slice(0, MAX_ANGLES).forEach(function (g, i) {
      if (!g || typeof g !== "object") return;
      var cards = (Array.isArray(g.cards) ? g.cards : []).filter(function (c) { return c && typeof c === "object" && !Array.isArray(c); });
      if (cards.length > MAX_CARDS) warnings.push((i + 1) + "번 앵글 카드 " + cards.length + "장 중 " + MAX_CARDS + "장만 썼어요");
      cards = cards.slice(0, MAX_CARDS).map(function (c) { var body = Array.isArray(c.body) ? c.body.join("\n") : c.body; return { type: type(c.type).id, kicker: str(c.kicker, 20), title: str(c.title, 40), sub: str(c.sub, 60), body: str(body, MAX_BODY) }; })
        .filter(function (c) { return !isEmpty(c); });
      if (!cards.length) { warnings.push((i + 1) + "번 앵글은 카드가 비어 뺐어요"); return; }
      var f = str(g.funnel, 10).replace(/\s/g, "");
      angles.push({ title: str(g.title, 40) || "앵글 " + (i + 1), funnel: funnelOf(f), cta: str(g.cta, 60), cards: cards });
    });
    if (o.angles.length > MAX_ANGLES) warnings.push("앵글 " + o.angles.length + "개 중 " + MAX_ANGLES + "개만 썼어요");
    if (!angles.length) return { ok: false, error: "카드(cards)가 든 앵글이 없어요 — AI에게 \"앵글마다 cards를 채워서 다시\"라고 해 보세요" };
    return { ok: true, warnings: warnings, strategy: { topic: str(o.topic, MAX_TOPIC), target: str(o.target, 80), pain: str(o.pain, 120), core: words(o.core), search: words(o.search), angles: angles } };
  }

  // 앵글 → 세트에 넣을 카드. CTA가 어느 장에도 없으면 자리가 있을 때 마지막에 CTA 장을 붙이고, 자리가 없으면 알린다(장을 몰래 바꾸지 않는다).
  // opts.check(회차 모드): 덧붙이는 CTA 장에 [확인 필요] — 연재표 CTA도 AI 초안이라, AI가 근거 없어 뺀 CTA가 표시 없이 되살아나면 안 된다 (2026-10-04 재검수 중)
  function angleCards(angle, opts) {
    var g = angle || {}, cards = (g.cards || []).slice(0, MAX_CARDS).map(function (c) { return { type: c.type, kicker: c.kicker, title: c.title, sub: c.sub, body: c.body }; }), note = "";
    var cta = clean(g.cta, 60), flat = function (s) { return String(s || "").replace(/\s/g, ""); }, chk = !!(opts && opts.check);
    if (cta && !cards.some(function (c) { return flat([c.title, c.sub, c.body].join("")).indexOf(flat(cta)) >= 0; })) {
      if (cards.length < MAX_CARDS) cards.push({ type: "title", kicker: "", title: cta.length <= 40 ? cta : "지금 할 일", sub: chk ? "[확인 필요] 연재표의 CTA를 붙였어요 — 사실인지 보고 이 줄을 지우세요" : "", body: cta.length > 40 ? cta : "" });
      else note = "CTA가 카드에 없어요 — 마지막 장에 직접 넣으세요: " + cta;
    }
    return { cards: cards, note: note };
  }
  function planOf(strategy, i, topic) {
    var s = strategy || {}, g = (s.angles || [])[i] || {};
    return plan({ topic: s.topic || topic, target: s.target, pain: s.pain, core: s.core, search: s.search, angle: g.title, funnel: g.funnel, cta: g.cta });
  }

  // ── 제작 기록(엑셀용 CSV 한 줄) — 수식으로 읽힐 수 있는 칸(= + - @로 시작)은 앞에 '를 붙인다 ──
  var RECORD_HEAD = ["제작일", "주제", "타깃", "고민", "핵심 키워드", "검색 키워드(AI 추측)", "앵글", "퍼널", "CTA", "장 수", "장별 제목", "크기", "가게 이름", "시리즈", "회차"];
  function cell(v) { var s = String(v == null ? "" : v).replace(/\r?\n/g, " "); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; }
  function recordRow(set, date) {
    var s = set || {}, p = plan(s.plan) || {}, cards = Array.isArray(s.cards) ? s.cards : [];
    return [date || "", p.topic, p.target, p.pain, (p.core || []).join(", "), (p.search || []).join(", "), p.angle, p.funnel, p.cta, cards.length,
      cards.map(function (c, i) { var b = blocks(c, s); return (i + 1) + ". " + (b.title || b.text || ""); }).join(" / "), (SIZES[s.size] || SIZES.square).name, clean(s.brand, 30), p.series || "", p.episode || ""].map(cell).join(",");
  }
  function recordCsv(set, date) { return "﻿" + RECORD_HEAD.map(cell).join(",") + "\r\n" + recordRow(set, date) + "\r\n"; }

  // ── ZIP 묶음(압축 없이 담기만 — PNG는 이미 압축돼 있다). 새 라이브러리 없이 표준 ZIP 구조를 직접 쓴다. ──
  var CRC_TABLE = (function () { var t = [], c, n, k; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(bytes) { var c = 0xFFFFFFFF; for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function utf8(s) { return new TextEncoder().encode(s); }
  // files: [{ name, data: Uint8Array }], when: Date(파일 시각) → Uint8Array
  function zip(files, when) {
    var d = when instanceof Date && !isNaN(when.getTime()) ? when : new Date(1980, 0, 1);
    var time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date = ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    var parts = [], central = [], offset = 0;
    files.forEach(function (f) {
      var name = utf8(f.name), data = f.data, crc = crc32(data), h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, time, true); h.setUint16(12, date, true);
      h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, time, true); c.setUint16(14, date, true);
      c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
      parts.push(new Uint8Array(h.buffer), name, data); central.push(new Uint8Array(c.buffer), name);
      offset += 30 + name.length + data.length;
    });
    var cdSize = central.reduce(function (n, p) { return n + p.length; }, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cdSize, true); e.setUint32(16, offset, true);
    var all = parts.concat(central, [new Uint8Array(e.buffer)]), out = new Uint8Array(offset + cdSize + 22), at = 0;
    all.forEach(function (p) { out.set(p, at); at += p.length; });
    return out;
  }

  // 본문이 예시 그대로면 제목(말한 사람)을 바꿔도 예시다 — 지어낸 손님 말·숫자가 내 가게 이름으로 나가지 않게 (재검수 하-R2)
  function key(c) { return [type(c && c.type).id, lines(c && c.body).join("\n")].join("\u0001"); }
  function isExampleCard(card) { var k = key(card); return lines(card && card.body).length > 0 && EXAMPLE.cards.some(function (e) { return key(e) === k; }); }

  // 본문 높이 h가 자리 avail을 넘으면 글자를 줄인다 — 0.7 아래로는 줄이지 않고 넘침으로 알린다
  function fit(h, avail) {
    if (!h || h <= avail) return { scale: 1, overflow: false };
    var s = Math.floor(avail / h * 100) / 100; // 내림 — 반올림하면 0.01 크게 잡혀 1~3px 넘친다 (3회차 중 R3)
    if (s >= MIN_SCALE) return { scale: s, overflow: false };
    return { scale: MIN_SCALE, overflow: true };
  }
  // 그라데이션 끝색은 바탕색보다 어둡게 — 흰 글씨 대비가 나빠지지 않게 (사후 검수 하4)
  function shade(hex, k) {
    var m = /^#([0-9a-f]{6})$/i.exec(String(hex || ""));
    if (!m) return hex;
    var n = parseInt(m[1], 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255, f = Math.max(0, 1 - (k || 0));
    function h2(v) { v = Math.max(0, Math.min(255, Math.round(v * f))); return (v < 16 ? "0" : "") + v.toString(16); }
    return "#" + h2(r) + h2(g) + h2(b);
  }

  return { TYPES: TYPES, TONES: TONES, SIZES: SIZES, KINDS: KINDS, EXAMPLE: EXAMPLE,
    LAYERS: LAYERS, LAYER_SIZES: LAYER_SIZES, WEIGHTS: WEIGHTS, COLORS: COLORS, POSITIONS: POSITIONS, FUNNELS: FUNNELS, MAX_SOURCE: MAX_SOURCE, MAX_TOPIC: MAX_TOPIC,
    MAX_CARDS: MAX_CARDS, MAX_ITEMS: MAX_ITEMS, MAX_NUMBERS: MAX_NUMBERS, MAX_QUOTE: MAX_QUOTE, MAX_TEXT: MAX_TEXT, MAX_LOGO_BYTES: MAX_LOGO_BYTES, MAX_WORK_BYTES: MAX_WORK_BYTES,
    type: type, clean: clean, newCard: newCard, newSet: newSet, blocks: blocks, missing: missing, isEmpty: isEmpty, caption: caption, fileName: fileName,
    serialize: serialize, parse: parse, isExampleCard: isExampleCard, fit: fit, shade: shade,
    style: style, layerStyle: layerStyle, needsCheck: needsCheck, plan: plan, strategyPrompt: strategyPrompt, parseStrategy: parseStrategy, angleCards: angleCards, planOf: planOf,
    recordCsv: recordCsv, crc32: crc32, zip: zip,
    MAX_EPISODES: MAX_EPISODES, DEF_EPISODES: DEF_EPISODES, MIN_EPISODES: MIN_EPISODES, seriesPrompt: seriesPrompt, parseSeries: parseSeries, serializeSeries: serializeSeries, parseSeriesFile: parseSeriesFile, episodePlan: episodePlan, episodeOf: episodeOf, seriesFileName: seriesFileName };
});

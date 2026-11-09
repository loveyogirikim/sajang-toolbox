/* 카드뉴스 세트(1~7장) 화면 — 2026-10-04: 1단계 전략(지시문 복사 → AI 답 붙여넣기 → 앵글 고르기), 장마다 글자 꾸미기, ZIP 묶음·제작 기록(CSV) 저장 추가.
 *내용 정리·작업 파일은 CardCore, 줄바꿈·색표는 NoticeCore, 위험 표현은 AdcheckCore. 캔버스 한 장에 그려 미리보기와 저장을 한 번에(안내문 도구와 같은 방식, 새 라이브러리 없음).
 * 로고는 FileReader로 읽어 메모리에만 두고 그린다 — 어디에도 보내지 않는다. 카드 내용은 기기에 저장하지 않는다(작업 파일은 내려받기만).
 * 사후 검수(2026-10-01) 반영: 넘치면 글자 축소·경고, 바닥 줄 두 줄, 점검 줄 상시 표시·업종 칩, 잘림 안내, 자리 표시 글자는 미리보기에만. */
(function () {
  "use strict";
  var C = window.CardCore, N = window.NoticeCore, A = window.AdcheckCore, U = window.UI, el = U.el, $ = U.$;
  var FONT = '"Pretendard Variable", Pretendard, "Malgun Gothic", sans-serif';
  var form = $("f-card"), canvas = $("card"), queued = false, logoImg = null, logoSeq = 0, rules = null, rulesFailed = false, profile = null;
  var set = C.newSet(), cur = 0;
  var THEME_IDS = Object.keys(N.THEMES);

  function card() { return set.cards[cur]; }
  function readForm() { var e = form.elements, c = card(); c.kicker = e.kicker.value; c.title = e.title.value; c.sub = e.sub.value; c.body = e.body.value; set.brand = e.brand.value; set.handle = e.handle.value; }
  function writeForm() { var e = form.elements, c = card(); e.kicker.value = c.kicker; e.title.value = c.title; e.sub.value = c.sub; e.body.value = c.body; e.brand.value = set.brand; e.handle.value = set.handle; pressChips($("types"), C.TYPES, c.type); applyType(C.type(c.type)); pressStyle(); }
  function applyType(t) { $("title-label").textContent = t.titleLabel; $("body-label").textContent = t.bodyLabel; $("body-hint").textContent = t.hint; form.elements.body.placeholder = t.placeholder; }
  function pressChips(box, items, id) { Array.prototype.forEach.call(box.children, function (c, i) { c.setAttribute("aria-pressed", String(items[i].id === id)); }); }
  function chips(box, items, get, put) {
    items.forEach(function (it) {
      var b = el("button", "chip", it.name); b.type = "button"; b.setAttribute("aria-pressed", String(get() === it.id));
      b.addEventListener("click", function () { put(it.id); pressChips(box, items, it.id); schedule(); });
      box.appendChild(b);
    });
  }
  // focus=true 면 다시 그린 뒤 현재 장 탭에 초점을 둔다 — 키보드 사용자가 초점을 잃지 않게(재검수 하5)
  function renderTabs(focus) {
    var box = $("cards"); while (box.firstChild) box.removeChild(box.firstChild);
    set.cards.forEach(function (c, i) {
      var b = el("button", "", (i + 1) + "장"); b.type = "button"; b.setAttribute("aria-pressed", String(i === cur));
      b.addEventListener("click", function () { readForm(); cur = i; writeForm(); renderTabs(true); schedule(); });
      box.appendChild(b);
    });
    $("add").disabled = set.cards.length >= C.MAX_CARDS; $("remove").disabled = set.cards.length <= 1;
    $("move-prev").disabled = cur === 0; $("move-next").disabled = cur >= set.cards.length - 1;
    $("page-info").textContent = set.cards.length > 1 ? set.cards.length + "장 중 " + (cur + 1) + "장" : "";
    if (focus && box.children[cur]) box.children[cur].focus();
  }
  function rebuild(focus) { if (cur >= set.cards.length) cur = set.cards.length - 1; if (cur < 0) cur = 0; writeForm(); renderTabs(focus); pressChips($("themes"), THEME_IDS.map(function (k) { return { id: k }; }), set.theme); pressChips($("tones"), C.TONES, set.tone); pressChips($("sizes"), Object.keys(C.SIZES).map(function (k) { return { id: k }; }), set.size); pressChips($("kinds"), C.KINDS, set.kind); schedule(); }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  // 한 번 통과: draw=false 면 본문 높이만 잰다. s = 글자 배율(넘칠 때 줄임), ph = 자리 표시 글자를 그릴지(미리보기만). 치수는 폭 1080 기준.
  function pass(ctx, b, pal, W, draw, offset, s, ph) {
    var PAD = 88, inner = W - PAD * 2, X = PAD, y = offset || 0, inBox = false;
    function k(n) { return Math.round(n * s); }
    // layer = 꾸미기 대상(kicker·title·sub·body) — 장마다 고른 크기·굵기·색을 기본값 위에 얹는다
    function put(text, size, weight, color, x, maxW, lh, layer) {
      if (!text) return;
      var ls0 = layer ? C.layerStyle(b.style, layer) : null;
      if (ls0) { size *= ls0.size; if (ls0.weight) weight = ls0.weight; if (ls0.color && !(inBox && ls0.color === "hi" && size < 60)) color = ls0.color === "hi" ? pal.hi : pal.sub; } // 숫자 상자 안 작은 설명 글은 강조색을 쓰지 않는다 — 상자 바탕 위 대비 3.8~4.4 (기술 하6), 큰 숫자는 큰 글씨 기준 3:1 이상
      size = k(size); ctx.font = weight + " " + size + "px " + FONT;
      var ls = N.wrap(text, maxW, function (t) { return ctx.measureText(t).width; });
      ls.forEach(function (ln) { if (draw) { ctx.fillStyle = color; ctx.fillText(ln, x, y + size); } y += Math.round(size * (lh || 1.35)); });
    }
    if (b.kicker) { put(b.kicker, 30, "700", pal.accent, X, inner, 1.5, "kicker"); y += k(18); }
    if (b.type === "quote") {
      if (draw) { ctx.font = "800 " + k(160) + "px " + FONT; ctx.fillStyle = pal.accent; ctx.globalAlpha = 0.6; ctx.fillText("“", X - 10, y + k(120)); ctx.globalAlpha = 1; }
      y += k(110);
      put(b.text || (ph ? "인용할 한 문장" : ""), 60, "800", b.text ? pal.ink : pal.sub, X, inner, 1.4, "body");
      y += k(28);
      if (b.title) put("— " + b.title, 32, "500", pal.sub, X, inner, 1.5, "title");
      return y;
    }
    put(b.title || (ph ? "카드 제목" : ""), b.type === "title" ? 84 : 66, "800", b.title ? pal.ink : pal.sub, X, inner, 1.22, "title");
    if (b.sub) { y += k(14); put(b.sub, 36, "500", pal.sub, X, inner, 1.45, "sub"); }
    if (b.type === "list" && b.items.length) {
      y += k(44);
      b.items.forEach(function (it, i) {
        var ly = y, r = k(24);
        if (draw) { ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(X + r, y + r + k(2), r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = pal.onAccent; ctx.font = "800 " + k(26) + "px " + FONT; ctx.textAlign = "center"; ctx.fillText(String(i + 1), X + r, y + r + k(11)); ctx.textAlign = "left"; }
        put(it, 40, "600", pal.ink, X + k(72), inner - k(72), 1.4, "body");
        y = Math.max(y, ly + k(56)) + k(18);
      });
    } else if (b.type === "numbers" && b.items.length) {
      y += k(40);
      b.items.forEach(function (it) {
        var top = y, dry = draw; draw = false; inBox = true;
        y = top + k(26); put(it.num, 92, "800", pal.accent, X + k(32), inner - k(64), 1.1, "body"); if (it.text) { y += k(6); put(it.text, 34, "500", pal.ink, X + k(32), inner - k(64), 1.4, "body"); } y += k(26);
        var h = y - top; draw = dry;
        if (draw) { ctx.fillStyle = pal.soft; roundRect(ctx, X, top, inner, h, k(20)); ctx.fill(); y = top + k(26); put(it.num, 92, "800", pal.accent, X + k(32), inner - k(64), 1.1, "body"); if (it.text) { y += k(6); put(it.text, 34, "500", pal.ink, X + k(32), inner - k(64), 1.4, "body"); } }
        y = top + h + k(20);
      });
    } else if (b.type === "title" && b.text) {
      y += k(40); put(b.text, 38, "500", pal.ink, X, inner, 1.55, "body");
    }
    return y;
  }
  function palette() {
    var th = N.THEMES[set.theme] || N.THEMES.indigo;
    return set.tone === "light"
      ? { bg: th.soft, bg2: "#ffffff", ink: "#191b22", sub: "#3d434f", accent: th.bg, onAccent: "#ffffff", soft: "rgba(255,255,255,.75)", foot: th.bg, hi: th.bg }
      : { bg: th.bg, bg2: C.shade(th.bg, 0.22), ink: "#ffffff", sub: "rgba(255,255,255,.93)", accent: "#ffffff", onAccent: th.bg, soft: "rgba(255,255,255,.10)", foot: "rgba(255,255,255,.93)", hi: "#ffe9a8" }; // 상자 바탕 .10 — 갈색에서도 흰 글씨 4.5:1 (재검수 하1). 진한 배경의 강조색은 연노랑 #ffe9a8 — 가장 밝은 갈색 바탕에서도 4.7:1
  }
  // 한 장의 치수만 잰다(그리지 않음) — 바닥 줄 폭·본문 높이·배율·넘침. 그리기와 세트 요약이 같이 쓴다.
  function layout(ctx, c, preview) {
    var b = C.blocks(c, set), sz = C.SIZES[set.size] || C.SIZES.square, pal = palette(), W = sz.w, H = sz.h;
    var hasFoot = !!(b.brand || b.handle || logoImg), logoW = logoImg ? 92 : 0, inner = W - 176;
    ctx.font = "700 30px " + FONT; var brandW = b.brand ? ctx.measureText(b.brand).width : 0;
    ctx.font = "500 28px " + FONT; var handleW = b.handle ? ctx.measureText(b.handle).width : 0;
    var twoLine = hasFoot && b.brand && b.handle && (logoW + brandW + 40 + handleW > inner);
    var footH = hasFoot ? (twoLine ? 170 : 120) : 0, top = 100, avail = H - 100 - footH - top;
    // 넘치면 줄이고 **줄인 뒤 다시 잰다** — 글자가 작아지면 줄 수도 줄어 덜 줄여도 들어간다(재검수 하3 오경보)
    var s = 1, h = pass(ctx, b, pal, W, false, 0, 1, preview);
    if (h > avail) {
      s = C.fit(h, avail).scale; h = pass(ctx, b, pal, W, false, 0, s, preview);
      // 줄 수가 바뀌어 여유가 생기면 덜 줄이고, 아직 넘치면 0.01씩 더 줄인다 — 0.7 아래로는 가지 않는다 (3회차 중 R3 회귀 방지)
      if (h <= avail && s < 1) { var s2 = Math.min(1, Math.floor(s * avail / h * 100) / 100); if (s2 > s) { var h2 = pass(ctx, b, pal, W, false, 0, s2, preview); if (h2 <= avail) { s = s2; h = h2; } } }
      var guard = 0; while (h > avail && s > 0.7 && guard++ < 30) { s = Math.max(0.7, Math.round((s - 0.01) * 100) / 100); h = pass(ctx, b, pal, W, false, 0, s, preview); }
    }
    var f = { scale: s, overflow: h > avail };
    var pos = b.style ? b.style.pos : "middle", room = Math.max(0, avail - h);
    return { b: b, pal: pal, W: W, H: H, hasFoot: hasFoot, logoW: logoW, inner: inner, twoLine: twoLine, footH: footH, start: top + (pos === "top" ? 0 : pos === "bottom" ? room : room / 2), fit: f };
  }
  // 한 장을 캔버스에 그린다. preview=true 면 자리 표시 글자를 흐리게 보여 준다. 돌려주는 값: 맞춤 정보(배율·넘침)
  function draw(c, preview) {
    var ctx = canvas.getContext("2d"), L = layout(ctx, c, preview), b = L.b, pal = L.pal, W = L.W, H = L.H, n = set.cards.length;
    canvas.width = W; canvas.height = H;
    var g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, pal.bg); g.addColorStop(1, pal.bg2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    pass(ctx, b, pal, W, true, L.start, L.fit.scale, preview);
    if (L.hasFoot) { // 바닥 줄: 로고·가게 이름·채널 — 한 줄에 안 들어가면 채널을 아랫줄로
      var fy = H - L.footH + 20, x = 88, inner = L.inner, logoW = L.logoW;
      if (logoImg) { var s = 72; ctx.save(); roundRect(ctx, x, fy - 14, s, s, 18); ctx.clip(); ctx.fillStyle = "#fff"; ctx.fillRect(x, fy - 14, s, s); var r = Math.min(s / logoImg.width, s / logoImg.height); ctx.drawImage(logoImg, x + (s - logoImg.width * r) / 2, fy - 14 + (s - logoImg.height * r) / 2, logoImg.width * r, logoImg.height * r); ctx.restore(); x += s + 20; }
      ctx.fillStyle = pal.foot; ctx.font = "700 30px " + FONT; if (b.brand) ctx.fillText(b.brand, x, fy + 24, inner - logoW);
      if (b.handle) { ctx.font = "500 28px " + FONT; if (L.twoLine) ctx.fillText(b.handle, x, fy + 64, inner - logoW); else if (b.brand) { ctx.textAlign = "right"; ctx.fillText(b.handle, W - 88, fy + 24); ctx.textAlign = "left"; } else ctx.fillText(b.handle, x, fy + 24, inner - logoW); }
    }
    if (n > 1) { var i = set.cards.indexOf(c); ctx.fillStyle = pal.foot; ctx.font = "600 28px " + FONT; ctx.textAlign = "right"; ctx.fillText((i + 1) + "/" + n, W - 88, 68); ctx.textAlign = "left"; }
    return { fit: L.fit, blocks: b };
  }
  function overflowHint() { return set.size === "square" ? "줄을 줄이거나 세로 크기로 바꾸세요" : "줄을 줄이거나 장을 나누세요"; }
  // 받침 유무로 조사 고르기 — "숫자을"(3회차 하-N5) 같은 오류 방지
  function josa(w, withFinal, noFinal) { var c = w.charCodeAt(w.length - 1) - 0xAC00; return w + (c >= 0 && c < 11172 && c % 28 === 0 ? noFinal : withFinal); }
  function render() {
    readForm();
    var r = draw(card(), true), b = r.blocks, f = r.fit;
    var notes = [];
    if (b.note) notes.push(b.note);
    if (C.needsCheck(card())) notes.push("[확인 필요] 표시가 있어요 — 사실인지 확인하고 표시를 지워야 저장돼요");
    if (f.scale < 1) notes.push("글이 길어 글자를 " + Math.round(f.scale * 100) + "%로 줄였어요");
    if (f.overflow) notes.push("그래도 카드 밖으로 넘쳐요 — " + overflowHint());
    setText($("fitnote"), notes.join(" · "));
    canvas.setAttribute("aria-label", C.caption({ brand: set.brand, handle: set.handle, cards: [card()] }) || "빈 카드");
    checkAds();
    setSummary();
  }
  // 다른 장의 넘침·잘림·걸린 표현을 한 줄로 — 보고 있는 장만 알리면 "전부 저장"에서 놓친다 (재검수 하-N1)
  function setSummary() {
    var out = [], ctx = canvas.getContext("2d");
    set.cards.forEach(function (c, i) {
      if (i === cur || C.isEmpty(c)) return;
      var L = layout(ctx, c, false), parts = [];
      if (L.fit.overflow) parts.push("넘침"); else if (L.b.note) parts.push("잘림");
      if (C.needsCheck(c)) parts.push("확인 필요");
      if (rules) { var hits = A.scan([c.kicker, c.title, c.sub, c.body].join("\n"), { kind: set.kind, online: !!(profile && profile.type === "online") }, rules); if (hits.length) parts.push("표현 " + hits.length + "종"); }
      if (parts.length) out.push((i + 1) + "장 " + parts.join("·"));
    });
    setText($("set-note"), out.length ? "다른 장 점검: " + out.join(" / ") + " — 그 장을 눌러 확인하세요" : "");
  }
  function setText(box, text) { if (box.textContent !== text) box.textContent = text; }
  // 점검 줄은 항상 보인다 — 걸린 게 없는 것과 사전을 못 불러온 것을 구별한다 (사후 검수 중3)
  function checkAds() {
    var box = $("adhits"), c = card(), kindName = (C.KINDS.filter(function (k) { return k.id === set.kind; })[0] || C.KINDS[0]).name;
    if (!rules) { setText(box, rulesFailed ? "표현 사전을 못 불러와 점검하지 못했어요 — 광고 문구 점검 도구에서 확인하세요" : "표현 사전을 불러오는 중"); return; }
    var hits = A.scan([c.kicker, c.title, c.sub, c.body, set.brand, set.handle].join("\n"), { kind: set.kind, online: !!(profile && profile.type === "online") }, rules);
    function names(list) { return list.map(function (h) { return h.name + "(" + h.matches.map(function (m) { return m.text; }).join("·") + ")"; }).join(", "); }
    var warn = hits.filter(function (h) { return h.level === "warn"; }), check = hits.filter(function (h) { return h.level !== "warn"; }), parts = [];
    if (warn.length) parts.push("걸릴 수 있는 표현 " + warn.length + "종: " + names(warn));
    if (check.length) parts.push("사실인지 확인할 표현 " + check.length + "종: " + names(check));
    setText(box, "표현 점검(" + kindName + " 규칙, 이 장): " + (parts.length ? parts.join(" · ") + " — 광고 문구 점검 도구에서 조문과 고쳐 쓰기를 보세요" : "걸린 말 없음"));
  }
  function renderAsync() {
    if (document.fonts && document.fonts.load) return document.fonts.load('800 66px "Pretendard Variable"').then(render, render);
    render(); return Promise.resolve();
  }
  function schedule() { if (queued) return; queued = true; setTimeout(function () { queued = false; renderAsync(); }, 40); }

  function download(blob, name) { var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); }
  function blobOf(c) {
    return new Promise(function (resolve, reject) {
      draw(c, false);
      try { canvas.toBlob(function (blob) { blob ? resolve(blob) : reject(new Error("blob")); }, "image/png"); } catch (e) { reject(e); }
    });
  }
  // 저장 전 확인: 빈 장·필수 칸·예시 그대로·넘침 — 자리 표시 글자, 가상 예시, 잘린 글이 이미지로 나가지 않게
  function blocker(indexes) {
    var ctx = canvas.getContext("2d");
    for (var j = 0; j < indexes.length; j++) {
      var i = indexes[j], c = set.cards[i], t = C.type(c.type), tag = set.cards.length > 1 ? (i + 1) + "장: " : "";
      if (C.isEmpty(c)) return tag + josa(t.titleLabel, "이나", "나") + " " + josa(t.bodyLabel, "을", "를") + " 먼저 적어 주세요";
      var m = C.missing(c); if (m) return tag + m + " 칸을 채워 주세요";
      if (C.isExampleCard(c)) return tag + "가상 예시 그대로예요 — 내 내용으로 바꾼 뒤 저장하세요";
      if (C.needsCheck(c)) return tag + "[확인 필요] 표시가 남아 있어요 — 사실인지 확인하고 표시를 지운 뒤 저장하세요";
      if (layout(ctx, c, false).fit.overflow) return tag + "글이 길어 카드 밖으로 넘쳐요 — " + overflowHint();
    }
    return "";
  }
  function saveCards(btn, indexes) {
    readForm();
    var why = blocker(indexes); if (why) { U.flash(btn, why); return; }
    var p = Promise.resolve(), done = 0;
    indexes.forEach(function (i, j) {
      p = p.then(function () { return blobOf(set.cards[i]); }).then(function (blob) { download(blob, C.fileName(set, i) + ".png"); done++; return j < indexes.length - 1 ? new Promise(function (r) { setTimeout(r, 350); }) : null; });
    });
    p.then(function () { U.flash(btn, (indexes.length > 1 ? done + "장 " : "") + "저장했어요 — 안 보이면 다운로드 폴더 확인"); }, function () { U.flash(btn, "저장 못 함 — 로고를 빼거나 다른 브라우저로"); }).then(renderAsync);
  }

  chips($("types"), C.TYPES, function () { return card().type; }, function (id) { readForm(); card().type = id; applyType(C.type(id)); });
  chips($("themes"), THEME_IDS.map(function (k) { return { id: k, name: N.THEMES[k].name }; }), function () { return set.theme; }, function (id) { set.theme = id; });
  chips($("tones"), C.TONES, function () { return set.tone; }, function (id) { set.tone = id; });
  chips($("sizes"), Object.keys(C.SIZES).map(function (k) { return { id: k, name: C.SIZES[k].name }; }), function () { return set.size; }, function (id) { set.size = id; });
  chips($("kinds"), C.KINDS, function () { return set.kind; }, function (id) { set.kind = id; });

  // ── 가게·회사 정보 — '우리 가게 카드'(ProfileCore 13칸, 키 sajang-toolbox:profile)를 이 화면에서 바로 적는다 (2026-10-04 사장님 지시 "가게나 회사 정보를 입력받아서")
  // 칸 만들기는 apps/profile.js와 같은 방식(textContent만). 저장 규칙은 FACTORY 1절 그대로 — 공개 사업 정보만, 이 기기에만.
  var P = window.ProfileCore, pTimer = null, auto = { brand: "", handle: "" };
  function pName(id) { return "p_" + id; }
  function buildProfile() {
    var box = $("pfields");
    P.FIELDS.forEach(function (f) {
      var label = el("label", "field" + (f.kind === "textarea" ? " full" : ""), f.label), input;
      label.appendChild(el("small", null, " " + f.hint));
      if (f.kind === "select") {
        input = el("select"); input.appendChild(el("option", null, "선택")).value = "";
        (f.id === "type" ? P.TYPES : P.TONES).forEach(function (t) { var o = el("option", null, t.name); o.value = t.id; input.appendChild(o); });
      } else if (f.kind === "textarea") { input = el("textarea"); input.rows = 2; input.maxLength = P.MAX; }
      else { input = el("input"); input.maxLength = P.MAX; input.autocomplete = "off"; }
      input.name = pName(f.id); label.appendChild(input); box.appendChild(label);
    });
  }
  function pValues() { var o = {}; P.FIELDS.forEach(function (f) { o[f.id] = form.elements[pName(f.id)].value; }); return P.clean(o); }
  function pFill(p) { P.FIELDS.forEach(function (f) { form.elements[pName(f.id)].value = p && p[f.id] || ""; }); }
  function profileText() { var p = pValues(); return P.filled(p) ? P.toText(p) : ""; }
  // 바닥 줄 가게 이름·연락처는 비어 있거나 전에 자동으로 넣은 값일 때만 따라 바꾼다 — 손으로 고친 값은 덮지 않는다
  function fromProfile(p) {
    profile = p; if (!p) return;
    var e = form.elements, name = p.name || "", handle = p.contact || p.channel || "";
    if (!e.brand.value || e.brand.value === auto.brand) { e.brand.value = name; set.brand = name; auto.brand = name; }
    if (!e.handle.value || e.handle.value === auto.handle) { e.handle.value = handle; set.handle = handle; auto.handle = handle; }
    if (p.type === "food" || p.type === "restaurant") { set.kind = "food"; pressChips($("kinds"), C.KINDS, set.kind); }
  }
  function pStatus(saved) {
    var p = pValues(), n = P.filled(p);
    $("psummary").textContent = n ? "정보 적기·고치기 (" + (p.name || "상호 없음") + " · " + n + "/" + P.FIELDS.length + "칸)" : "정보 적기·고치기 (아직 비어 있어요)";
    setText($("pstatus"), saved === false ? "이 브라우저는 저장이 막혀 있어요 — 화면을 닫으면 사라지니 '우리 가게 카드' 도구에서 복사해 보관하세요"
      : n ? "채운 칸 " + n + "/" + P.FIELDS.length + " · 이 기기에 저장됨 · 빈 칸은 지시문에 [확인 필요]로 들어가 AI가 지어내지 않게 해요" : "아직 비어 있어요 — 상호·대표 상품·주로 사는 사람·고민만 적어도 연재표가 훨씬 그 가게답게 나와요");
  }
  buildProfile();
  (function () { var p = U.loadProfile(); pFill(p); fromProfile(p); pStatus(); if (!p || !P.filled(p)) $("pdetails").open = true; })();
  $("pfields").addEventListener("input", function () { clearTimeout(pTimer); pTimer = setTimeout(function () { var p = pValues(); pStatus(U.saveProfile(p)); fromProfile(p); schedule(); }, 400); });
  $("pfields").addEventListener("change", function () { var p = pValues(); pStatus(U.saveProfile(p)); fromProfile(p); schedule(); });
  $("pclear").addEventListener("click", function () {
    if (!confirm("이 기기에 저장된 가게·회사 정보를 지울까요? ('우리 가게 카드' 도구의 정보도 함께 지워져요)")) return;
    pFill(null); U.clearProfile(); profile = null;
    // 정보에서 자동으로 채운 바닥 줄도 함께 비운다 — 손으로 고친 값은 둔다 (기술 검수 하2)
    var e = form.elements; if (e.brand.value === auto.brand) { e.brand.value = ""; set.brand = ""; } if (e.handle.value === auto.handle) { e.handle.value = ""; set.handle = ""; } auto = { brand: "", handle: "" };
    pStatus(); schedule(); U.flash(this, "지웠어요");
  });
  form.addEventListener("input", schedule); form.addEventListener("change", schedule);

  $("add").addEventListener("click", function () { if (set.cards.length >= C.MAX_CARDS) return; readForm(); set.cards.splice(cur + 1, 0, C.newCard(card().type)); cur++; rebuild(true); });
  $("remove").addEventListener("click", function () { if (set.cards.length <= 1) return; if (!C.isEmpty(card()) && !confirm((cur + 1) + "장을 지울까요?")) return; set.cards.splice(cur, 1); rebuild(true); });
  $("move-prev").addEventListener("click", function () { if (cur === 0) return; readForm(); var c = set.cards.splice(cur, 1)[0]; set.cards.splice(cur - 1, 0, c); cur--; rebuild(cur === 0); });
  $("move-next").addEventListener("click", function () { if (cur >= set.cards.length - 1) return; readForm(); var c = set.cards.splice(cur, 1)[0]; set.cards.splice(cur + 1, 0, c); cur++; rebuild(cur >= set.cards.length - 1); });

  form.elements.logo.addEventListener("change", function () {
    var file = this.files && this.files[0], input = this, my = ++logoSeq;
    logoImg = null;
    if (!file) { schedule(); return; }
    function fail(msg) { if (my !== logoSeq) return; logoImg = null; input.value = ""; U.flash($("save"), msg || "로고 이미지를 읽지 못했어요 (PNG·JPG인지 확인)"); schedule(); }
    if (file.size > C.MAX_LOGO_BYTES) { fail("로고가 10MB를 넘어요 — 작은 파일로 바꿔 주세요"); return; }
    var reader = new FileReader();
    reader.onerror = function () { fail(); };
    reader.onload = function () { var img = new Image(); img.onload = function () { if (my !== logoSeq) return; logoImg = img; schedule(); }; img.onerror = function () { fail(); }; img.src = reader.result; };
    try { reader.readAsDataURL(file); } catch (e) { fail(); }
  });
  $("save").addEventListener("click", function () { saveCards(this, [cur]); });
  $("save-all").addEventListener("click", function () { saveCards(this, set.cards.map(function (c, i) { return i; })); });
  // 걸린 장 번호 "1·3장" — 개수만 말하면 몇 번째 장인지 헷갈린다 (재검수 하-N1)
  function nums(test) { var n = []; set.cards.forEach(function (c, i) { if (test(c)) n.push(i + 1); }); return n.length ? n.join("·") + "장" : ""; }
  $("copy").addEventListener("click", function () {
    var b = this; readForm(); var text = C.caption(set), out = $("caption-out");
    if (!text) { U.flash(b, "복사할 내용이 없어요"); return; }
    var ex = nums(C.isExampleCard); if (ex) { U.flash(b, ex + "이 가상 예시 그대로예요 — 내 내용으로 바꾼 뒤 복사하세요"); return; }
    var chk = nums(C.needsCheck); if (chk) { U.flash(b, chk + "에 [확인 필요] 표시가 남아 있어요 — 확인하고 지운 뒤 복사하세요"); return; }
    U.copyText(text).then(function () { U.flash(b, "캡션을 복사했어요"); if (out) out.remove(); }, function () {
      if (!out) { out = el("textarea", "caption-out"); out.id = "caption-out"; out.readOnly = true; out.rows = 8; out.setAttribute("aria-label", "캡션"); $("msg").parentNode.insertBefore(out, $("msg")); }
      out.value = text; out.focus(); out.select(); U.flash(b, "복사 못 함 — 아래 글을 직접 복사하세요");
    });
  });
  $("example").addEventListener("click", function () {
    readForm();
    var written = set.cards.filter(function (c) { return !C.isEmpty(c) && !C.isExampleCard(c); }).length;
    if (written && !confirm("써 둔 " + written + "장을 가상 예시 " + C.EXAMPLE.cards.length + "장으로 바꿀까요?")) return;
    set.cards = C.EXAMPLE.cards.map(function (c) { return { type: c.type, kicker: c.kicker, title: c.title, sub: c.sub, body: c.body }; }); delete set.plan;
    if (!set.brand) set.brand = C.EXAMPLE.brand; if (!set.handle) set.handle = C.EXAMPLE.handle;
    cur = 0; rebuild(); U.flash(this, "가상 예시 " + set.cards.length + "장을 채웠어요 — 내 내용으로 고치세요");
  });
  $("save-work").addEventListener("click", function () { readForm(); try { download(new Blob([C.serialize(set)], { type: "application/json" }), "카드뉴스_작업.json"); U.flash(this, "작업 파일을 저장했어요 — 로고는 들어가지 않아요"); } catch (e) { U.flash(this, "저장 못 함"); } });
  $("open-work").addEventListener("change", function () {
    var file = this.files && this.files[0], input = this; if (!file) return;
    if (file.size > C.MAX_WORK_BYTES) { input.value = ""; U.flash($("save-work"), "작업 파일이 너무 커요 (1MB까지) — 카드뉴스 작업 파일이 맞는지 확인하세요"); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var p = C.parse(reader.result, THEME_IDS); input.value = ""; if (!p) { U.flash($("save-work"), "카드뉴스 작업 파일이 아니에요"); return; }
      readForm(); var written = set.cards.filter(function (c) { return !C.isEmpty(c) && !C.isExampleCard(c); }).length;
      if (written && !confirm("써 둔 " + written + "장을 닫고 작업 파일(" + p.cards.length + "장)을 열까요?")) return;
      set = p; cur = 0; rebuild(); U.flash($("save-work"), p.truncated ? "한 세트는 " + C.MAX_CARDS + "장까지 — 넘친 장은 뺐어요" : set.cards.length + "장을 열었어요"); };
    reader.onerror = function () { U.flash($("save-work"), "파일을 읽지 못했어요"); };
    reader.readAsText(file);
  });
  // ── 글자 꾸미기 — 고른 글 층(curLayer)의 크기·굵기·색, 장 전체의 세로 위치 ──
  var curLayer = "title";
  function layerOf(c) { var st = c.style; return (st && st[curLayer]) || { size: "1", weight: "", color: "" }; }
  function setLayer(prop, val) {
    var c = card(), st = c.style ? JSON.parse(JSON.stringify(c.style)) : { pos: "middle" }, y = layerOf(c);
    st[curLayer] = { size: y.size, weight: y.weight, color: y.color }; st[curLayer][prop] = val;
    c.style = C.style(st);
  }
  function pressStyle() {
    var c = card();
    pressChips($("layers"), C.LAYERS, curLayer);
    pressChips($("lsizes"), C.LAYER_SIZES, layerOf(c).size);
    pressChips($("lweights"), C.WEIGHTS, layerOf(c).weight);
    pressChips($("lcolors"), C.COLORS, layerOf(c).color);
    pressChips($("lpos"), C.POSITIONS, c.style ? c.style.pos : "middle");
    $("style-reset").disabled = !c.style;
  }
  chips($("layers"), C.LAYERS, function () { return curLayer; }, function (id) { curLayer = id; pressStyle(); });
  chips($("lsizes"), C.LAYER_SIZES, function () { return "1"; }, function (id) { setLayer("size", id); pressStyle(); });
  chips($("lweights"), C.WEIGHTS, function () { return ""; }, function (id) { setLayer("weight", id); pressStyle(); });
  chips($("lcolors"), C.COLORS, function () { return ""; }, function (id) { setLayer("color", id); pressStyle(); });
  chips($("lpos"), C.POSITIONS, function () { return "middle"; }, function (id) { var c = card(), st = c.style ? JSON.parse(JSON.stringify(c.style)) : {}; st.pos = id; c.style = C.style(st); pressStyle(); });
  $("style-reset").addEventListener("click", function () { delete card().style; pressStyle(); schedule(); var on = $("layers").querySelector("[aria-pressed=true]"); if (on) on.focus(); }); // 되돌리면 이 버튼이 꺼져 초점이 사라진다 — 꾸밀 글 칩으로 (기술 하1)

  // ── 1단계 전략 — 지시문 복사 → AI 답 붙여넣기 → 앵글 고르기 ──
  var strategy = null;
  function today() { var d = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; }; return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); }
  function written() { return set.cards.filter(function (c) { return !C.isEmpty(c) && !C.isExampleCard(c); }).length; }
  // 복사가 막힌 브라우저면 글 칸을 띄워 직접 복사하게 한다 (캡션 복사와 같은 방식)
  function copyOrShow(btn, text, id, label, okMsg) {
    var out = $(id);
    U.copyText(text).then(function () { U.flash(btn, okMsg); if (out) out.remove(); }, function () {
      if (!out) { out = el("textarea", "caption-out"); out.id = id; out.readOnly = true; out.rows = 8; out.setAttribute("aria-label", label); btn.parentNode.parentNode.insertBefore(out, btn.parentNode.nextSibling); }
      out.value = text; out.focus(); out.select(); U.flash(btn, "복사 못 함 — 나온 글을 직접 복사하세요");
    });
  }
  $("copy-prompt").addEventListener("click", function () {
    var e = form.elements;
    if (!C.clean(e.topic.value) && !e.source.value.trim()) { U.flash(this, "주제나 원문을 먼저 적어 주세요"); e.topic.focus(); return; }
    copyOrShow(this, C.strategyPrompt({ topic: e.topic.value, source: e.source.value, count: e.count.value, brand: set.brand, kind: set.kind, profileText: profileText() }), "prompt-out", "AI에게 줄 지시문", "지시문을 복사했어요 — AI 대화창에 붙여 넣으세요");
  });
  function line(box, label, text) { if (!text) return; var p = el("p", "muted"); p.appendChild(el("strong", null, label + " ")); p.appendChild(document.createTextNode(text)); box.appendChild(p); }
  function showStrategy(chosen) {
    var box = $("plan-out"); box.textContent = "";
    if (!strategy) return;
    line(box, "타깃", strategy.target); line(box, "고민", strategy.pain);
    line(box, "핵심 키워드", strategy.core.join(", ")); line(box, "검색 키워드(AI 추측, 검색량 미확인)", strategy.search.join(", "));
    box.appendChild(el("p", "muted", "앵글을 고르면 그 앵글의 카드가 아래 장에 채워져요."));
    var list = el("div", "chips angles"); list.setAttribute("role", "group"); list.setAttribute("aria-label", "앵글 고르기");
    strategy.angles.forEach(function (g, i) {
      var b = el("button", "chip angle"); b.type = "button"; b.setAttribute("aria-pressed", String(i === chosen));
      b.appendChild(el("span", "angle-name", (i + 1) + ". " + g.title + (g.funnel ? " · " + g.funnel : "") + " · " + g.cards.length + "장"));
      if (g.cta) b.appendChild(el("span", "angle-cta", "CTA: " + g.cta));
      b.addEventListener("click", function () { useAngle(i, b); });
      list.appendChild(b);
    });
    box.appendChild(list);
  }
  function useAngle(i, btn) {
    readForm();
    var g = strategy.angles[i], r = C.angleCards(g), n = written();
    if (n && !confirm("써 둔 " + n + "장을 '" + g.title + "' 앵글 카드 " + r.cards.length + "장으로 바꿀까요? (글자 꾸미기도 지워져요)")) return;
    set.cards = r.cards; set.plan = C.planOf(strategy, i, form.elements.topic.value); cur = 0;
    rebuild(); showStrategy(i);
    setText($("plan-msg"), "'" + g.title + "' 앵글 카드 " + r.cards.length + "장을 채웠어요 — [확인 필요]와 숫자는 사실인지 보고 고치세요" + (r.note ? " · " + r.note : ""));
    var nb = $("plan-out").querySelectorAll(".angle")[i]; if (nb) nb.focus(); else if (btn) btn.focus();
  }
  $("read-answer").addEventListener("click", function () {
    var r = C.parseStrategy(form.elements.answer.value);
    if (!r.ok) { strategy = null; showStrategy(-1); setText($("plan-msg"), r.error); U.flash(this, "불러오지 못했어요"); return; }
    strategy = r.strategy; showStrategy(-1);
    setText($("plan-msg"), "앵글 " + strategy.angles.length + "개를 불러왔어요 — 하나를 고르세요" + (r.warnings.length ? " · " + r.warnings.join(" · ") : ""));
    U.flash(this, "불러왔어요");
  });

  // ── 만드는 방식: 시리즈(기본) / 한 편 ──
  var MODES = [{ id: "series", name: "시리즈로 (한 달 연재)" }, { id: "single", name: "한 편만" }], mode = "series";
  chips($("modes"), MODES, function () { return mode; }, function (id) { mode = id; $("series-box").hidden = id !== "series"; $("single-box").hidden = id !== "single"; });

  // ── 시리즈 — 시리즈 지시문 → 연재표 붙여넣기 → 회차 고르기 → 회차 지시문 → 카드 붙여넣기 ──
  // ponytail: 연재표는 기기에 저장하지 않는다(FACTORY 1절) — "연재표 저장"으로 파일을 받고 다음에 "연재표 열기". ZIP을 받으면 그 회차를 완료로 표시한 연재표도 ZIP에 넣는다.
  var series = null, ep = -1;
  function seriesFileName() { return C.seriesFileName(series); }
  function renderSeries() {
    var box = $("series-out"); box.textContent = "";
    $("save-series").disabled = !series;
    if (!series) { $("episode-box").hidden = true; return; }
    var done = series.episodes.filter(function (e) { return e.done; }).length;
    line(box, "연재", series.name + " · " + series.episodes.length + "회 중 " + done + "회 완료");
    line(box, "타깃", series.target); line(box, "고민", series.pain);
    line(box, "핵심 키워드", series.core.join(", ")); line(box, "검색 키워드(AI 추측, 검색량 미확인)", series.search.join(", "));
    box.appendChild(el("p", "muted", "회차를 고르면 그 회차 카드를 받는 지시문을 만들 수 있어요. 회차 주제·CTA도 AI 초안이에요 — 가격·할인·기간이 들어 있으면 내 가게 사실과 맞는지 먼저 보세요."));
    var list = el("div", "chips angles"); list.setAttribute("role", "group"); list.setAttribute("aria-label", "회차 고르기");
    series.episodes.forEach(function (e, i) {
      var b = el("button", "chip angle"); b.type = "button"; b.setAttribute("aria-pressed", String(i === ep));
      b.appendChild(el("span", "angle-name", e.no + "회 · " + e.title + (e.funnel ? " · " + e.funnel : "") + (e.done ? " · 완료" : "")));
      b.appendChild(el("span", "angle-cta", "앵글: " + (e.angle || "-") + " / CTA: " + (e.cta || "-")));
      // 회차를 바꾸면 이전 회차의 답·지시문을 비운다 — 4회 답이 5회로 기록되지 않게 (기술 검수 하1)
      b.addEventListener("click", function () { if (ep !== i) { form.elements.eanswer.value = ""; var po = $("episode-prompt-out"); if (po) po.remove(); } ep = i; renderSeries(); setText($("episode-msg"), ""); var nb = $("series-out").querySelectorAll(".angle")[i]; if (nb) nb.focus(); });
      list.appendChild(b);
    });
    box.appendChild(list);
    var e = series.episodes[ep];
    $("episode-box").hidden = !e;
    if (e) { setText($("episode-head"), e.no + "회: " + e.title + (e.done ? " (완료)" : "")); $("toggle-done").textContent = e.done ? "완료 표시 지우기" : "완료 표시"; }
  }
  function useSeries(s, msg) { series = s; ep = -1; renderSeries(); setText($("series-msg"), msg); }
  $("copy-series").addEventListener("click", function () {
    var t = profileText();
    if (!t) { U.flash(this, "가게·회사 정보를 먼저 적어 주세요"); $("pdetails").open = true; form.elements[pName("name")].focus(); return; }
    copyOrShow(this, C.seriesPrompt({ profileText: t, goal: form.elements.goal.value, count: form.elements.episodes.value, kind: set.kind }), "series-prompt-out", "AI에게 줄 시리즈 지시문", "시리즈 지시문을 복사했어요 — AI 대화창에 붙여 넣으세요");
  });
  $("read-series").addEventListener("click", function () {
    var r = C.parseSeries(form.elements.sanswer.value);
    if (!r.ok) { setText($("series-msg"), r.error); U.flash(this, "불러오지 못했어요"); return; }
    if (series && !confirm("지금 연재표(" + series.name + ")를 새 연재표로 바꿀까요? 저장하지 않은 완료 표시는 사라져요")) return;
    useSeries(r.series, "연재표 " + r.series.episodes.length + "회를 불러왔어요 — 회차를 고르세요. '연재표 저장'으로 파일을 받아 두면 다음에 이어서 할 수 있어요" + (r.warnings.length ? " · " + r.warnings.join(" · ") : ""));
    U.flash(this, "불러왔어요");
  });
  $("copy-episode").addEventListener("click", function () {
    var e = series && series.episodes[ep]; if (!e) return;
    copyOrShow(this, C.strategyPrompt({ series: series, episode: e, count: form.elements.ecount.value, brand: set.brand, kind: set.kind, profileText: profileText() }), "episode-prompt-out", "AI에게 줄 회차 지시문", e.no + "회 지시문을 복사했어요 — AI 대화창에 붙여 넣으세요");
  });
  $("read-episode").addEventListener("click", function () {
    var e = series && series.episodes[ep]; if (!e) return;
    var r = C.parseStrategy(form.elements.eanswer.value);
    if (!r.ok) { setText($("episode-msg"), r.error); U.flash(this, "불러오지 못했어요"); return; }
    readForm();
    var g = r.strategy.angles[0], res = C.angleCards({ cta: e.cta || g.cta, cards: g.cards }, { check: true }), n = written();
    if (n && !confirm("써 둔 " + n + "장을 " + e.no + "회 카드 " + res.cards.length + "장으로 바꿀까요? (글자 꾸미기도 지워져요)")) return;
    set.cards = res.cards; set.plan = C.episodePlan(series, ep); cur = 0; rebuild();
    setText($("episode-msg"), e.no + "회 카드 " + res.cards.length + "장을 채웠어요 — 숫자·가격·기간은 사실인지 보고, [확인 필요]는 확인한 뒤 지우세요. 다 고치고 'ZIP 묶음 저장'을 누르면 이 회차가 완료로 표시돼요" + (r.strategy.angles.length > 1 ? " · 앵글이 " + r.strategy.angles.length + "개 와서 첫 번째만 썼어요" : "") + (res.note ? " · " + res.note : ""));
    U.flash(this, "불러왔어요");
  });
  $("toggle-done").addEventListener("click", function () {
    var e = series && series.episodes[ep]; if (!e) return;
    e.done = !e.done; renderSeries(); this.focus();
    setText($("episode-msg"), e.no + "회를 " + (e.done ? "완료로 표시했어요" : "완료 표시를 지웠어요") + " — '연재표 저장'을 눌러야 파일에 남아요");
  });
  $("save-series").addEventListener("click", function () {
    if (!series) return;
    try { download(new Blob([C.serializeSeries(series)], { type: "application/json" }), seriesFileName()); U.flash(this, "연재표를 저장했어요 — 다음에 '연재표 열기'로 이어서"); } catch (e) { U.flash(this, "저장 못 함"); }
  });
  $("open-series").addEventListener("change", function () {
    var file = this.files && this.files[0], input = this; if (!file) return;
    if (file.size > C.MAX_WORK_BYTES) { input.value = ""; setText($("series-msg"), "파일이 너무 커요 (1MB까지) — '연재표 저장'으로 받은 파일인지 확인하세요"); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var s = C.parseSeriesFile(reader.result); input.value = "";
      if (!s) { setText($("series-msg"), "카드뉴스 연재표 파일이 아니에요 ('연재표 저장'으로 받은 파일인지 확인하세요)"); return; }
      if (series && !confirm("지금 연재표(" + series.name + ")를 닫고 파일의 연재표를 열까요?")) return;
      var done = s.episodes.filter(function (x) { return x.done; }).length;
      useSeries(s, "연재표를 열었어요 — " + s.episodes.length + "회 중 " + done + "회 완료");
    };
    reader.onerror = function () { setText($("series-msg"), "파일을 읽지 못했어요"); };
    reader.readAsText(file);
  });
  // 지금 세트가 열린 연재표의 회차에서 왔는가 — ZIP 저장 때 그 회차를 완료로 표시한다
  function seriesEpisodeOfSet() { return C.episodeOf(series, set.plan); } // 연재 이름·회차 번호·회차 주제가 모두 맞을 때만 (기술 검수 중1)
  renderSeries();

  // ── ZIP 묶음·제작 기록 ──
  function record(btn) {
    readForm();
    if (!written()) { U.flash(btn, "기록할 카드가 없어요 — 내 내용으로 먼저 채워 주세요"); return; }
    download(new Blob([C.recordCsv(set, today())], { type: "text/csv;charset=utf-8" }), "카드뉴스_제작기록_" + today() + ".csv");
    U.flash(btn, "제작 기록을 저장했어요 — 엑셀로 열려요");
  }
  $("save-record").addEventListener("click", function () { record(this); });
  $("save-zip").addEventListener("click", function () {
    var btn = this, all = set.cards.map(function (c, i) { return i; }), files = [];
    readForm();
    var why = blocker(all); if (why) { U.flash(btn, why); return; }
    // 장이 많으면 몇 초 걸린다 — 그동안 버튼을 끄고 폼을 잠근다(두 번 받기·검사 안 거친 장 섞임 방지, 기술 하5).
    // 안내가 떠 있을 때 다시 눌러도 원래 글자로 돌아오게 flash 타이머를 먼저 정리한다(기술 중5 — 글자가 안내문으로 굳던 것)
    var label = btn.dataset.orig || btn.textContent; clearTimeout(btn._flashTimer); delete btn.dataset.orig;
    btn.textContent = "묶는 중…"; btn.disabled = true; form.inert = true;
    function done() { form.inert = false; btn.disabled = false; btn.textContent = label; btn.focus(); }
    var p = Promise.resolve();
    all.forEach(function (i) { p = p.then(function () { return blobOf(set.cards[i]); }).then(function (blob) { return blob.arrayBuffer(); }).then(function (buf) { files.push({ name: C.fileName(set, i) + ".png", data: new Uint8Array(buf) }); }); });
    p.then(done, function (e) { done(); throw e; }).then(function () {
      files.push({ name: "제작기록_" + today() + ".csv", data: new TextEncoder().encode(C.recordCsv(set, today())) });
      var se = seriesEpisodeOfSet(), pre = se ? se.no + "회_" : "";
      if (se) { se.done = true; files.push({ name: seriesFileName(), data: new TextEncoder().encode(C.serializeSeries(series)) }); renderSeries(); }
      download(new Blob([C.zip(files, new Date())], { type: "application/zip" }), pre + C.fileName({ cards: [set.cards[0]] }, 0) + "_" + all.length + "장.zip");
      U.flash(btn, all.length + "장을 ZIP 하나로 저장했어요" + (se ? " — " + se.no + "회 완료 표시한 연재표도 넣었어요. 다음엔 ZIP 안 연재표 파일을 '연재표 열기'로 여세요" : " — 다운로드 폴더 확인"));
    }, function () { U.flash(btn, "저장 못 함 — 로고를 빼거나 다른 브라우저로"); }).then(renderAsync);
  });

  fetch("../data/adcheck-rules.json").then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { rules = d; rulesFailed = !d; schedule(); }).catch(function () { rules = null; rulesFailed = true; schedule(); });
  rebuild();
})();

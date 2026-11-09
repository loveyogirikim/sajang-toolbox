/* 소개·상세페이지 조립기 화면 — 블록·품질 점검·작업 파일은 PageCore, 위험 표현은 AdcheckCore, 줄바꿈은 NoticeCore.wrap. 여기서는 편집칸을 만들고(textContent만) 캔버스에 그린다.
 * 그리기는 안내문 도구와 같은 두 번 통과(높이 재기 → 그리기). 미리보기·저장 모두 조각 캔버스(≤2400px)로 그려 휴대폰 브라우저의 캔버스 크기 한도를 피한다. 사진은 기기 밖으로 나가지 않는다. */
(function () {
  "use strict";
  var T = window.ToolboxCore, G = window.PageCore, A = window.AdcheckCore, N = window.NoticeCore, U = window.UI, el = U.el, $ = U.$;
  var FONT = '"Pretendard Variable", Pretendard, "Malgun Gothic", sans-serif', W = 860, PAD = 48, PREVIEW_SLICE = 2400, IMG_MAX = 1600;
  var data = null, rules = null, page = null, imgCache = {}, timer = null, lastHeight = 0;
  var MARK = { true: "✓", false: "×", null: "·" };

  // ---------- 편집칸 ----------
  function chips(box, items, current, onPick) {
    box.textContent = "";
    items.forEach(function (it) {
      var b = el("button", "chip", it.name); b.type = "button"; b.dataset.v = it.id; b.setAttribute("aria-pressed", String(current === it.id));
      b.addEventListener("click", function () { Array.prototype.forEach.call(box.children, function (c) { c.setAttribute("aria-pressed", String(c === b)); }); onPick(it); });
      box.appendChild(b);
    });
  }
  function field(label, hint, input) { var l = el("label", "field", label); if (hint) l.appendChild(el("small", null, " " + hint)); l.appendChild(input); return l; }
  var LABEL = { headline: "헤드라인", sub: "부제·한 줄 설명", proof: "믿을 이유 하나 (사실만, 작게 들어가요)", cta: "버튼 문구", badTitle: "왼쪽 제목", goodTitle: "오른쪽 제목", button: "버튼 문구" };

  function blockCard(b, i) {
    var spec = G.BLOCKS[b.type], card = el("article", "block-card"), head = el("div", "block-head");
    head.appendChild(el("b", null, String(i + 1).padStart(2, "0") + " " + spec.name));
    var tools = el("div", "block-tools");
    [["위로", function () { move(i, -1); }], ["아래로", function () { move(i, 1); }], ["복제", function () { dup(i); }], ["삭제", function () { remove(i); }]].forEach(function (t) {
      var bt = el("button", "btn btn-small", t[0]); bt.type = "button"; bt.addEventListener("click", t[1]); tools.appendChild(bt);
    });
    head.appendChild(tools); card.appendChild(head);
    if (b.type === "gap") return card;
    if (spec.hint) card.appendChild(el("p", "muted", spec.hint));
    var ex = b.example || {};
    function bind(key, input) { input.value = b[key] || ""; if (ex[key]) input.placeholder = ex[key]; input.addEventListener("input", function () { b[key] = input.value; schedule(); }); }
    if (spec.title) { var ti = el("input"); ti.maxLength = G.MAX_TEXT; ti.autocomplete = "off"; bind("title", ti); card.appendChild(field("제목", "", ti)); }
    spec.fields.forEach(function (k) { var inp = el("input"); inp.maxLength = G.MAX_TEXT; inp.autocomplete = "off"; bind(k, inp); card.appendChild(field(LABEL[k] || k, "", inp)); });
    if (spec.body !== "none") { var ta = el("textarea"); ta.rows = spec.body === "lines" ? 4 : 3; ta.maxLength = G.MAX_BODY; bind("body", ta); card.appendChild(field(spec.body === "lines" ? "내용 (한 줄에 하나, | 로 칸)" : "내용", "", ta)); }
    if (spec.images) {
      var thumbs = el("div", "thumbs"), file = el("input"); file.type = "file"; file.accept = "image/*"; file.multiple = spec.images > 1;
      file.addEventListener("change", function () { addImages(b, this.files, spec.images, thumbs, this); });
      card.appendChild(field("사진 (" + spec.images + "장까지)", "이 기기에서만 그려요", file));
      renderThumbs(b, thumbs); card.appendChild(thumbs);
      var ai = el("label", "check"), cb = el("input"); cb.type = "checkbox"; cb.checked = !!b.ai; cb.addEventListener("change", function () { b.ai = cb.checked; schedule(); });
      ai.appendChild(cb); ai.appendChild(document.createTextNode(" 연출·AI 이미지예요 — 사진에 표기")); card.appendChild(ai);
    }
    return card;
  }
  function renderThumbs(b, box) {
    box.textContent = "";
    b.images.forEach(function (im, j) {
      var wrap = el("span", "thumb"), img = new Image(); img.src = im.src; img.alt = "사진 " + (j + 1); img.width = 72;
      var x = el("button", "btn btn-small", "빼기"); x.type = "button"; x.addEventListener("click", function () { b.images.splice(j, 1); renderThumbs(b, box); schedule(); });
      wrap.appendChild(img); wrap.appendChild(x); box.appendChild(wrap);
    });
  }
  // 사진은 읽자마자 1600px 이하로 줄여(작업 파일이 커지지 않게) data:image/jpeg 로 보관 — 어디에도 보내지 않는다
  function addImages(b, files, cap, thumbs, input) {
    var list = Array.prototype.slice.call(files || []).slice(0, Math.max(0, cap - b.images.length)), fails = 0;
    if (!list.length) { input.value = ""; return; }
    var left = list.length;
    list.forEach(function (f) {
      var reader = new FileReader();
      function done() { if (--left === 0) { input.value = ""; renderThumbs(b, thumbs); schedule(); if (fails) U.flash($("save-png"), "사진 " + fails + "장을 읽지 못했어요 (JPG·PNG인지 확인)"); } }
      reader.onerror = function () { fails++; done(); };
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          try {
            var r = Math.min(1, IMG_MAX / Math.max(img.width, img.height)), c = document.createElement("canvas");
            c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
            c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
            var src = c.toDataURL("image/jpeg", 0.85), im = new Image(); im.src = src; imgCache[src] = im;
            b.images.push({ src: src, w: c.width, h: c.height });
          } catch (e) { fails++; }
          done();
        };
        img.onerror = function () { fails++; done(); };
        img.src = reader.result;
      };
      try { reader.readAsDataURL(f); } catch (e) { fails++; done(); }
    });
  }
  function move(i, d) { var j = i + d; if (j < 0 || j >= page.blocks.length) return; var t = page.blocks[i]; page.blocks[i] = page.blocks[j]; page.blocks[j] = t; rebuild(); }
  function dup(i) { if (page.blocks.length >= G.MAX_BLOCKS) { U.flash($("save-png"), "블록은 " + G.MAX_BLOCKS + "개까지"); return; } var c = G.parse(G.serialize({ template: page.template, theme: page.theme, fontSize: page.fontSize, blocks: [page.blocks[i]] }), data); if (c) { c.blocks[0].example = page.blocks[i].example; page.blocks.splice(i + 1, 0, c.blocks[0]); rebuild(); } }
  function remove(i) { if (!window.confirm("이 블록을 삭제할까요?")) return; page.blocks.splice(i, 1); rebuild(); }
  function rebuild() {
    var box = $("blocks"); box.textContent = "";
    page.blocks.forEach(function (b, i) { box.appendChild(blockCard(b, i)); });
    schedule();
  }
  function setTemplate(tpl) {
    if (page && page.blocks.some(G.hasContent) && !window.confirm("지금 내용을 지우고 '" + tpl.name + "' 템플릿으로 새로 시작할까요? (작업 파일로 먼저 저장해 두세요)")) {
      chips($("templates"), data.templates, page.template, setTemplate); return;
    }
    page = G.fromTemplate(tpl, data);
    chips($("themes"), G.THEMES, page.theme, function (t) { page.theme = t.id; schedule(); });
    rebuild();
  }

  // ---------- 그리기 ----------
  function cover(ctx, img, x, y, w, h, r) {
    ctx.save(); N && roundRect(ctx, x, y, w, h, r || 0); ctx.clip();
    var s = Math.max(w / img.width, h / img.height), dw = img.width * s, dh = img.height * s;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); ctx.restore();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function imageOf(im) { var c = imgCache[im.src]; if (!c) { c = new Image(); c.src = im.src; imgCache[im.src] = c; } return c.complete && c.naturalWidth ? c : null; }
  function val(b, k) { return (b[k] || "").trim(); }

  // 한 번 통과: draw=false 면 높이만 잰다. 모든 치수는 폭 860 기준 × 글자 크기 배수
  function pass(ctx, pg, draw) {
    var th = G.theme(pg.theme), f = pg.fontSize || 1, inner = W - PAD * 2, y = 0;
    function put(text, size, weight, color, x, maxW, lh, align) {
      if (!text) return 0;
      ctx.font = weight + " " + Math.round(size * f) + "px " + FONT;
      var lines = N.wrap(text, maxW, function (s) { return ctx.measureText(s).width; }), start = y;
      lines.forEach(function (ln) {
        if (draw) { ctx.fillStyle = color; ctx.textAlign = align || "left"; ctx.fillText(ln, align === "center" ? x + maxW / 2 : x, y + size * f); ctx.textAlign = "left"; }
        y += Math.round(size * f * (lh || 1.45));
      });
      return y - start;
    }
    function paper(top, bottom) { if (draw) { ctx.fillStyle = th.paper; roundRect(ctx, PAD / 2, top, W - PAD, bottom - top, 20); ctx.fill(); } }
    function title(b) { var t = val(b, "title"); if (t) { put(t, 30, "800", th.ink, PAD, inner, 1.3); y += 14; } }
    function mark(x, cy, ch, bg, fg) { if (!draw) return; ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(x, cy, 15, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = fg; ctx.font = "800 18px " + FONT; ctx.textAlign = "center"; ctx.fillText(ch, x, cy + 6); ctx.textAlign = "left"; }
    function aiTag(x, yy) { if (!draw) return; ctx.font = "600 14px " + FONT; ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(x, yy, 132, 26); ctx.fillStyle = "#fff"; ctx.fillText("연출·AI 이미지", x + 10, yy + 18); }
    function placeholder(x, yy, w, h, label) { if (!draw) return; ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = th.sub; ctx.lineWidth = 2; roundRect(ctx, x, yy, w, h, 14); ctx.stroke(); ctx.restore(); ctx.font = "500 18px " + FONT; ctx.fillStyle = th.sub; ctx.textAlign = "center"; ctx.fillText(label, x + w / 2, yy + h / 2 + 6); ctx.textAlign = "left"; }
    function lines(b) { return G.parseLines(b.body); }

    var B = {
      hero: function (b) {
        var im = b.images[0], img = im && imageOf(im), h = 640;
        if (im) { if (draw && img) cover(ctx, img, 0, y, W, h, 0); else if (draw) placeholder(PAD, y + 40, inner, h - 80, "사진 읽는 중"); if (b.ai && draw) aiTag(PAD, y + h - 40); y += h; }
        var top = y; y += 44;
        var dry = draw; draw = false; var y0 = y;
        put(val(b, "headline"), 46, "800", th.ink, PAD, inner, 1.22); if (val(b, "sub")) { y += 10; put(val(b, "sub"), 23, "500", th.sub, PAD, inner, 1.45); }
        if (val(b, "proof")) { y += 12; put(val(b, "proof"), 16, "500", th.sub, PAD, inner, 1.4); }
        if (val(b, "cta")) y += 28 + 64;
        y += 44; var bottom = y; draw = dry;
        if (draw) { ctx.fillStyle = th.soft; ctx.fillRect(0, top, W, bottom - top); }
        y = y0;
        if (draw) { put(val(b, "headline"), 46, "800", th.ink, PAD, inner, 1.22); if (val(b, "sub")) { y += 10; put(val(b, "sub"), 23, "500", th.sub, PAD, inner, 1.45); } if (val(b, "proof")) { y += 12; put(val(b, "proof"), 16, "500", th.sub, PAD, inner, 1.4); }
          if (val(b, "cta")) { y += 28; ctx.fillStyle = th.accent; roundRect(ctx, PAD, y, inner, 64, 14); ctx.fill(); ctx.font = "700 " + Math.round(22 * f) + "px " + FONT; ctx.fillStyle = th.onAccent; ctx.textAlign = "center"; ctx.fillText(val(b, "cta"), W / 2, y + 40); ctx.textAlign = "left"; y += 64; } }
        y = bottom;
      },
      checklist: function (b) {
        var top = y; y += 40; var yy = y; var dry = draw; draw = false; title(b); lines(b).forEach(function (r) { y += 4; put(r[0], 22, "500", th.ink, PAD + 46, inner - 46, 1.5); y += 8; }); y += 24; var bottom = y; draw = dry;
        if (!draw) return; paper(top, bottom); y = yy; title(b);
        lines(b).forEach(function (r) { y += 4; mark(PAD + 15, y + 16, "✓", th.accent, th.onAccent); put(r[0], 22, "500", th.ink, PAD + 46, inner - 46, 1.5); y += 8; }); y = bottom;
      },
      compare: function (b) {
        var top = y, colW = (inner - 20) / 2, rows = lines(b), yy;
        function body(dr) {
          y = top + 40; title(b);
          var headY = y; if (dr) { ctx.fillStyle = th.soft; roundRect(ctx, PAD, headY, colW, 44, 10); ctx.fill(); ctx.fillStyle = th.accent; roundRect(ctx, PAD + colW + 20, headY, colW, 44, 10); ctx.fill(); }
          var sd = draw; draw = dr; y = headY + 8; put(val(b, "badTitle") || "흔한 선택", 18, "700", th.ink, PAD, colW, 1.5, "center"); y = headY + 8; put(val(b, "goodTitle") || "우리 방법", 18, "700", th.onAccent, PAD + colW + 20, colW, 1.5, "center"); draw = sd;
          y = headY + 60;
          rows.forEach(function (r) {
            var ly = y, sv = draw; draw = dr; if (dr) mark(PAD + 15, y + 15, "×", th.soft, th.sub); put(r[0] || "", 19, "500", th.sub, PAD + 40, colW - 40, 1.5); var y1 = y; y = ly;
            if (dr) mark(PAD + colW + 35, y + 15, "✓", th.accent, th.onAccent); put(r[1] || "", 19, "600", th.ink, PAD + colW + 60, colW - 40, 1.5); draw = sv; y = Math.max(y, y1) + 10;
          });
          y += 24;
        }
        var dry = draw; draw = false; body(false); var bottom = y; draw = dry; if (!draw) return; paper(top, bottom); body(true); y = bottom;
      },
      greeting: function (b) {
        var top = y, im = b.images[0], img = im && imageOf(im);
        function body(dr) {
          y = top + 40; title(b);
          if (im) { if (dr && img) cover(ctx, img, PAD, y, 220, 220, 24); else if (dr) placeholder(PAD, y, 220, 220, "사진"); if (dr && b.ai) aiTag(PAD, y + 190); y += 240; }
          var sd = draw; draw = dr; put(val(b, "body"), 21, "500", th.ink, PAD, inner, 1.7); draw = sd; y += 32;
        }
        var dry = draw; draw = false; body(false); var bottom = y; draw = dry; if (!draw) return; paper(top, bottom); body(true); y = bottom;
      },
      numbers: function (b) {
        var top = y, rows = lines(b), per = Math.min(3, Math.max(1, rows.length)), cw = (inner - 16 * (per - 1)) / per;
        function body(dr) {
          y = top + 40; title(b); var rowY = y, rowH = 0;
          rows.forEach(function (r, i) {
            var col = i % per, x = PAD + col * (cw + 16); if (col === 0 && i) { rowY += rowH + 16; rowH = 0; }
            y = rowY; if (dr) { ctx.fillStyle = th.soft; roundRect(ctx, x, rowY, cw, 1, 14); }
            var sd = draw; draw = false; var y0 = y; y += 22; put(r[0] || "", 34, "800", th.accent, x + 16, cw - 32, 1.2); y += 4; put(r[1] || "", 16, "500", th.sub, x + 16, cw - 32, 1.45); y += 20; var h = y - y0; draw = sd;
            if (dr) { ctx.fillStyle = th.soft; roundRect(ctx, x, y0, cw, h, 14); ctx.fill(); y = y0 + 22; put(r[0] || "", 34, "800", th.accent, x + 16, cw - 32, 1.2); y += 4; put(r[1] || "", 16, "500", th.sub, x + 16, cw - 32, 1.45); }
            rowH = Math.max(rowH, h);
          });
          y = rowY + rowH + 32;
        }
        var dry = draw; draw = false; body(false); var bottom = y; draw = dry; if (!draw) return; paper(top, bottom); body(true); y = bottom;
      },
      photos: function (b) {
        var top = y, n = Math.max(1, Math.min(3, b.images.length || 3)), size = (inner - 12 * (n - 1)) / n;
        function body(dr) {
          y = top + 40; title(b);
          for (var i = 0; i < n; i++) { var x = PAD + i * (size + 12), im = b.images[i], img = im && imageOf(im); if (dr) { if (img) cover(ctx, img, x, y, size, size, 16); else placeholder(x, y, size, size, im ? "읽는 중" : "사진 " + (i + 1)); if (img && b.ai) aiTag(x + 8, y + size - 34); } }
          y += size + 16; var sd = draw; draw = dr; put(val(b, "body"), 18, "500", th.sub, PAD, inner, 1.5); draw = sd; y += 28;
        }
        var dry = draw; draw = false; body(false); var bottom = y; draw = dry; if (!draw) return; paper(top, bottom); body(true); y = bottom;
      },
      steps: function (b) {
        var top = y, rows = lines(b);
        function body(dr) {
          y = top + 40; title(b);
          rows.forEach(function (r, i) {
            if (dr) { ctx.fillStyle = th.accent; ctx.beginPath(); ctx.arc(PAD + 22, y + 22, 22, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = th.onAccent; ctx.font = "800 20px " + FONT; ctx.textAlign = "center"; ctx.fillText(String(i + 1), PAD + 22, y + 29); ctx.textAlign = "left"; }
            var sd = draw; draw = dr; put(r[0] || "", 23, "700", th.ink, PAD + 64, inner - 64, 1.4); put(r[1] || "", 18, "500", th.sub, PAD + 64, inner - 64, 1.5); draw = sd; y += 22;
          });
          y += 18;
        }
        var dry = draw; draw = false; body(false); var bottom = y; draw = dry; if (!draw) return; paper(top, bottom); body(true); y = bottom;
      },
      pricing: function (b) {
        var top = y, rows = lines(b);
        function body(dr) {
          y = top + 40; title(b);
          rows.forEach(function (r) {
            var rec = /추천/.test(r[3] || ""), y0 = y, sd = draw; draw = false; y += 20; put(r[0] || "", 24, "700", th.ink, PAD + 20, inner - 200, 1.3); put(r[1] || "", 17, "500", th.sub, PAD + 20, inner - 200, 1.45); y += 20; var h = y - y0; draw = sd;
            if (dr) { ctx.fillStyle = rec ? th.soft : th.paper; roundRect(ctx, PAD, y0, inner, h, 14); ctx.fill(); ctx.strokeStyle = rec ? th.accent : th.soft; ctx.lineWidth = 2; ctx.stroke();
              y = y0 + 20; put(r[0] || "", 24, "700", th.ink, PAD + 20, inner - 200, 1.3); put(r[1] || "", 17, "500", th.sub, PAD + 20, inner - 200, 1.45);
              ctx.font = "800 " + Math.round(26 * f) + "px " + FONT; ctx.fillStyle = th.accent; ctx.textAlign = "right"; ctx.fillText(r[2] || "", PAD + inner - 20, y0 + h / 2 + 10); ctx.textAlign = "left";
              if (rec) { ctx.fillStyle = th.accent; roundRect(ctx, PAD + inner - 84, y0 - 12, 64, 26, 13); ctx.fill(); ctx.font = "700 14px " + FONT; ctx.fillStyle = th.onAccent; ctx.textAlign = "center"; ctx.fillText("추천", PAD + inner - 52, y0 + 6); ctx.textAlign = "left"; } }
            y = y0 + h + 12;
          });
          y += 20;
        }
        var dry = draw; draw = false; body(false); var bottom = y; draw = dry; if (!draw) return; paper(top, bottom); body(true); y = bottom;
      },
      text: function (b) {
        var top = y; function body(dr) { y = top + 40; title(b); var sd = draw; draw = dr; put(val(b, "body"), 21, "500", th.ink, PAD, inner, 1.7); draw = sd; y += 32; }
        var dry = draw; draw = false; body(false); var bottom = y; draw = dry; if (!draw) return; paper(top, bottom); body(true); y = bottom;
      },
      review: function (b) {
        var top = y, rows = lines(b);
        function body(dr) {
          y = top + 40; title(b);
          rows.forEach(function (r) {
            var y0 = y, sd = draw; draw = false; y += 20; put("“" + (r[0] || "") + "”", 21, "500", th.ink, PAD + 20, inner - 40, 1.6); y += 6; put(r[1] || "", 15, "500", th.sub, PAD + 20, inner - 40, 1.4); y += 18; var h = y - y0; draw = sd;
            if (dr) { ctx.fillStyle = th.soft; roundRect(ctx, PAD, y0, inner, h, 14); ctx.fill(); y = y0 + 20; put("“" + (r[0] || "") + "”", 21, "500", th.ink, PAD + 20, inner - 40, 1.6); y += 6; put(r[1] || "", 15, "500", th.sub, PAD + 20, inner - 40, 1.4); }
            y = y0 + h + 12;
          });
          y += 20;
        }
        var dry = draw; draw = false; body(false); var bottom = y; draw = dry; if (!draw) return; paper(top, bottom); body(true); y = bottom;
      },
      safety: function (b) {
        var top = y, rows = lines(b), kw = 190;
        function body(dr) {
          y = top + 40; title(b);
          rows.forEach(function (r, i) {
            var y0 = y, sd = draw; draw = false; y += 12; put(r[0] || "", 17, "700", th.ink, PAD + 14, kw - 28, 1.5); var y1 = y; y = y0 + 12; put(r[1] || "", 18, "500", th.ink, PAD + kw + 12, inner - kw - 12, 1.5); y = Math.max(y, y1) + 12; var h = y - y0; draw = sd;
            if (dr) { ctx.fillStyle = th.soft; ctx.fillRect(PAD, y0, kw, h); ctx.fillStyle = th.soft; ctx.fillRect(PAD, y0 + h - 1, inner, 1); y = y0 + 12; put(r[0] || "", 17, "700", th.ink, PAD + 14, kw - 28, 1.5); y = y0 + 12; put(r[1] || "", 18, "500", th.ink, PAD + kw + 12, inner - kw - 12, 1.5); }
            y = y0 + h;
          });
          y += 40;
        }
        var dry = draw; draw = false; body(false); var bottom = y; draw = dry; if (!draw) return; paper(top, bottom); body(true); y = bottom;
      },
      faq: function (b) {
        var top = y, rows = lines(b);
        function body(dr) {
          y = top + 40; title(b);
          rows.forEach(function (r) {
            if (dr) mark(PAD + 15, y + 16, "Q", th.accent, th.onAccent); var sd = draw; draw = dr; put(r[0] || "", 21, "700", th.ink, PAD + 44, inner - 44, 1.45); y += 4;
            if (dr) mark(PAD + 15, y + 16, "A", th.soft, th.sub); put(r[1] || "", 19, "500", th.sub, PAD + 44, inner - 44, 1.5); draw = sd; y += 22;
          });
          y += 18;
        }
        var dry = draw; draw = false; body(false); var bottom = y; draw = dry; if (!draw) return; paper(top, bottom); body(true); y = bottom;
      },
      cta: function (b) {
        var top = y; function body(dr) { y = top + 48; var sd = draw; draw = dr; put(val(b, "title"), 32, "800", th.onAccent, PAD, inner, 1.3, "center"); if (val(b, "sub")) { y += 8; put(val(b, "sub"), 19, "500", th.onAccent, PAD, inner, 1.45, "center"); } draw = sd;
          if (val(b, "button")) { y += 24; if (dr) { ctx.fillStyle = th.paper; roundRect(ctx, PAD + 80, y, inner - 160, 64, 14); ctx.fill(); ctx.font = "700 " + Math.round(22 * f) + "px " + FONT; ctx.fillStyle = th.accent; ctx.textAlign = "center"; ctx.fillText(val(b, "button"), W / 2, y + 40); ctx.textAlign = "left"; } y += 64; } y += 48; }
        var dry = draw; draw = false; body(false); var bottom = y; draw = dry; if (!draw) return; ctx.fillStyle = th.accent; ctx.fillRect(0, top, W, bottom - top); body(true); y = bottom;
      },
      box: function (b) {
        var top = y; function body(dr) { y = top + 24; var sd = draw; draw = dr; put(val(b, "body"), 19, "500", th.ink, PAD + 20, inner - 40, 1.6); draw = sd; y += 24; }
        var dry = draw; draw = false; body(false); var bottom = y; draw = dry; if (!draw) return; ctx.fillStyle = th.soft; roundRect(ctx, PAD, top, inner, bottom - top, 14); ctx.fill(); body(true); y = bottom;
      },
      gap: function () { y += 40; }
    };
    pg.blocks.forEach(function (b, i) { if (i) y += b.type === "gap" ? 0 : 24; (B[b.type] || B.gap)(b); });
    return y + 24;
  }
  function measure(pg) { var c = document.createElement("canvas"); c.width = W; c.height = 10; return pass(c.getContext("2d"), pg, false); }
  // 조각 하나를 캔버스에 그린다 — [y0,y1] 범위만 보이게 옮겨서 전체를 그린다(잘림은 캔버스 밖으로)
  function drawSlice(pg, y0, y1, scale) {
    var c = document.createElement("canvas"), th = G.theme(pg.theme); c.width = Math.round(W * scale); c.height = Math.round((y1 - y0) * scale);
    var ctx = c.getContext("2d"); ctx.scale(scale, scale); ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, y1 - y0); ctx.translate(0, -y0); pass(ctx, pg, true); return c;
  }
  function render() {
    var total = measure(page); lastHeight = total;
    var box = $("preview"); box.textContent = "";
    G.slices(total, PREVIEW_SLICE).forEach(function (s) { var c = drawSlice(page, s[0], s[1], 1); c.className = "slice"; box.appendChild(c); });
    $("size-info").textContent = "전체 높이 " + Math.round(total) + "px (폭 " + W + "px) · 블록 " + page.blocks.length + "개 · 휴대폰 화면으로 약 " + Math.round(total / 900) + "장";
    renderQuality(total);
  }
  function renderQuality(total) {
    var tpl = data.templates.filter(function (t) { return t.id === page.template; })[0];
    var q = G.quality(page, { height: total, scan: function (text) { return rules ? A.scan(text, { kind: (page.template === "food" || page.template === "restaurant") ? "food" : "general", online: page.template === "online" }, rules) : []; } });
    var box = $("quality"); box.textContent = ""; box.className = "result quality mk" + (q.score < 70 ? " is-no" : "");
    box.appendChild(el("p", "big", q.score + " / 100 · " + q.verdict));
    var ul = el("ul", "checks");
    q.items.forEach(function (it) { var li = el("li", it.ok === true ? "is-ok" : it.ok === false ? "is-bad" : ""); li.appendChild(el("span", "mark", MARK[it.ok])); li.appendChild(document.createTextNode(" " + it.text)); ul.appendChild(li); });
    box.appendChild(ul);
    if (tpl && tpl.basis && tpl.basis.length) {
      var bs = el("div", "basis"); bs.appendChild(el("h3", null, "안심 정보 근거 조항"));
      var bl = el("ul"); tpl.basis.forEach(function (b) { var li = el("li"), a = el("a", null, b.law + " " + b.article); a.href = T.safeUrl(b.url) || "#"; a.target = "_blank"; a.rel = "noopener"; li.appendChild(a); li.appendChild(document.createTextNode(" — " + b.quote)); bl.appendChild(li); }); bs.appendChild(bl); box.appendChild(bs);
    }
    box.appendChild(el("p", "checked", "자동 점검은 참고만 하세요 — 올리기 전 마지막 확인은 사장님 몫이에요."));
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(function () { if (document.fonts && document.fonts.load) document.fonts.load('800 46px "Pretendard Variable"').then(render, render); else render(); }, 250); }

  // ---------- 저장 ----------
  function download(blob, name) { var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); }
  function saveImages(type, btn) {
    var total = measure(page), sliceH = Number($("slice").value), scale = Number($("scale").value), parts = G.slices(total, sliceH), ext = type === "image/jpeg" ? "jpg" : "png", i = 0;
    var base = (page.blocks[0] && val(page.blocks[0], "headline") || "상세페이지").replace(/[\\/:*?"<>|]/g, "").slice(0, 30);
    function next() {
      if (i >= parts.length) { U.flash(btn, parts.length + "장 저장했어요 — 안 보이면 다운로드 폴더 확인"); return; }
      var s = parts[i], idx = String(i + 1).padStart(2, "0");
      try {
        drawSlice(page, s[0], s[1], scale).toBlob(function (blob) {
          if (!blob) { U.flash(btn, "이미지를 만들지 못했어요 — 나눠 저장 크기를 줄이거나 선명도 1배로"); return; }
          download(blob, base + "_" + idx + "." + ext); i++; setTimeout(next, 500);
        }, type, 0.9);
      } catch (e) { U.flash(btn, "저장 못 함 — 사진을 빼거나 다른 브라우저로"); }
    }
    next();
  }

  // ---------- 시작 ----------
  Promise.all(["../data/page-templates.json", "../data/adcheck-rules.json"].map(function (u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }))
    .then(function (d) {
      data = d[0]; rules = d[1];
      var sel = $("add-type"); Object.keys(G.BLOCKS).forEach(function (k) { var o = el("option", null, G.BLOCKS[k].name); o.value = k; sel.appendChild(o); });
      chips($("templates"), data.templates, data.templates[0].id, setTemplate);
      setTemplate(data.templates[0]);
      U.profileBar($("pbar"), function (p) {
        // 가게 카드 → 첫 화면 부제·믿을 이유, 안심 정보 문의처는 예시로만(문구는 사장님이 쓴다)
        var h = page.blocks[0]; if (h && h.type === "hero") { if (!h.sub && p.product) h.sub = p.product; if (!h.proof && p.proof) h.proof = p.proof.split("\n")[0]; }
        rebuild();
      });
      document.querySelectorAll("input[name=fontSize]").forEach(function (r) { r.addEventListener("change", function () { page.fontSize = Number(r.value); schedule(); }); });
      $("add-block").addEventListener("click", function () { if (page.blocks.length >= 40) { U.flash(this, "블록은 40개까지"); return; } page.blocks.push(G.newBlock($("add-type").value)); rebuild(); });
      $("fill-example").addEventListener("click", function () { page.blocks.forEach(function (b) { Object.keys(b.example || {}).forEach(function (k) { if (!b[k]) b[k] = b.example[k]; }); }); rebuild(); U.flash(this, "예시를 채웠어요 — 내 내용으로 고치세요"); });
      $("save-work").addEventListener("click", function () { try { download(new Blob([G.serialize(page)], { type: "application/json" }), "상세페이지_작업.json"); U.flash(this, "저장했어요"); } catch (e) { U.flash(this, "저장 못 함"); } });
      $("open-work").addEventListener("change", function () {
        var f = this.files && this.files[0], input = this; if (!f) return;
        var reader = new FileReader();
        reader.onload = function () { var p = G.parse(reader.result, data); input.value = ""; if (!p) { U.flash($("save-work"), "작업 파일이 아니에요"); return; } page = p; if (p.truncated) U.flash($("save-work"), "블록은 " + G.MAX_BLOCKS + "개까지 — 넘친 블록은 뺐어요"); chips($("templates"), data.templates, page.template, setTemplate); chips($("themes"), G.THEMES, page.theme, function (t) { page.theme = t.id; schedule(); }); document.querySelectorAll("input[name=fontSize]").forEach(function (r) { r.checked = Number(r.value) === page.fontSize; }); rebuild(); };
        reader.onerror = function () { U.flash($("save-work"), "파일을 읽지 못했어요"); };
        reader.readAsText(f);
      });
      $("copy-text").addEventListener("click", function () { var b = this; U.copyText(G.toText(page)).then(function () { U.flash(b, "복사했어요"); }, function () { U.flash(b, "복사 못 함"); }); });
      $("save-png").addEventListener("click", function () { saveImages("image/png", this); });
      $("save-jpg").addEventListener("click", function () { saveImages("image/jpeg", this); });
      $("phone").addEventListener("click", function () { var on = this.getAttribute("aria-pressed") !== "true"; this.setAttribute("aria-pressed", String(on)); $("preview").classList.toggle("is-phone", on); });
    }).catch(function () { $("quality").className = "result is-err"; $("quality").textContent = "템플릿을 불러오지 못했어요. 새로고침해 주세요."; });
})();

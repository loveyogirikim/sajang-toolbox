/* 가게 안내문 화면 — 캔버스에 직접 그려 미리보기와 이미지 저장을 한 번에 (새 라이브러리 없음).
 * 로고는 FileReader로 읽어 메모리에만 두고 그린다 — 어디에도 보내지 않는다. */
(function () {
  "use strict";
  var N = window.NoticeCore, U = window.UI, el = U.el, $ = U.$;
  var FONT = '"Pretendard Variable", Pretendard, "Malgun Gothic", sans-serif', INK = "#191b22", SUB = "#616876";
  var form = $("f-notice"), canvas = $("card"), queued = false, logo = null;
  var state = { template: "closed", theme: "indigo", size: "kakao" };

  function values() {
    var e = form.elements, rows = [];
    for (var i = 0; i < 4; i++) rows.push({ label: e["rl" + i].value, text: e["rv" + i].value });
    return { template: state.template, theme: state.theme, size: state.size, title: e.title.value, sub: e.sub.value, rows: rows,
      highlight: e.highlight.value, body: e.body.value, footer: { name: e.fname.value, address: e.faddress.value, contact: e.fcontact.value } };
  }

  // 칩 묶음(템플릿·색·크기): 하나만 눌린 상태
  function chips(box, items, key, onPick) {
    items.forEach(function (it) {
      var b = el("button", "chip", it.name); b.type = "button"; b.dataset.v = it.id;
      b.setAttribute("aria-pressed", String(state[key] === it.id));
      b.addEventListener("click", function () {
        state[key] = it.id;
        Array.prototype.forEach.call(box.children, function (c) { c.setAttribute("aria-pressed", String(c === b)); });
        onPick(it); schedule();
      });
      box.appendChild(b);
    });
  }

  // 템플릿을 고르면 칸 이름과 예시(placeholder)를 바꾸고, "직전 템플릿의 예시 그대로"인 칸만 새 예시로 바꾼다 — 사용자가 고친 칸은 남긴다(2026-09-30 검수)
  var example = {};
  function applyTemplate(t) {
    var e = form.elements;
    e.title.placeholder = "예: " + t.title; e.sub.placeholder = "예: " + t.sub; e.highlight.placeholder = "예: " + t.highlight;
    e.body.placeholder = t.body ? "예: " + t.body.split("\n")[0] : "";
    t.rows.forEach(function (label, i) { e["rl" + i].value = label; });
    ["title", "sub", "highlight", "body"].forEach(function (k) {
      if (!e[k].value.trim() || e[k].value === example[k]) e[k].value = t[k];
      example[k] = t[k];
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // 같은 순서로 두 번: 높이만 재기(draw=false) → 그리기. 모든 치수는 폭 1080 기준 × k
  function pass(ctx, blocks, th, W, draw) {
    var k = W / 1080, PAD = 72 * k, X = PAD, innerW = W - PAD * 2, y = 0, headEnd = 0, footStart = 0;
    function put(str, size, weight, color, x, maxW, lh) {
      ctx.font = weight + " " + Math.round(size * k) + "px " + FONT;
      var lines = N.wrap(str, maxW, function (s) { return ctx.measureText(s).width; });
      lines.forEach(function (ln) {
        if (draw) { ctx.fillStyle = color; ctx.fillText(ln, x, y + size * k); }
        y += Math.round(size * k * (lh || 1.4));
      });
      return lines.length;
    }
    var has = {}; blocks.forEach(function (b) { has[b.kind] = b; });
    var titleW = innerW - (logo ? 170 * k : 0);
    // 머리 띠
    y = PAD;
    if (draw) { ctx.fillStyle = th.ink; ctx.globalAlpha = 0.85; }
    put(has.label.text, 26, 700, th.ink, X, titleW, 1.6);
    if (draw) ctx.globalAlpha = 1;
    y += 6 * k;
    put(has.title.text, 70, 800, th.ink, X, titleW, 1.22);
    if (has.sub) { y += 10 * k; put(has.sub.text, 36, 500, th.ink, X, titleW, 1.4); }
    y += PAD * 0.8;
    headEnd = y;
    y += 44 * k;
    // 핵심 정보 상자 — 상자 배경을 먼저 칠해야 글자가 덮이지 않으므로, 높이만 재는 한 바퀴(dry) 뒤에 그린다
    if (has.rows) {
      var boxTop = y, rowPad = 28 * k, labelW = 200 * k;
      function rowsPass(dry) {
        y = boxTop + rowPad;
        has.rows.rows.forEach(function (r, i) {
          var ly = y, saved = draw; draw = draw && !dry;
          if (r.label) { put(r.label, 28, 700, th.bg, X + rowPad, labelW - rowPad, 1.5); }
          var ty = y; y = ly;
          put(r.text, 36, 600, INK, X + rowPad + labelW, innerW - rowPad * 2 - labelW, 1.5);
          y = Math.max(y, ty) + 10 * k;
          if (draw && i < has.rows.rows.length - 1) { ctx.fillStyle = "#e6e8ee"; ctx.fillRect(X + rowPad, y, innerW - rowPad * 2, 2 * k); }
          y += 10 * k; draw = saved;
        });
        y += rowPad - 20 * k;
      }
      rowsPass(true);
      if (draw) { ctx.save(); ctx.fillStyle = th.soft; roundRect(ctx, X, boxTop, innerW, y - boxTop, 20 * k); ctx.fill(); ctx.restore(); rowsPass(false); }
      y += 32 * k;
    }
    // 강조 한 줄
    if (has.highlight) {
      var hTop = y, hPad = 24 * k, savedDraw = draw;
      function highlightText() { y = hTop + hPad; put(has.highlight.text, 34, 700, th.bg, X + 40 * k, innerW - 64 * k, 1.45); y += hPad - 12 * k; }
      draw = false; highlightText(); draw = savedDraw; // 높이만 재고
      if (draw) { ctx.fillStyle = th.soft; ctx.fillRect(X + 10 * k, hTop, innerW - 10 * k, y - hTop); ctx.fillStyle = th.bg; ctx.fillRect(X, hTop, 10 * k, y - hTop); highlightText(); }
      y += 32 * k;
    }
    // 안내 사항
    if (has.body) {
      put(has.body.label, 28, 700, th.bg, X, innerW, 1.5); y += 6 * k;
      has.body.lines.forEach(function (ln) {
        if (draw) { ctx.fillStyle = th.bg; ctx.beginPath(); ctx.arc(X + 10 * k, y + 20 * k, 5 * k, 0, Math.PI * 2); ctx.fill(); }
        put(ln, 32, 400, INK, X + 34 * k, innerW - 34 * k, 1.5); y += 6 * k;
      });
      y += 24 * k;
    }
    var contentEnd = y;
    // 바닥
    if (has.footer) {
      footStart = y + 16 * k; y = footStart + 34 * k;
      has.footer.lines.forEach(function (ln, i) { put(ln, i === 0 ? 30 : 26, i === 0 ? 700 : 400, i === 0 ? INK : SUB, X, innerW, 1.5); });
      y += 30 * k;
    } else { y += PAD * 0.5; }
    return { headEnd: headEnd, footStart: footStart, contentEnd: contentEnd, total: y, k: k };
  }

  // 두 번째 그리기에서 실제 위치를 알기 위해 머리·바닥 배경을 먼저 칠한다
  function draw() {
    var f = values(), th = N.THEMES[f.theme] || N.THEMES.indigo, sz = N.SIZES[f.size] || N.SIZES.kakao, blocks = N.blocks(f);
    var W = sz.w, ctx = canvas.getContext("2d");
    canvas.width = W; canvas.height = sz.minH;
    var m = pass(ctx, blocks, th, W, false);
    var H = Math.max(sz.minH, m.total), footH = m.footStart ? m.total - m.footStart : 0;
    var extra = H - m.total, footStart = m.footStart ? m.footStart + extra : 0;
    canvas.height = H; ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
    var g = ctx.createLinearGradient(0, 0, W, m.headEnd); g.addColorStop(0, th.bg); g.addColorStop(1, th.bg2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, m.headEnd);
    if (footStart) { ctx.fillStyle = "#f1f3f6"; ctx.fillRect(0, footStart, W, H - footStart); }
    // 바닥이 아래로 밀렸으면 본문 그리기 뒤 바닥만 다시 그리기 위해 두 번 지나간다
    pass(ctx, blocks.filter(function (b) { return b.kind !== "footer"; }), th, W, true);
    if (footStart) {
      var fb = blocks.filter(function (b) { return b.kind === "footer"; })[0], k = m.k, y = footStart + 34 * k;
      fb.lines.forEach(function (ln, i) {
        ctx.font = (i === 0 ? "700 " : "400 ") + Math.round((i === 0 ? 30 : 26) * k) + "px " + FONT; ctx.fillStyle = i === 0 ? INK : SUB;
        ctx.fillText(ln, 72 * k, y + (i === 0 ? 30 : 26) * k); y += Math.round((i === 0 ? 30 : 26) * k * 1.5);
      });
    }
    if (logo) {
      var k2 = m.k, s = 140 * k2, lx = W - 72 * k2 - s, ly = 72 * k2;
      ctx.save(); roundRect(ctx, lx, ly, s, s, 24 * k2); ctx.clip(); ctx.fillStyle = "#ffffff"; ctx.fillRect(lx, ly, s, s);
      var r = Math.min(s / logo.width, s / logo.height), dw = logo.width * r, dh = logo.height * r;
      ctx.drawImage(logo, lx + (s - dw) / 2, ly + (s - dh) / 2, dw, dh); ctx.restore();
    }
    canvas.setAttribute("aria-label", N.toText(f));
  }

  function render() {
    if (document.fonts && document.fonts.load) return document.fonts.load('700 40px "Pretendard Variable"', N.toText(values())).then(draw, draw);
    draw(); return Promise.resolve();
  }
  // requestAnimationFrame은 숨은 탭에서 멈추므로 짧은 타이머로 모아 그린다
  function schedule() { if (queued) return; queued = true; setTimeout(function () { queued = false; render(); }, 40); }

  // 핵심 정보 4줄 입력칸
  (function buildRows() {
    var box = $("rows");
    for (var i = 0; i < 4; i++) {
      var l = el("input"), v = el("input"); l.name = "rl" + i; v.name = "rv" + i; l.maxLength = 12; v.maxLength = 60; l.autocomplete = v.autocomplete = "off";
      l.setAttribute("aria-label", "항목 이름 " + (i + 1)); v.setAttribute("aria-label", "내용 " + (i + 1)); v.placeholder = "내용";
      box.appendChild(l); box.appendChild(v);
    }
  })();
  chips($("templates"), N.TEMPLATES, "template", function (t) { applyTemplate(t); });
  chips($("themes"), Object.keys(N.THEMES).map(function (k) { return { id: k, name: N.THEMES[k].name }; }), "theme", function () {});
  chips($("sizes"), Object.keys(N.SIZES).map(function (k) { return { id: k, name: N.SIZES[k].name }; }), "size", function () {});
  applyTemplate(N.template(state.template));

  form.addEventListener("input", schedule);
  form.addEventListener("change", schedule);
  // 로고를 못 읽으면 옛 로고를 지우고 알린다(2026-09-30 검수)
  form.elements.logo.addEventListener("change", function () {
    var file = this.files && this.files[0], input = this;
    logo = null;
    if (!file) { schedule(); return; }
    function fail() { logo = null; input.value = ""; U.flash($("save"), "로고 이미지를 읽지 못했어요 (PNG·JPG 파일인지 확인)"); schedule(); }
    var reader = new FileReader();
    reader.onerror = fail;
    reader.onload = function () { var img = new Image(); img.onload = function () { logo = img; schedule(); }; img.onerror = fail; img.src = reader.result; };
    try { reader.readAsDataURL(file); } catch (e) { fail(); }
  });
  // 저장·인쇄가 실패하면(캔버스 오염·용량·인앱 브라우저) 버튼에 알린다 — 콘솔에만 남기지 않는다(2026-09-30 검수)
  $("save").addEventListener("click", function () {
    var b = this;
    render().then(function () {
      try {
        canvas.toBlob(function (blob) {
          if (!blob) { U.flash(b, "이미지를 만들지 못했어요 — 내용을 줄이거나 다른 브라우저로"); return; }
          var a = document.createElement("a");
          var name = (N.clean(form.elements.title.value) || N.template(state.template).label).replace(/[\\/:*?"<>|]/g, "").slice(0, 40);
          a.href = URL.createObjectURL(blob); a.download = name + ".png";
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
          U.flash(b, "저장했어요 — 안 보이면 다운로드 폴더 확인");
        }, "image/png");
      } catch (e) { U.flash(b, "저장 못 함 — 로고를 빼거나 다른 브라우저로"); }
    }, function () { U.flash(b, "그리지 못했어요"); });
  });
  $("copy").addEventListener("click", function () {
    var b = this;
    U.copyText(N.toText(values())).then(function () { U.flash(b, "복사했어요"); }, function () { U.flash(b, "복사 못 함"); });
  });
  $("print").addEventListener("click", function () {
    var b = this;
    render().then(function () { try { window.print(); } catch (e) { U.flash(b, "인쇄 창을 열지 못했어요"); } }, function () { U.flash(b, "그리지 못했어요"); });
  });
  render();
})();

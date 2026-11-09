/* 팔리는 한 줄·가게 이야기 화면 — 조립은 StoryCore, 여기서는 읽고 그린다(textContent만). 가게 카드는 UI.profileBar로 불러온다. */
(function () {
  "use strict";
  var S = window.StoryCore, P = window.ProfileCore, U = window.UI, el = U.el, $ = U.$;
  var form = $("f-story"), out = $("out"), profile = null, timer = null;

  function build() {
    var box = $("fields");
    S.FIELDS.forEach(function (f) {
      var label = el("label", "field"), step = el("b", "step", f.step), ta = el("textarea");
      label.appendChild(step); label.appendChild(document.createTextNode(f.label)); label.appendChild(el("small", null, " " + f.hint));
      ta.name = f.id; ta.rows = f.id === "plan" ? 3 : 2; ta.maxLength = 300;
      label.appendChild(ta); box.appendChild(label);
    });
  }
  function values() { var o = {}; S.FIELDS.forEach(function (f) { o[f.id] = form.elements[f.id].value; }); return S.clean(o); }
  function fillFrom(p) {
    profile = p;
    var pre = S.prefill(p);
    S.FIELDS.forEach(function (f) { if (!form.elements[f.id].value.trim() && pre[f.id]) form.elements[f.id].value = pre[f.id]; });
    render();
  }

  function copyBtn(text) {
    var b = el("button", "btn btn-small", "복사"); b.type = "button";
    b.addEventListener("click", function () { U.copyText(text).then(function () { U.flash(b, "복사했어요"); }, function () { U.flash(b, "복사 못 함"); }); });
    return b;
  }
  function section(title, items, render) {
    var h = el("h2", null, title), ul = el("ul", "formulas");
    items.forEach(function (it) { var li = el("li"); render(li, it); li.appendChild(copyBtn(it.text)); ul.appendChild(li); });
    out.appendChild(h); out.appendChild(ul);
  }
  function render() {
    var sb7 = values(), pr = profile || {};
    out.textContent = "";
    var miss = S.missing(sb7);
    out.appendChild(el("p", "muted", miss.length ? "빈 칸 " + miss.length + "개는 [확인 필요]로 들어가요 — 채울수록 문장이 완성돼요." : "11칸을 다 채웠어요."));
    section("한 줄 정의문 3안", S.oneLiners(sb7, pr), function (li, o) { li.appendChild(el("b", null, o.name)); li.appendChild(el("p", null, o.text)); });
    section("첫 화면 헤드라인 5안", S.headlines(sb7, pr), function (li, h) { li.appendChild(el("b", null, h.formula + " · " + h.who)); li.appendChild(el("p", null, h.text)); });
    section("행동 촉구 3곳", S.ctas(sb7, pr), function (li, c) { li.appendChild(el("b", null, c.where)); li.appendChild(el("p", null, c.text)); });
    var ps = S.prompts(P.toText(pr), pr);
    section("AI에 물어볼 프롬프트 (가게 카드가 앞에 붙어요)", ps, function (li, p) { li.appendChild(el("b", null, p.name)); var pre = el("pre", "prompt", p.text); li.appendChild(pre); });
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(render, 200); }

  build();
  profile = U.profileBar($("pbar"), fillFrom);
  if (profile) fillFrom(profile); else render();
  form.addEventListener("input", schedule);
  $("copy-all").addEventListener("click", function () {
    var b = this; U.copyText(S.toText(values(), profile || {})).then(function () { U.flash(b, "복사했어요"); }, function () { U.flash(b, "복사 못 함"); });
  });
  $("print").addEventListener("click", function () { try { window.print(); } catch (e) { U.flash(this, "인쇄 창을 못 열었어요"); } });
})();

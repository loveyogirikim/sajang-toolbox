/* 직원 복무 길잡이 화면 — 데이터는 data/leave-guide.json, 화면은 textContent로만. 주소 #id로 항목 열기. */
(function () {
  "use strict";
  var T = window.ToolboxCore, U = window.UI, el = U.el, $ = U.$;
  var items = [];

  function fields(it) { return { title: it.title, aka: it.aka, body: [it.who, it.period, it.requirements.join(" "), it.note || ""].join(" ") }; }
  // 주소 끝(#id)이 깨진 글자여도 길잡이 전체가 죽지 않게 (검수 지적)
  function current() { try { return decodeURIComponent(location.hash.slice(1)); } catch (e) { return ""; } }

  function renderList() {
    var list = T.rank(items, $("q").value, fields), ul = $("list"), cur = current();
    ul.textContent = "";
    list.forEach(function (it) {
      var li = el("li"), b = el("button", null, it.title);
      b.type = "button"; b.setAttribute("aria-current", String(it.id === cur));
      b.addEventListener("click", function () { location.hash = it.id; });
      li.appendChild(b); ul.appendChild(li);
    });
    $("empty").hidden = list.length > 0;
  }

  function listSection(box, title, list) {
    if (!list || !list.length) return;
    var ul = el("ul");
    box.appendChild(el("h3", null, title));
    list.forEach(function (t) { ul.appendChild(el("li", null, t)); });
    box.appendChild(ul);
  }

  function renderDetail(scroll) {
    var id = current(), it = items.filter(function (x) { return x.id === id; })[0], box = $("detail");
    box.textContent = "";
    if (!it) { box.appendChild(el("p", "privacy", "목록에서 항목을 고르면 여기에 요건·기한·서류가 나와요.")); return; }
    document.title = it.title + " — 직원 복무 길잡이 | 사장님 업무 도구함";
    box.appendChild(el("h2", null, it.title));
    var dl = el("dl", "facts");
    [["대상", it.who], ["기간", it.period], ["신청·통보 기한", it.deadline], ["임금", it.paid], ["5명 미만 사업장", it.under5]].forEach(function (p) {
      dl.appendChild(el("dt", null, p[0])); dl.appendChild(el("dd", null, p[1]));
    });
    box.appendChild(dl);
    listSection(box, "요건", it.requirements);
    if (it.steps.length) {
      var ol = el("ol", "steps");
      box.appendChild(el("h3", null, "절차"));
      it.steps.forEach(function (s) {
        var li = el("li");
        li.appendChild(el("b", null, s.when + " · " + s.who)); li.appendChild(el("span", null, s.what)); ol.appendChild(li);
      });
      box.appendChild(ol);
    }
    listSection(box, "필요한 서류", it.documents);
    listSection(box, "자주 하는 실수", it.dont);
    box.appendChild(el("h3", null, "근거 조항"));
    it.basis.forEach(function (b) {
      var q = el("blockquote", "quote"), c = el("cite"), a = el("a", null, b.law + " " + b.article);
      a.href = T.safeUrl(b.url) || "#"; a.target = "_blank"; a.rel = "noopener";
      q.appendChild(el("p", null, b.quote)); c.appendChild(a); q.appendChild(c); box.appendChild(q);
    });
    if (it.uncertain.length) { var u = el("section", "uncertain"); listSection(u, "확인 못 한 것", it.uncertain); box.appendChild(u); }
    if (it.note) box.appendChild(el("p", null, it.note));
    box.appendChild(el("p", "checked", "조문 확인일 " + it.checkedAt));
    if (scroll && window.matchMedia("(max-width: 820px)").matches) box.scrollIntoView({ block: "start" });
  }

  function start(g) {
    items = g.items;
    $("checked").textContent = g.checkedAt;
    g.chips.forEach(function (c) {
      var li = el("li"), b = el("button", "chip", c);
      b.type = "button";
      b.addEventListener("click", function () { $("q").value = c; renderList(); });
      li.appendChild(b); $("chips").appendChild(li);
    });
    $("q").addEventListener("input", renderList);
    $("search-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var first = $("list").querySelector("button");
      if (first) first.click();
    });
    window.addEventListener("hashchange", function () { renderList(); renderDetail(true); });
    renderList(); renderDetail(false);
  }

  fetch("../data/leave-guide.json")
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(start)
    .catch(function () { $("detail").textContent = "길잡이를 불러오지 못했어요. 새로고침해 주세요."; });
})();

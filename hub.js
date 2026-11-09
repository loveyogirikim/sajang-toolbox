/* 허브 화면 — 문제로 찾기·업무별 목록·소개 대화상자. 화면은 textContent로만 그린다. */
(function () {
  "use strict";
  var T = window.ToolboxCore, U = window.UI, el = U.el, $ = U.$;
  var KIND = { "new": "이 사이트 도구", ours: "우리 회사 다른 도구" };
  var state = { apps: [], cat: "전체", q: "" };

  function fields(a) { return { title: a.name, aka: a.tags, body: [a.one, a.desc, a.cat].join(" ") }; }

  function render() {
    var list = T.rank(state.apps, state.q, fields).filter(function (a) { return state.cat === "전체" || a.cat === state.cat; });
    var box = $("apps");
    box.textContent = "";
    list.forEach(function (a) {
      var card = el("article", "app-card"), h = el("h3"), b = el("button", null, a.name);
      b.type = "button";
      b.addEventListener("click", function () { openIntro(a); });
      h.appendChild(b);
      card.appendChild(el("span", "app-cat", a.cat));
      card.appendChild(h);
      card.appendChild(el("p", null, a.one));
      card.appendChild(el("span", "app-kind" + (a.kind === "new" ? " is-new" : ""), KIND[a.kind]));
      box.appendChild(card);
    });
    $("count").textContent = list.length + "개";
    $("empty").hidden = list.length > 0;
    Array.prototype.forEach.call($("cats").children, function (t) { t.setAttribute("aria-pressed", String(t.dataset.cat === state.cat)); });
    // ponytail: 검색어를 주소에 되쓰지 않는다 — 새로고침·공유 때 서버 요청에 실리지 않게(검수 지적). 들어오는 ?q= 링크만 읽는다.
  }

  function openIntro(a) {
    var go = $("intro-go"), url = T.safeUrl(a.url), tags = $("intro-tags");
    $("intro-meta").textContent = a.cat + " · " + KIND[a.kind];
    $("intro-title").textContent = a.name;
    $("intro-desc").textContent = a.desc;
    tags.textContent = "";
    a.tags.slice(0, 8).forEach(function (t) { tags.appendChild(el("li", null, t)); });
    go.hidden = !url;
    if (url) {
      go.href = url;
      if (/^https:/.test(url)) { go.target = "_blank"; go.rel = "noopener"; go.textContent = "열기 (새 창)"; }
      else { go.removeAttribute("target"); go.removeAttribute("rel"); go.textContent = "열기"; }
    }
    $("intro").showModal();
  }

  function search(q) { $("q").value = q; state.q = q.trim(); render(); }

  function start(apps, site) {
    state.apps = apps.apps;
    apps.chips.forEach(function (c) {
      var li = el("li"), b = el("button", "chip", c);
      b.type = "button";
      b.addEventListener("click", function () { search(c); $("list-title").scrollIntoView({ block: "start" }); });
      li.appendChild(b); $("chips").appendChild(li);
    });
    ["전체"].concat(apps.cats).forEach(function (c) {
      var b = el("button", null, c);
      b.type = "button"; b.dataset.cat = c;
      b.addEventListener("click", function () { state.cat = c; render(); });
      $("cats").appendChild(b);
    });
    $("ask-link").href = "mailto:" + site.contact + "?subject=" + encodeURIComponent(site.askSubject) + "&body=" + encodeURIComponent(site.askBody);
    $("ask-mail").textContent = site.contact;
    $("search-form").addEventListener("submit", function (e) { e.preventDefault(); search($("q").value); });
    $("q").addEventListener("input", function () { state.q = $("q").value.trim(); render(); });
    $("intro").addEventListener("click", function (e) { if (e.target === this) this.close(); });
    search(new URLSearchParams(location.search).get("q") || "");
  }

  Promise.all(["data/apps.json", "data/site.json"].map(function (u) {
    return fetch(u).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); });
  })).then(function (d) { start(d[0], d[1]); }).catch(function () {
    var e = $("empty");
    e.hidden = false; e.textContent = "목록을 불러오지 못했어요. 새로고침해 주세요.";
  });
})();

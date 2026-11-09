/* 조 편성·자리 배치 화면 — 배치는 TeamCore, 여기서는 읽고 그린다(textContent만). */
(function () {
  "use strict";
  var C = window.TeamCore, U = window.UI, el = U.el, $ = U.$;
  var form = $("f-team"), out = $("r-team"), last = null;

  function mode() { return form.elements.mode.value; }
  function syncMode() {
    var teams = mode() === "teams";
    $("opt-teams").hidden = !teams; $("opt-seats").hidden = teams; $("balance-row").hidden = !teams;
    $("apart-label").textContent = teams ? "다른 조로 떨어뜨릴 두 사람" : "붙어 앉지 않게 할 두 사람";
    $("together-label").textContent = teams ? "같은 조로 묶을 두 사람" : "옆자리(앞뒤·좌우)에 앉힐 두 사람";
  }
  function prefix(label) { return function (t) { return label + " — " + t; }; }

  function drawTeams(teams) {
    var g = el("div", "teams");
    teams.forEach(function (team, i) {
      var box = el("section", "team"), ol = el("ol");
      box.appendChild(el("h3", null, (i + 1) + "조 · " + team.length + "명"));
      team.forEach(function (p) { ol.appendChild(el("li", null, p.tag ? p.name + " (" + p.tag + ")" : p.name)); });
      box.appendChild(ol); g.appendChild(box);
    });
    out.appendChild(g);
  }

  function drawSeats(grid) {
    var s = el("div", "seats");
    out.appendChild(el("div", "front", "앞"));
    s.style.gridTemplateColumns = "repeat(" + grid[0].length + ", minmax(72px, 1fr))";
    grid.forEach(function (row) {
      row.forEach(function (p) { s.appendChild(el("div", "seat" + (p ? "" : " is-empty"), p ? p.name : "빈자리")); });
    });
    out.appendChild(s);
  }

  function run() {
    var e = form.elements, seed = Math.floor(Math.random() * 1e9);
    var roster = C.parseRoster(e.roster.value);
    var apart = C.parsePairs(e.apart.value, roster.people), together = C.parsePairs(e.together.value, roster.people);
    var errors = roster.errors.concat(apart.errors.map(prefix("떨어뜨리기")), together.errors.map(prefix("묶기")));
    if (roster.people.length < 2) errors.unshift("명단에 두 명 이상 적어 주세요.");
    out.textContent = ""; out.hidden = false; $("after").hidden = true; last = null;
    var r = errors.length ? { error: "입력을 확인해 주세요.", list: errors }
      : mode() === "teams"
        ? C.makeTeams({ people: roster.people, teamCount: Number(e.teamCount.value), apart: apart.pairs, together: together.pairs, balance: e.balance.checked, seed: seed })
        : C.makeSeats({ people: roster.people, rows: Number(e.rows.value), cols: Number(e.cols.value), apart: apart.pairs, together: together.pairs, seed: seed });
    if (r.error) {
      out.className = "result is-err";
      out.appendChild(el("p", null, r.error));
      if (r.list) { var ul = el("ul"); r.list.forEach(function (t) { ul.appendChild(el("li", null, t)); }); out.appendChild(ul); }
      return;
    }
    out.className = "result"; last = r; $("after").hidden = false;
    if (r.teams) drawTeams(r.teams); else drawSeats(r.grid);
    if (r.violations.length) {
      var v = el("div", "viol"), vl = el("ul");
      v.appendChild(el("p", "warn", "조건을 다 맞추지 못했어요. 어긴 조건:"));
      r.violations.forEach(function (x) { vl.appendChild(el("li", null, C.describe(x))); });
      v.appendChild(vl); v.appendChild(el("p", null, "다시 뽑거나 조건을 줄여 보세요."));
      out.appendChild(v);
    } else {
      out.appendChild(el("p", "privacy", "정한 조건을 모두 맞췄어요."));
    }
  }

  form.addEventListener("change", function (e) { if (e.target.name === "mode") syncMode(); });
  form.addEventListener("submit", function (e) { e.preventDefault(); run(); });
  $("again").addEventListener("click", run);
  $("copy").addEventListener("click", function () {
    var b = this;
    if (!last) return;
    U.copyText(C.toText(last)).then(function () { U.flash(b, "복사했어요"); }, function () { U.flash(b, "복사 못 함 — 직접 선택해 주세요"); });
  });
  $("print").addEventListener("click", function () { window.print(); });
  syncMode();
})();

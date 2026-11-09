/* 조 편성·자리 배치 — 배치 로직 (브라우저·node 테스트 겸용). DOM을 만지지 않는다.
 * 방식: 무작위 배치 → 두 사람 자리 바꾸기를 반복해 위반 점수를 줄인다(여러 번 새로 시작해 가장 좋은 것).
 * 조건을 다 못 맞추면 어긴 조건을 그대로 돌려준다 — 맞춘 척하지 않는다(설계서 §6-2). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.TeamCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var RESTARTS = 20, STEPS = 3000;

  // 같은 씨앗값이면 같은 결과 (mulberry32)
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(list, rand) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  // "이름" 또는 "이름, 꼬리표" (쉼표·탭). 빈 줄 무시. 같은 이름 두 번이면 오류.
  function parseRoster(text) {
    var people = [], errors = [], seen = {};
    String(text || "").split(/\r?\n/).forEach(function (line, i) {
      var cells = line.split(/[,\t]/).map(function (s) { return s.trim(); });
      if (!cells[0]) return;
      if (seen[cells[0]]) { errors.push((i + 1) + "번째 줄: '" + cells[0] + "' 이름이 두 번 나와요 — 동명이인은 '홍길동A'처럼 구분해 주세요."); return; }
      seen[cells[0]] = true;
      people.push({ name: cells[0], tag: cells[1] || "" });
    });
    return { people: people, errors: errors };
  }

  // 한 줄에 두 이름 "가, 나" (쉼표·탭·빗금). 명단에 없는 이름은 오류.
  function parsePairs(text, people) {
    var names = {}, pairs = [], errors = [];
    people.forEach(function (p) { names[p.name] = true; });
    String(text || "").split(/\r?\n/).forEach(function (line, i) {
      if (!line.trim()) return;
      var two = line.split(/[,\t\/]/).map(function (s) { return s.trim(); }).filter(Boolean);
      if (two.length !== 2) { errors.push((i + 1) + "번째 줄: 두 사람 이름을 쉼표로 나눠 적어 주세요."); return; }
      var miss = two.filter(function (n) { return !names[n]; });
      if (miss.length) { errors.push((i + 1) + "번째 줄: 명단에 없는 이름 — " + miss.join(", ")); return; }
      if (two[0] === two[1]) { errors.push((i + 1) + "번째 줄: 같은 사람이에요."); return; }
      pairs.push(two);
    });
    return { pairs: pairs, errors: errors };
  }

  function indexPairs(pairs, people) {
    var idx = {};
    people.forEach(function (p, i) { idx[p.name] = i; });
    return (pairs || []).map(function (p) { return [idx[p[0]], idx[p[1]]]; });
  }
  function cost(v) { return v.reduce(function (s, x) { return s + (x.type === "balance" ? 1 : 3); }, 0); }

  // order(사람 번호 배열)를 두 칸씩 바꿔 가며 score(order)를 낮춘다. 같은 점수 이동도 받아 평지를 건넌다.
  function search(base, score, seed) {
    var rand = rng(seed), best = null;
    for (var r = 0; r < RESTARTS && !(best && best.cost === 0); r++) {
      var order = shuffle(base, rand), cur = score(order);
      for (var s = 0; s < STEPS && cur > 0; s++) {
        var i = Math.floor(rand() * order.length), j = Math.floor(rand() * order.length), t = order[i];
        order[i] = order[j]; order[j] = t;
        var c = score(order);
        if (c <= cur) cur = c; else { order[j] = order[i]; order[i] = t; }
      }
      if (!best || cur < best.cost) best = { cost: cur, order: order.slice() };
    }
    return best.order;
  }

  function makeTeams(o) {
    var people = o.people, n = people.length, k = o.teamCount | 0;
    if (!(k >= 2 && k <= n)) return { error: "조 수는 2 이상, 인원수(" + n + "명) 이하로 정해 주세요." };
    var apart = indexPairs(o.apart, people), together = indexPairs(o.together, people);
    var sizes = [], tags = {};
    for (var i = 0; i < k; i++) sizes.push(Math.floor(n / k) + (i < n % k ? 1 : 0));
    if (o.balance) people.forEach(function (p) { if (p.tag) tags[p.tag] = (tags[p.tag] || 0) + 1; });

    function teamOf(order) {
      var t = new Array(n), pos = 0;
      sizes.forEach(function (sz, ti) { for (var j = 0; j < sz; j++) t[order[pos++]] = ti; });
      return t;
    }
    function violations(t) {
      var v = [];
      apart.forEach(function (p) { if (t[p[0]] === t[p[1]]) v.push({ type: "apart", a: people[p[0]].name, b: people[p[1]].name }); });
      together.forEach(function (p) { if (t[p[0]] !== t[p[1]]) v.push({ type: "together", a: people[p[0]].name, b: people[p[1]].name }); });
      Object.keys(tags).forEach(function (tag) {
        var lo = Math.floor(tags[tag] / k), hi = Math.ceil(tags[tag] / k), cnt = new Array(k).fill(0);
        people.forEach(function (p, pi) { if (p.tag === tag) cnt[t[pi]]++; });
        cnt.forEach(function (c, ti) { if (c < lo || c > hi) v.push({ type: "balance", tag: tag, team: ti, count: c }); });
      });
      return v;
    }
    var order = search(people.map(function (p, pi) { return pi; }), function (ord) { return cost(violations(teamOf(ord))); }, o.seed);
    var t = teamOf(order), teams = sizes.map(function () { return []; });
    order.forEach(function (pi) { teams[t[pi]].push(people[pi]); });
    return { teams: teams, violations: violations(t) };
  }

  // 붙어 앉음 = 같은 줄 좌우 또는 같은 칸 앞뒤
  function makeSeats(o) {
    var people = o.people, R = o.rows | 0, C = o.cols | 0, cells = R * C;
    if (!(R >= 1 && C >= 1)) return { error: "줄 수와 한 줄 자리 수를 1 이상으로 정해 주세요." };
    if (cells > 400) return { error: "자리가 너무 많아요(최대 400석). 줄 수나 한 줄 자리 수를 줄여 주세요." }; // 검수 지적: 상한 없으면 수십 초 멈춤
    if (people.length > cells) return { error: "자리(" + cells + "석)가 인원(" + people.length + "명)보다 적어요." };
    var apart = indexPairs(o.apart, people), together = indexPairs(o.together, people);
    function adjacent(a, b) {
      var ra = Math.floor(a / C), ca = a % C, rb = Math.floor(b / C), cb = b % C;
      return (ra === rb && Math.abs(ca - cb) === 1) || (ca === cb && Math.abs(ra - rb) === 1);
    }
    function violations(order) { // order[자리] = 사람 번호, 빈자리는 -1
      var seat = [];
      order.forEach(function (pi, s) { if (pi >= 0) seat[pi] = s; });
      var v = [];
      apart.forEach(function (p) { if (adjacent(seat[p[0]], seat[p[1]])) v.push({ type: "apart", a: people[p[0]].name, b: people[p[1]].name }); });
      together.forEach(function (p) { if (!adjacent(seat[p[0]], seat[p[1]])) v.push({ type: "together", a: people[p[0]].name, b: people[p[1]].name }); });
      return v;
    }
    var base = people.map(function (p, pi) { return pi; });
    while (base.length < cells) base.push(-1);
    var order = search(base, function (ord) { return cost(violations(ord)); }, o.seed), grid = [];
    for (var r = 0; r < R; r++) grid.push(order.slice(r * C, r * C + C).map(function (pi) { return pi >= 0 ? people[pi] : null; }));
    return { grid: grid, violations: violations(order) };
  }

  function describe(v) {
    if (v.type === "apart") return v.a + "·" + v.b + " — 떨어뜨리지 못함";
    if (v.type === "together") return v.a + "·" + v.b + " — 함께 두지 못함";
    return (v.team + 1) + "조의 '" + v.tag + "' " + v.count + "명 — 고르게 섞이지 않음";
  }

  function toText(r) {
    if (r.teams) return r.teams.map(function (t, i) { return (i + 1) + "조: " + t.map(function (p) { return p.name; }).join(", "); }).join("\n");
    return ["[앞]"].concat(r.grid.map(function (row, i) {
      return (i + 1) + "줄: " + row.map(function (p) { return p ? p.name : "(빈자리)"; }).join(" | ");
    })).join("\n");
  }

  return { rng: rng, parseRoster: parseRoster, parsePairs: parsePairs, makeTeams: makeTeams,
    makeSeats: makeSeats, describe: describe, toText: toText };
});

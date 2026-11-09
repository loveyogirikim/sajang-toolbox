/* 사장님 업무 도구함 — 공용 로직 (브라우저·node 테스트 겸용). DOM을 만지지 않는다. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ToolboxCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function norm(s) { return String(s || "").toLowerCase().replace(/\s+/g, ""); }

  // 가중치 검색 — 제목 12 > 같은 말(aka) 9 > 본문 3 (원조 분석 §2). 띄어쓰기 무시. 0 = 못 찾음.
  function score(f, query) {
    var q = String(query || "").trim();
    if (!q) return 1;
    var whole = norm(q);
    var terms = q.split(/\s+/).map(norm).filter(Boolean);
    var parts = [[norm(f.title), 12], [norm((f.aka || []).join(" ")), 9], [norm(f.body), 3]];
    var total = 0;
    parts.forEach(function (p) {
      if (!p[0]) return;
      if (p[0].indexOf(whole) !== -1) total += p[1] * 2;
      else if (terms.every(function (t) { return p[0].indexOf(t) !== -1; })) total += p[1];
    });
    if (total || whole.length < 4) return total;
    // 네 글자 이상 문장: 두 글자 조각 60% 이상이 있으면 약하게 찾은 것 (ai-recipe에서 검증된 방식 재사용)
    var hay = parts.map(function (p) { return p[0]; }).join("|");
    var hit = 0, n = whole.length - 1;
    for (var i = 0; i < n; i++) if (hay.indexOf(whole.substr(i, 2)) !== -1) hit++;
    return hit / n >= 0.6 ? 1 : 0;
  }

  // 점수 순으로 거른다. 같은 점수는 원래 순서 유지.
  function rank(items, query, toFields) {
    return items
      .map(function (it, i) { return { it: it, i: i, s: score(toFields(it), query) }; })
      .filter(function (x) { return x.s > 0; })
      .sort(function (a, b) { return b.s - a.s || a.i - b.i; })
      .map(function (x) { return x.it; });
  }

  // 링크는 https 주소 또는 이 사이트 안 상대 경로(apps/pay.html, apps/pay.html#weekly)만 연다.
  function safeUrl(u) {
    var s = String(u || "").trim();
    if (/^https:\/\/[^\s"'<>]+$/i.test(s)) return s;
    if (/^(\.\.\/)?([a-z0-9-]+\/)?[a-z0-9-]+\.html(#[a-z0-9-]+)?$/i.test(s)) return s;
    return null;
  }

  // "2,000,000원"·"920만"·"14.5" → 숫자. 못 읽으면 NaN (화면이 "NaN원" 대신 안내하게).
  function parseAmount(v) {
    var s = String(v == null ? "" : v).replace(/[,\s원]/g, "");
    var man = /만$/.test(s);
    if (man) s = s.slice(0, -1);
    if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
    return Number(s) * (man ? 10000 : 1);
  }

  // "3명"·전각 "３" → 3. 숫자 묶음이 정확히 하나일 때만 읽는다 — "3~4"·"3.5"는 NaN (34명·35명으로 조용히 읽지 않는다 — 2026-09-30 검수)
  function parseCount(v) {
    var m = /^\D*(\d+)\D*$/.exec(String(v == null ? "" : v).normalize("NFKC"));
    return m ? Number(m[1]) : NaN;
  }

  function won(n) { return Math.floor(n).toLocaleString("ko-KR") + "원"; }

  // "YYYY-MM-DD" → UTC 자정 Date. 없는 날짜(2월 30일 등)는 null.
  function parseDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
    if (!m) return null;
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? d : null;
  }
  function fmtDate(d) { return d.toISOString().slice(0, 10); }
  function daysBetween(a, b) { return Math.round((b - a) / 86400000); }

  // ponytail: 달 계산은 "해당일이 없으면 그 달 말일"(1월 31일 + 1달 = 2월 말일) 한 가지 규칙만 쓴다.
  function addMonths(d, m) {
    var y = d.getUTCFullYear(), mo = d.getUTCMonth() + m;
    var last = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
    return new Date(Date.UTC(y, mo, Math.min(d.getUTCDate(), last)));
  }
  // a부터 b까지 꽉 찬 달 수 — addMonths(a, n) <= b 인 가장 큰 n.
  function fullMonths(a, b) {
    var m = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
    if (addMonths(a, m) > b) m--;
    return m;
  }

  function todayLocal() {
    var t = new Date();
    return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
  }

  return { norm: norm, score: score, rank: rank, safeUrl: safeUrl, parseAmount: parseAmount, parseCount: parseCount, won: won,
    parseDate: parseDate, fmtDate: fmtDate, daysBetween: daysBetween, addMonths: addMonths,
    fullMonths: fullMonths, todayLocal: todayLocal };
});

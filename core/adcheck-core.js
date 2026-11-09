/* 광고 문구 점검 — 위험 표현 찾기 (브라우저·node 테스트 겸용). 규칙 사전은 data/adcheck-rules.json 에서 받아 온다. DOM을 만지지 않는다.
 * 판정은 참고용이다 — "걸릴 수 있다"까지만 말하고 위법 단정은 하지 않는다(3차 설계 3-3). 상세페이지 조립기의 품질 점검도 scan()을 그대로 쓴다. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AdcheckCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var LONG = 40; // 휴대폰에서 한눈에 읽히는 문장 길이 — 원조 교안의 기준

  function norm(text) { return String(text == null ? "" : text).normalize("NFKC"); }

  // 이 규칙을 이 업종에 적용하나? scope: all(모든 업종) | food | cosmetic | online(온라인 판매를 켰을 때)
  function applies(rule, opt) {
    var o = opt || {}, sc = rule.scope || [];
    return sc.indexOf("all") !== -1 || sc.indexOf(o.kind) !== -1 || (o.online && sc.indexOf("online") !== -1);
  }

  // 띄어쓰기를 지운 본문과 원래 자리 대응표 — "피로회복"·"마감임박"처럼 붙여 쓴 표기도 찾는다(2026-10-01 콘텐츠 검수 중3)
  function noSpace(lower) {
    var map = [], ns = "";
    for (var i = 0; i < lower.length; i++) { var ch = lower[i]; if (!/\s/.test(ch)) { map.push(i); ns += ch; } }
    return { ns: ns, map: map };
  }
  // 한 규칙의 표현(단어 목록 + 정규식)을 전부 찾아 자리순으로, 겹치는 자리는 한 번만
  function find(rule, text, lower, sp) {
    var out = [];
    (rule.words || []).forEach(function (w) {
      var needle = norm(w).toLowerCase().replace(/\s+/g, ""), j = 0;
      if (!needle) return;
      while ((j = sp.ns.indexOf(needle, j)) !== -1) { out.push({ start: sp.map[j], end: sp.map[j + needle.length - 1] + 1 }); j += needle.length; }
    });
    (rule.regex || []).forEach(function (re) {
      var r = new RegExp(re, "gi"), m;
      while ((m = r.exec(lower)) !== null) { if (!m[0]) { r.lastIndex++; continue; } out.push({ start: m.index, end: m.index + m[0].length }); }
    });
    out.sort(function (a, b) { return a.start - b.start || b.end - a.end; });
    var res = [], prevEnd = -1;
    out.forEach(function (m) {
      if (m.start < prevEnd) return;
      res.push({ text: text.slice(m.start, m.end), start: m.start });
      prevEnd = m.end;
    });
    return res;
  }

  // text: 점검할 글, opt: {kind: general|food|cosmetic, online: bool}, rules: adcheck-rules.json
  function scan(text, opt, rules) {
    var t = norm(text), lower = t.toLowerCase();
    if (lower.length !== t.length) t = lower; // 소문자화로 길이가 바뀌는 드문 글자는 소문자 쪽으로 맞춘다
    if (!t.trim()) return [];
    var hits = [], sp = noSpace(lower);
    (rules.rules || []).forEach(function (r) {
      if (!applies(r, opt)) return;
      var m = find(r, t, lower, sp);
      if (m.length) hits.push({ id: r.id, name: r.name, level: r.level || "warn", why: r.why, fix: r.fix, basis: r.basis, matches: m });
    });
    return hits;
  }

  // 마침표·물음표·느낌표·줄바꿈으로 자른 문장 중 40자를 넘는 것
  function longSentences(text) {
    return norm(text).split(/[.!?。\n]+/).map(function (s) { return s.trim(); }).filter(function (s) { return s.length > LONG; });
  }

  function report(text, opt, rules) {
    var o = opt || {}, kinds = ["all"].concat(o.kind && o.kind !== "general" ? [o.kind] : [], o.online ? ["online"] : []);
    var checklist = [], uncertain = [];
    kinds.forEach(function (k) { (rules.checklist && rules.checklist[k] || []).forEach(function (c) { checklist.push(c); }); });
    (rules.uncertain || []).forEach(function (u) { if (!u.scope || kinds.indexOf(u.scope) !== -1) uncertain.push(u.text); });
    return { hits: scan(text, o, rules), long: longSentences(text), checklist: checklist, uncertain: uncertain };
  }

  return { LONG: LONG, applies: applies, scan: scan, longSentences: longSentences, report: report };
});

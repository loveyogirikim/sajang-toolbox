/* 상시 근로자 수 화면 — 계산은 HeadcountCore, 여기서는 읽고 그린다(textContent만). */
(function () {
  "use strict";
  var T = window.ToolboxCore, H = window.HeadcountCore, U = window.UI, el = U.el, $ = U.$;
  var form = $("f-head"), out = $("r-head");
  var RULE = {
    average: "평균으로 판정했어요(제1항).",
    "under-half": "평균은 기준에 못 미치지만, 기준에 미달한 날이 절반 미만이라 기준 이상 사업장으로 봐요(제2항제1호).",
    "over-half": "평균은 기준 이상이지만, 기준에 미달한 날이 절반 이상이라 기준 이상 사업장으로 보지 않아요(제2항제2호)."
  };

  function basisBox(list) {
    var box = el("div", "basis"), ul = el("ul");
    box.appendChild(el("h3", null, "근거 조항"));
    list.forEach(function (b) {
      var li = el("li"), a = el("a", null, b.law + " " + b.article);
      a.href = T.safeUrl(b.url) || "#"; a.target = "_blank"; a.rel = "noopener";
      li.appendChild(a); li.appendChild(document.createTextNode(" — " + b.what)); ul.appendChild(li);
    });
    box.appendChild(ul);
    return box;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var parsed = H.parseDaily(form.elements.daily.value), k = Number(form.elements.threshold.value);
    var r = H.headcount({ daily: parsed.daily, threshold: k });
    out.textContent = ""; out.hidden = false;
    if (parsed.errors.length || r.error) {
      out.className = "result is-err";
      out.appendChild(el("p", null, r.error || "입력을 확인해 주세요."));
      var ul = el("ul"); parsed.errors.forEach(function (t) { ul.appendChild(el("li", null, t)); }); if (parsed.errors.length) out.appendChild(ul);
      return;
    }
    out.className = "result" + (r.applies ? "" : " is-no");
    out.appendChild(el("p", "big", "상시 근로자 " + (Math.round(r.average * 10) / 10) + "명 — " + k + "명 " + (r.applies ? "이상 사업장으로 봐요" : "이상 사업장으로 보지 않아요")));
    var list = el("ul");
    [
      "연인원 " + r.total + "명 ÷ 가동일 " + r.days + "일 = 평균 " + (Math.round(r.average * 100) / 100) + "명",
      k + "명 미만인 날: " + r.belowDays + "일 / " + r.days + "일",
      RULE[r.rule],
      r.applies && k === 5 ? "해고 제한·연장근로 가산수당·주 52시간 등 근로기준법 규정이 적용돼요. 급여·근무표 도구에서 '5명 이상'으로 계산하세요." : "",
      r.applies && k === 5 ? "연차 유급휴가(제60조)는 이 한 달 계산이 아니라 지난 1년 동안 달마다 계속 5명 이상이었는지로 따로 판단해요(시행령 제7조의2제3항). 다만 1년 미만 직원의 월 단위 연차(제60조제2항)는 이 한 달 계산으로 판단하니, 지금 결과대로 적용돼요." : "",
      !r.applies && k === 5 ? "근로기준법 일부 규정(연차·해고 제한·가산수당·주 52시간 등)이 적용되지 않아요. 다만 주휴일·휴게·해고 예고·퇴직금 등은 5명 미만이라도 적용돼요." : ""
    ].filter(Boolean).forEach(function (t) { list.appendChild(el("li", null, t)); });
    out.appendChild(list);
    out.appendChild(basisBox(r.basis));
    out.scrollIntoView({ block: "nearest" });
  });
})();

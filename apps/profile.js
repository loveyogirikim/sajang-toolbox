/* 우리 가게 카드 화면 — 칸은 ProfileCore.FIELDS로 만들고(textContent만), 적는 대로 이 기기에 저장한다. */
(function () {
  "use strict";
  var P = window.ProfileCore, U = window.UI, el = U.el, $ = U.$;
  var form = $("f-profile"), box = $("fields"), timer = null;
  // 가상 예시 — 실제 가게가 아니다. 숫자·자격도 예시이며 "[확인 필요]" 표기 습관을 보여 주기 위한 것
  var EXAMPLE = { name: "골목 카페 (가상 예시)", type: "restaurant", product: "디카페인 드립 커피 원두 200g", customer: "밤에 커피를 마시면 잠을 설치는 30~40대 직장인",
    pain: "저녁에 커피 한 잔이 간절한데, 마시면 새벽까지 뒤척인다", method: "매주 화요일에 그 주 팔 양만 로스팅하고, 주문 뒤 48시간 안에 보낸다",
    proof: "2024년 개업 / 로스팅 교육 수료 [확인 필요: 기관·연도] / 스마트스토어 리뷰 4.8점(2026-09 기준)", origin: "야근하며 밤 커피를 끊지 못하던 대표가 '잠은 지키는 커피'를 찾다 시작",
    offer: "200g 12,000원\n2봉 묶음 22,000원", service: "매장 09:00~21:00 (일요일 휴무)\n온라인 주문 밤 10시 마감, 다음 날 발송", channel: "매장, 스마트스토어, 인스타그램", contact: "02-000-0000 · 카카오톡 채널 골목카페", tone: "warm" };

  function build() {
    P.FIELDS.forEach(function (f) {
      var label = el("label", "field", f.label), small = el("small", null, " " + f.hint), input;
      label.appendChild(small);
      if (f.kind === "select") {
        input = el("select");
        input.appendChild(el("option", null, "선택")).value = "";
        (f.id === "type" ? P.TYPES : P.TONES).forEach(function (t) { var o = el("option", null, t.name); o.value = t.id; input.appendChild(o); });
      } else if (f.kind === "textarea") { input = el("textarea"); input.rows = 2; input.maxLength = P.MAX; }
      else { input = el("input"); input.maxLength = P.MAX; input.autocomplete = "off"; }
      input.name = f.id;
      label.appendChild(input); box.appendChild(label);
    });
  }
  function values() { var o = {}; P.FIELDS.forEach(function (f) { o[f.id] = form.elements[f.id].value; }); return P.clean(o); }
  function fill(p) { P.FIELDS.forEach(function (f) { form.elements[f.id].value = p && p[f.id] || ""; }); }
  function status(saved) {
    var p = values(), n = P.filled(p);
    $("status").textContent = "채운 칸 " + n + "/" + P.FIELDS.length + (saved === false ? " · 이 브라우저는 저장이 막혀 있어요 — 복사해서 보관하세요" : n ? " · 이 기기에 저장됨" : "");
  }
  function save() { status(U.saveProfile(values())); }
  function schedule() { clearTimeout(timer); timer = setTimeout(save, 400); }

  build();
  fill(U.loadProfile());
  status();
  form.addEventListener("input", schedule);
  form.addEventListener("change", schedule);
  $("copy").addEventListener("click", function () {
    var b = this;
    U.copyText(P.toText(values())).then(function () { U.flash(b, "복사했어요 — AI 프로젝트 지침에 붙여넣기"); }, function () { U.flash(b, "복사 못 함 — 길게 눌러 직접 복사"); });
  });
  $("example").addEventListener("click", function () { fill(EXAMPLE); save(); U.flash(this, "가상 예시를 채웠어요 — 내 가게 내용으로 고치세요"); });
  $("clear").addEventListener("click", function () {
    if (!window.confirm("이 기기에 저장된 가게 카드를 지울까요?")) return;
    fill(null); U.clearProfile(); status(); U.flash(this, "지웠어요");
  });
})();

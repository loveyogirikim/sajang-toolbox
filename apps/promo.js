/* 할인·이벤트 손익 화면 — 계산은 PromoCore, 여기서는 읽고 그린다(textContent만). */
(function () {
  "use strict";
  var T = window.ToolboxCore, P = window.PromoCore, U = window.UI, el = U.el, $ = U.$;
  var form = $("f-promo"), out = $("r-promo"), state = { kind: "rate" };
  var LABEL = { rate: "할인율 (%)", amount: "할인 금액 (원)", gift: "사은품 원가 (원)" };
  var DEFAULT = { rate: 10, amount: 1000, gift: 500 };

  function chips() {
    var box = $("kinds");
    P.KINDS.forEach(function (k) {
      var b = el("button", "chip", k.name); b.type = "button"; b.setAttribute("aria-pressed", String(state.kind === k.id));
      b.addEventListener("click", function () {
        state.kind = k.id;
        Array.prototype.forEach.call(box.children, function (c) { c.setAttribute("aria-pressed", String(c === b)); });
        $("value-field").hidden = k.id === "bogo"; $("value-label").textContent = LABEL[k.id] || "";
      });
      box.appendChild(b);
    });
  }
  function won(n) { return Math.round(n).toLocaleString("ko-KR") + "원"; }
  function base() {
    var e = form.elements, useRate = e.useRate.checked;
    return { price: T.parseAmount(e.price.value), cost: useRate ? undefined : T.parseAmount(e.cost.value), marginRate: useRate ? T.parseAmount(e.marginRate.value) : undefined, qty: T.parseAmount(String(e.qty.value).replace(/개/g, "")) };
  }
  function row(tbl, cells, head) {
    var tr = el("tr"); cells.forEach(function (c, i) { tr.appendChild(el(head || i === 0 ? "th" : "td", null, c)); }); tbl.appendChild(tr); return tr;
  }

  form.elements.useRate.addEventListener("change", function () { $("cost-field").hidden = this.checked; $("rate-field").hidden = !this.checked; });
  chips();
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var b = base(), value = state.kind === "bogo" ? 0 : T.parseAmount(String(form.elements.value.value).replace(/[%개]/g, ""));
    var r = P.calc({ price: b.price, cost: b.cost, marginRate: b.marginRate, qty: b.qty, kind: state.kind, value: value });
    out.textContent = ""; out.hidden = false;
    if (isNaN(b.price) || (b.cost === undefined ? isNaN(b.marginRate) : isNaN(b.cost)) || isNaN(b.qty) || (state.kind !== "bogo" && isNaN(value))) {
      out.className = "result is-err"; out.appendChild(el("p", null, "숫자를 읽지 못한 칸이 있어요 — 판매가·원가(또는 마진율)·판매량·할인 값을 숫자로 적어 주세요.")); return;
    }
    if (r.error) { out.className = "result is-err"; out.appendChild(el("p", null, r.error)); return; }
    out.className = "result mk" + (r.ok ? "" : " is-err");
    out.appendChild(el("p", "big", r.ok ? "본전이 되려면 " + Math.ceil(r.breakEvenQty) + "개 — 지금보다 " + r.increasePct + "% 더 팔아야 해요" : "이 방식은 팔수록 손해예요 — 할인 뒤 개당 이익이 " + won(r.newMargin)));
    var tbl = el("table", "slip wrap");
    row(tbl, ["", "지금", r.label + " 뒤"], true);
    row(tbl, [state.kind === "bogo" ? "한 번 팔 때 받는 돈" : "판매가", won(r.price), won(r.newPrice)]);
    row(tbl, [state.kind === "bogo" ? "한 번 팔 때 이익" : "개당 이익", won(r.margin), won(r.newMargin)]);
    row(tbl, [r.discountLabel, "—", r.discountRate + "%"]);
    row(tbl, ["지금 이익을 지키는 " + (state.kind === "bogo" ? "판매 횟수" : "판매량"), r.qty + "개", r.ok ? Math.ceil(r.breakEvenQty) + "개 (+" + r.increasePct + "%)" : "없음"]);
    row(tbl, ["같은 수량(" + r.qty + "개)만 팔리면 줄어드는 이익", "—", won(r.lossIfSame)]);
    out.appendChild(tbl);
    out.appendChild(el("h3", null, "계산식"));
    var ul = el("ul"); r.formulas.forEach(function (f) { ul.appendChild(el("li", null, f)); }); out.appendChild(ul);
    // 나란히 비교 — 정률·정액·사은품은 지금 넣은 값(또는 기본값), 1+1은 그대로
    var cmpVals = { rate: state.kind === "rate" ? value : DEFAULT.rate, amount: state.kind === "amount" ? value : DEFAULT.amount, gift: state.kind === "gift" ? value : DEFAULT.gift };
    var rows = P.compare(b, [{ kind: "rate", value: cmpVals.rate }, { kind: "amount", value: cmpVals.amount }, { kind: "bogo" }, { kind: "gift", value: cmpVals.gift }]);
    out.appendChild(el("h3", null, "방식 4가지 나란히 (정률 " + cmpVals.rate + "% · 정액 " + won(cmpVals.amount) + " · 1+1 · 사은품 " + won(cmpVals.gift) + ")"));
    var c = el("table", "slip wrap");
    row(c, ["방식", "개당(1+1은 한 번 팔 때) 이익", "본전 판매량", "할인 비율"], true);
    rows.forEach(function (x) { row(c, x.error ? [x.label || "-", x.error, "-", "-"] : [x.label, won(x.newMargin), x.ok ? Math.ceil(x.breakEvenQty) + "개 (+" + x.increasePct + "%)" : "없음(손해)", (x.kind === "gift" ? x.discountRate + "% (판매가 대비 원가)" : x.discountRate + "%")]); });
    out.appendChild(c);
    out.scrollIntoView({ block: "nearest" });
  });
})();

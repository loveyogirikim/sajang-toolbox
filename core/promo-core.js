/* 할인·이벤트 손익 계산 — "이 할인 하면 몇 개 더 팔아야 본전인가" (브라우저·node 테스트 겸용). DOM을 만지지 않는다.
 * 규칙 하나: 본전 판매량 = 지금 이익 ÷ 할인 뒤 개당 이익. 계산식을 결과에 그대로 실어 검산할 수 있게 한다. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PromoCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var KINDS = [
    { id: "rate", name: "정률 할인", unit: "%" },
    { id: "amount", name: "정액 할인", unit: "원" },
    { id: "bogo", name: "1+1 (하나 값에 둘)", unit: "" },
    { id: "gift", name: "사은품 (원가)", unit: "원" }
  ];
  function num(v) { var n = Number(v); return isFinite(n) ? n : NaN; }
  function r1(n) { return Math.round(n * 10) / 10; }
  function r2(n) { return Math.round(n * 100) / 100; }
  function won(n) { return Math.round(n).toLocaleString("ko-KR") + "원"; }
  function label(kind, value) {
    var k = KINDS.filter(function (x) { return x.id === kind; })[0] || KINDS[0];
    return k.id === "bogo" ? k.name : k.name + " " + (k.unit === "%" ? value + "%" : won(value));
  }

  // o: {price 판매가, cost 원가 | marginRate 마진율%, qty 지금 월 판매량, kind, value}
  function calc(o) {
    var price = num(o.price), qty = num(o.qty), kind = o.kind || "rate", value = num(o.value) || 0;
    var cost = isFinite(num(o.cost)) && o.cost !== "" && o.cost != null ? num(o.cost) : (isFinite(num(o.marginRate)) ? price * (1 - num(o.marginRate) / 100) : NaN);
    if (!(price > 0)) return { error: "판매가를 0보다 크게 넣어 주세요." };
    if (!(cost >= 0)) return { error: "원가(또는 마진율)를 확인해 주세요." };
    if (cost >= price) return { error: "원가가 판매가보다 크거나 같아요 — 지금도 남는 게 없어요. 판매가나 원가를 확인해 주세요." };
    if (!(qty > 0)) return { error: "지금 한 달에 파는 수량을 넣어 주세요(본전 계산의 기준)." };
    var margin = price - cost, newPrice = price, newMargin, discount, formulas = [];
    if (kind === "rate") {
      if (!(value > 0 && value < 100)) return { error: "할인율은 0보다 크고 100보다 작게 넣어 주세요." };
      newPrice = price * (1 - value / 100); newMargin = newPrice - cost; discount = value;
      formulas.push("할인 뒤 판매가 = " + won(price) + " × (1 − " + value + "%) = " + won(newPrice));
    } else if (kind === "amount") {
      if (!(value > 0 && value < price)) return { error: "할인 금액은 0보다 크고 판매가보다 작게 넣어 주세요." };
      newPrice = price - value; newMargin = newPrice - cost; discount = value / price * 100;
      formulas.push("할인 뒤 판매가 = " + won(price) + " − " + won(value) + " = " + won(newPrice));
    } else if (kind === "bogo") {
      // 손님은 하나 값을 내고 둘을 받는다 → "한 번 팔 때" 받는 돈은 그대로, 원가는 두 배 (본전 수량도 '판매 횟수'로 센다)
      newPrice = price; newMargin = price - cost * 2; discount = 50;
      formulas.push("1+1은 한 번 팔 때 받는 돈 " + won(price) + "에 원가가 두 개분 = " + won(cost) + " × 2 = " + won(cost * 2) + " (손님 입장에선 50% 할인)");
    } else if (kind === "gift") {
      if (!(value >= 0)) return { error: "사은품 원가를 넣어 주세요." };
      newMargin = margin - value; discount = value / price * 100;
      formulas.push("사은품 원가만큼 개당 이익이 준다 = " + won(margin) + " − " + won(value) + " = " + won(newMargin));
    } else return { error: "할인 방식을 골라 주세요." };
    formulas.push("지금 개당 이익 = " + won(price) + " − " + won(cost) + " = " + won(margin) + " / 할인 뒤 개당 이익 = " + won(newMargin));
    var profitNow = margin * qty, ok = newMargin > 0, breakEvenQty = null, increasePct = null;
    if (ok) {
      breakEvenQty = r2(profitNow / newMargin); increasePct = r1((profitNow / newMargin / qty - 1) * 100);
      formulas.push("본전 판매량 = 지금 이익 " + won(profitNow) + " ÷ " + won(newMargin) + " = " + breakEvenQty + "개 → 올림 " + Math.ceil(breakEvenQty) + "개 (지금 " + qty + "개보다 " + increasePct + "% 더)");
    } else formulas.push("할인 뒤 개당 이익이 0 이하 — 많이 팔수록 손해라 본전 판매량이 없어요");
    // 사은품의 비율은 손님이 느끼는 할인이 아니라 "판매가 대비 사은품 원가" — 이름을 구분한다(2026-10-01 검수)
    return { kind: kind, label: label(kind, value), price: price, cost: cost, qty: qty, margin: margin, newPrice: r2(newPrice), newMargin: r2(newMargin),
      discountRate: r1(discount), discountLabel: kind === "gift" ? "판매가 대비 사은품 원가" : "손님이 느끼는 할인", profitNow: profitNow, breakEvenQty: breakEvenQty, increasePct: increasePct, ok: ok,
      lossIfSame: r2((margin - newMargin) * qty), formulas: formulas };
  }

  function compare(base, list) { return list.map(function (x) { return calc({ price: base.price, cost: base.cost, marginRate: base.marginRate, qty: base.qty, kind: x.kind, value: x.value }); }); }

  return { KINDS: KINDS, calc: calc, compare: compare, label: label };
});

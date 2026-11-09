/* 홍보 문자·카톡 만들기 — 정보통신망법 제50조의 광고 문자 규칙을 초안에 심는다 (브라우저·node 테스트 겸용). DOM을 만지지 않는다.
 * 실제 발송 기능은 없다 — 복사까지만(외부 발송은 승인제, 3차 브리프 불가침).
 * 2026-10-01 검수 반영: 별표 6대로 시작 부분에 (광고)·명칭·연락처를 같이 두고, 연락처가 비면 점검에 ×를 띄운다. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AdsmsCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var LAW = "정보통신망 이용촉진 및 정보보호 등에 관한 법률", DEC = LAW + " 시행령";
  var U1 = "https://www.law.go.kr/법령/정보통신망이용촉진및정보보호등에관한법률/제50조", U2 = "https://www.law.go.kr/법령/정보통신망이용촉진및정보보호등에관한법률시행령/제61조";
  var SMS = 90, LMS = 2000, REJECT_NEED = "[무료수신거부 080 번호 확인 필요]", CONTACT_NEED = "[연락처 확인 필요]";
  var B = [
    { id: "consent", law: LAW, article: "제50조제1항", quote: "누구든지 전자적 전송매체를 이용하여 영리목적의 광고성 정보를 전송하려면 그 수신자의 명시적인 사전 동의를 받아야 한다.", url: U1 },
    { id: "recent", law: LAW, article: "제50조제1항제1호", quote: "재화등의 거래관계를 통하여 수신자로부터 직접 연락처를 수집한 자가 대통령령으로 정한 기간 이내에 자신이 처리하고 수신자와 거래한 것과 같은 종류의 재화등에 대한 영리목적의 광고성 정보를 전송하려는 경우", url: U1 },
    { id: "recent-months", law: DEC, article: "제61조제1항", quote: "\"대통령령으로 정한 기간\"이란 해당 재화등의 거래가 종료된 날부터 6개월을 말한다.", url: U2 },
    { id: "refuse", law: LAW, article: "제50조제2항", quote: "수신자가 수신거부의사를 표시하거나 사전 동의를 철회한 경우에는 영리목적의 광고성 정보를 전송하여서는 아니 된다.", url: U1 },
    { id: "night", law: LAW, article: "제50조제3항", quote: "오후 9시부터 그 다음 날 오전 8시까지의 시간에 전자적 전송매체를 이용하여 영리목적의 광고성 정보를 전송하려는 자는 제1항에도 불구하고 그 수신자로부터 별도의 사전 동의를 받아야 한다.", url: U1 },
    { id: "mark", law: LAW, article: "제50조제4항", quote: "1. 전송자의 명칭 및 연락처 2. 수신의 거부 또는 수신동의의 철회 의사표시를 쉽게 할 수 있는 조치 및 방법에 관한 사항", url: U1 },
    { id: "mark-how", law: DEC, article: "별표 6", quote: "광고성 정보가 시작되는 부분에 (광고), 전송자의 명칭과 전화번호 또는 주소를 표시해야 한다", url: "https://www.law.go.kr/법령/정보통신망이용촉진및정보보호등에관한법률시행령/별표6" },
    { id: "free", law: DEC, article: "제62조", quote: "수신거부 및 수신동의 철회용 무료전화서비스 등을 해당 정보에 명시하여 수신자에게 이를 제공하여야 한다.", url: "https://www.law.go.kr/법령/정보통신망이용촉진및정보보호등에관한법률시행령/제62조" },
    { id: "renew", law: DEC, article: "제62조의3제1항", quote: "그 수신동의를 받은 날부터 2년마다(매 2년이 되는 해의 수신동의를 받은 날과 같은 날 전까지를 말한다) 해당 수신자의 수신동의 여부를 확인하여야 한다.", url: "https://www.law.go.kr/법령/정보통신망이용촉진및정보보호등에관한법률시행령/제62조의3" },
    { id: "agency", law: LAW, article: "제50조의3제1항", quote: "「전기통신사업법」 제2조제14호나목의 역무를 이용한 영리목적의 광고성 정보의 전송을 타인에게 위탁하려면 같은 법 제22조의11제1항에 따른 전송자격인증을 받은 자에게 위탁하여야 한다.", url: "https://www.law.go.kr/법령/정보통신망이용촉진및정보보호등에관한법률/제50조의3" }
  ];
  // 별표 6의 연락처는 "전화번호 또는 주소" — 카톡 채널 이름만으로는 안 된다(2026-10-01 재검수). 전화번호 꼴(숫자 묶음) 또는 주소 꼴(시·구·로·길·동 + 숫자)
  function hasContact(c) { var t = s(c); return /\d{2,4}[-\s.]?\d{3,4}[-\s.]?\d{4}/.test(t) || /(시|도|구|군|로|길|동|읍|면)\s*\d/.test(t); }
  // {name} 상호 {product} 상품 {offer} 구성·가격 {date} 기간·날짜 {detail} 상세 {contact} 문의처
  // ad: 광고 여부 — 거래 중인 손님에게 그 거래 자체를 알리는 것(예약 확인·배송·주문 변경)만 false, 상품·할인·방문 유도가 한 줄이라도 있으면 true
  var TEMPLATES = [
    { id: "new-menu", name: "신메뉴·신상품", ad: true, body: "{product} 나왔어요.\n{detail}\n{offer}" },
    { id: "sale", name: "할인·이벤트", ad: true, body: "{product} {detail}\n{date}\n{offer}" },
    { id: "thanks", name: "재방문 감사·단골", ad: true, body: "찾아 주셔서 고맙습니다.\n{detail}\n{date}" },
    { id: "closed", name: "휴무·영업시간 안내", ad: true, body: "{date} 휴무입니다.\n{detail}" },
    { id: "season", name: "계절·명절 인사", ad: true, body: "{detail}\n{product} {offer}" },
    { id: "booking", name: "예약 확인 (광고 아님)", ad: false, body: "{name} 예약 확인드립니다.\n{date} / {detail}\n변경·취소는 {contact}" }
  ];

  function s(v) { return String(v == null ? "" : v).normalize("NFKC").replace(/[ \t]+/g, " ").trim(); }
  function template(id) { return TEMPLATES.filter(function (t) { return t.id === id; })[0] || TEMPLATES[0]; }
  // 한글·한자 등 2바이트, 영문·숫자·기호·줄바꿈 1바이트 — 문자 업체마다 조금 다를 수 있어 화면에 '기준' 표시
  function bytes(text) { var n = 0; Array.from(String(text || "")).forEach(function (ch) { n += ch.charCodeAt(0) > 0x7f ? 2 : 1; }); return n; }
  function chars(text) { return Array.from(String(text || "")).length; }
  function kind(n) { return n <= SMS ? "SMS" : n <= LMS ? "LMS" : "over"; }
  function isNight(hour) { return typeof hour === "number" && (hour >= 21 || hour < 8); }

  function fill(body, v) {
    return body.replace(/\{(\w+)\}/g, function (_, k) { return s(v[k]); }).split("\n").map(function (l) { return l.trim(); }).filter(Boolean).join("\n");
  }

  // o: {template, values:{name,product,offer,date,detail,contact,reject}, consent: true|false|undefined, recent: bool, hour: 0-23, nightConsent: bool}
  function build(o) {
    var t = template(o.template), v = o.values || {}, text, checks = [];
    var body = fill(t.body, v), name = s(v.name), contact = s(v.contact), reject = s(v.reject);
    if (t.ad) {
      // 별표 6: 시작 부분에 (광고)·전송자 명칭·전화번호(또는 주소), 끝 부분에 수신거부 방법과 무료임을 명시
      text = "(광고)" + (name || "[상호]") + " " + (contact || CONTACT_NEED) + "\n" + body + "\n" + (reject ? "무료수신거부 " + reject : REJECT_NEED);
      var consent = o.consent === true ? true : o.consent === false ? (o.recent ? true : false) : null;
      checks.push({ id: "consent", ok: consent, text: consent === true && o.recent && o.consent !== true
        ? "동의는 없지만, 거래하면서 손님에게 직접 받은 연락처로 거래가 끝난 지 6개월 안에 그때 산 것과 같은 종류 상품만 보내는 경우 — 사전 동의 예외"
        : "받는 분의 명시적 사전 동의를 받았다(문자 광고 수신 동의). 예외: 거래하면서 직접 받은 연락처 + 거래 종료 6개월 안 + 같은 종류 상품", basis: ["consent", "recent", "recent-months"] });
      var night = isNight(o.hour);
      checks.push({ id: "night", ok: night ? !!o.nightConsent : true, text: night ? "밤 9시~아침 8시 발송 — 별도의 사전 동의가 필요해요(받았으면 체크)" : "낮 시간(아침 8시~밤 9시) 발송 — 별도 동의 불필요", basis: ["night"] });
      var okContact = hasContact(contact);
      checks.push({ id: "contact", ok: okContact, text: okContact ? "시작 부분에 보내는 사람 이름과 연락처(전화번호 또는 주소)를 넣었다" : contact ? "연락처에 전화번호나 주소가 없어요 — 카톡 채널 이름만으로는 안 돼요(별표 6)" : "연락처가 비어 있어요 — 전화번호나 주소를 넣어야 해요(시작 부분)", basis: ["mark", "mark-how"] });
      checks.push({ id: "reject", ok: !!reject, text: reject ? "무료 수신거부 방법을 끝에 적었다" : "무료 수신거부 번호(080 등)를 아직 안 넣었어요 — 문자 발송 업체에서 받은 번호를 넣으세요. 카톡 채널로 보낼 때는 카카오의 수신거부 방식을 확인(확인 못 함)", basis: ["mark", "mark-how", "free"] });
      checks.push({ id: "recent", ok: null, text: "수신 거부하거나 동의를 철회한 분에게는 보내지 않는다 (거부·철회 명단 확인)", basis: ["refuse"] });
      checks.push({ id: "renew", ok: null, text: "동의는 받은 날부터 2년마다 다시 확인해야 해요", basis: ["renew"] });
      checks.push({ id: "agency", ok: null, text: "문자 발송을 업체에 맡길 때는 전송자격인증을 받은 업체에 맡겨요", basis: ["agency"] });
    } else {
      text = body + (contact && body.indexOf(contact) === -1 ? "\n문의 " + contact : "");
      checks.push({ id: "not-ad", ok: null, text: "예약 확인·배송 안내처럼 거래 자체를 알리는 문자에는 (광고) 표시가 필요 없어요. 홍보 문구를 한 줄이라도 섞으면 광고 문자가 돼요. 광고성 정보의 범위(방송통신위원회·KISA 안내서)는 코퍼스에 없어 확인 못 함", basis: ["consent"] });
    }
    var n = bytes(text);
    return { template: t.id, ad: t.ad, text: text, bytes: n, chars: chars(text), kind: kind(n), sms: SMS, lms: LMS, checks: checks, basis: B };
  }

  function basis() { return B; }
  return { TEMPLATES: TEMPLATES, SMS: SMS, LMS: LMS, REJECT_NEED: REJECT_NEED, CONTACT_NEED: CONTACT_NEED, template: template, bytes: bytes, chars: chars, kind: kind, isNight: isNight, hasContact: hasContact, build: build, basis: basis };
});

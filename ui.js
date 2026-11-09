/* 화면 공용 도우미 — 요소 만들기(textContent만)와 복사. */
window.UI = (function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  // 보안 연결이면 clipboard, 거절당하거나 없으면 숨긴 입력칸으로 복사 (권한이 막힌 앱 속 브라우저·로컬 http 대비 — 라이브 재검수 지적)
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).catch(function () { return legacyCopy(text); });
    return legacyCopy(text);
  }
  function legacyCopy(text) {
    return new Promise(function (ok, fail) {
      var t = el("textarea");
      t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select();
      try { if (document.execCommand("copy")) ok(); else fail(); } catch (e) { fail(e); } finally { t.remove(); }
    });
  }
  // 버튼 글자를 잠깐 바꿔 결과를 알린다 — 연달아 눌러도 원래 글자로 돌아온다(2026-09-30 재검수)
  function flash(btn, msg) {
    if (!btn.dataset.orig) btn.dataset.orig = btn.textContent;
    btn.textContent = msg;
    clearTimeout(btn._flashTimer);
    btn._flashTimer = setTimeout(function () { btn.textContent = btn.dataset.orig; delete btn.dataset.orig; }, 1500);
  }
  // 우리 가게 카드 — 이 기기(localStorage)에만 저장. 공개 사업 정보만 담긴다(3차 설계 3-4, 사장님 승인 2026-10-01). 저장소가 막힌 브라우저(시크릿·인앱)에서도 화면은 돌아가야 하므로 전부 try로 감싼다.
  var PROFILE_KEY = "sajang-toolbox:profile";
  function loadProfile() {
    try { var raw = localStorage.getItem(PROFILE_KEY), o = raw ? JSON.parse(raw) : null; return o && window.ProfileCore ? window.ProfileCore.clean(o) : o; } catch (e) { return null; }
  }
  function saveProfile(p) {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(window.ProfileCore ? window.ProfileCore.clean(p) : p)); return true; } catch (e) { return false; }
  }
  function clearProfile() { try { localStorage.removeItem(PROFILE_KEY); return true; } catch (e) { return false; } }
  // 마케팅 도구 상단 띠: 카드가 있으면 이름·채운 칸 수 + [불러오기], 없으면 만들기 안내. onLoad(profile)로 칸을 채운다.
  function profileBar(box, onLoad) {
    var p = loadProfile(), P = window.ProfileCore;
    box.textContent = ""; box.className = "profile-bar";
    if (p && P && P.filled(p)) {
      box.appendChild(el("span", null, "우리 가게 카드: " + (p.name || "(상호 없음)") + " · " + P.filled(p) + "/" + P.FIELDS.length + "칸"));
      var b = el("button", "btn", "카드로 채우기"); b.type = "button";
      b.addEventListener("click", function () { onLoad(p); flash(b, "채웠어요"); });
      box.appendChild(b);
      var a = el("a", "btn", "카드 고치기"); a.href = "profile.html"; box.appendChild(a);
    } else {
      box.appendChild(el("span", null, "우리 가게 카드를 한 번 만들어 두면 이 도구의 칸이 미리 채워져요."));
      var mk = el("a", "btn", "가게 카드 만들기"); mk.href = "profile.html"; box.appendChild(mk);
    }
    return p;
  }
  return { $: $, el: el, copyText: copyText, flash: flash, loadProfile: loadProfile, saveProfile: saveProfile, clearProfile: clearProfile, profileBar: profileBar };
})();

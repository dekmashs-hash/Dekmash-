/* shop-settings.js — หน้า "ตั้งค่าเว็บไซต์" (เฉพาะแอดมิน) */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var TH_M = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  var rental = { expires_at: null, renew_url: null };
  var shopName = '';

  function setTxt(id, t) { var el = $(id); if (el) el.textContent = t; }
  function toast(msg) {
    var t = $('ssToast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  /* ---------- สถานะแพ็กเกจ ---------- */
  function renderRental() {
    var pill = $('spPill'); pill.className = 'sp-pill';
    var name = shopName || 'ร้าน';
    if (!rental.expires_at) {
      pill.classList.add('warn');
      setTxt('spPillTxt', 'WEBSITE STATUS: UNSET');
      setTxt('spLeft', 'ยังไม่ได้ตั้งวันหมดอายุ');
      setTxt('spLeftSub', 'ตั้งค่า SHOP_EXPIRES_AT ใน Cloudflare เพื่อแสดงเวลาที่เหลือของแพ็กเกจร้าน');
      return;
    }
    var exp = new Date(rental.expires_at), ms = exp.getTime() - Date.now();
    var p2 = function (x) { return String(x).padStart(2, '0'); };
    var when = exp.getDate() + ' ' + TH_M[exp.getMonth()] + ' ' + (exp.getFullYear() + 543) + ' เวลา ' + p2(exp.getHours()) + ':' + p2(exp.getMinutes()) + ' น.';
    if (ms <= 0) {
      pill.classList.add('bad');
      setTxt('spPillTxt', 'WEBSITE STATUS: EXPIRED');
      setTxt('spLeft', 'แพ็กเกจหมดอายุแล้ว');
      setTxt('spLeftSub', 'แพ็กเกจร้าน ' + name + ' หมดอายุ ' + when + ' กรุณาต่ออายุ');
      return;
    }
    var d = Math.floor(ms / 86400000), h = Math.floor(ms % 86400000 / 3600000), m = Math.floor(ms % 3600000 / 60000);
    var left = d > 0 ? d + ' วัน ' + h + ' ชั่วโมง' : (h > 0 ? h + ' ชั่วโมง ' + m + ' นาที' : m + ' นาที');
    if (d < 3) pill.classList.add('warn');
    setTxt('spPillTxt', 'WEBSITE STATUS: ACTIVE');
    setTxt('spLeft', 'เหลือเวลาอีก ' + left);
    setTxt('spLeftSub', 'แพ็กเกจร้าน ' + name + ' หมดอายุ ' + when + ' · คงเหลือ ' + left + ' จากวันเช่าใน Portal');
  }

  function showErr(msg) { var el = $('spErr'); el.textContent = msg; el.hidden = false; }

  function load() {
    return fetch('/api/admin/shop-stats', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) {
        if (r.status === 401 || r.status === 403) { location.replace('index.html'); throw new Error('forbidden'); }
        return r.json();
      })
      .then(function (j) {
        if (!j || !j.ok) throw new Error((j && j.error) || 'โหลดข้อมูลไม่สำเร็จ');
        $('spErr').hidden = true;
        shopName = (j.shop && j.shop.name) || shopName;
        setTxt('spName', shopName || 'DEK MASH');
        if (document.activeElement !== $('ssName') && !$('ssName').dataset.dirty) $('ssName').value = shopName;
        var logo = j.shop && j.shop.logo;
        if (logo && /^(https:|\/)/.test(logo)) {
          var box = $('spLogo'); box.textContent = '';
          var img = new Image(); img.alt = ''; img.src = logo; box.appendChild(img);
        } else { setTxt('spLogoTxt', (shopName || 'D').charAt(0).toUpperCase()); }
        setTxt('spAvatar', String((j.admin && j.admin.name) || 'A').charAt(0).toUpperCase());
        rental = j.rental || rental;
        renderRental();
      })
      .catch(function (e) { if (e && e.message !== 'forbidden') showErr(e.message || 'โหลดข้อมูลไม่สำเร็จ'); });
  }

  /* ---------- เมนู (เหมือนหน้า shop-panel) ---------- */
  function initMenu() {
    var burger = $('spBurger'), menu = $('spSheet');
    function setGrp(w, open) { w.classList.toggle('open', open); var b = w.querySelector('.grp'); if (b) b.setAttribute('aria-expanded', String(open)); }
    function collapseAll() { menu.querySelectorAll('.grpw.open').forEach(function (w) { setGrp(w, false); }); }
    function setMenu(open) {
      menu.classList.toggle('open', open);
      menu.setAttribute('aria-hidden', String(!open));
      if (open) menu.removeAttribute('inert'); else menu.setAttribute('inert', '');
      if (!open) collapseAll();
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'ปิดเมนู' : 'เมนู');
    }
    menu.querySelectorAll('.grpw').forEach(function (w) {
      w.querySelector('.grp').addEventListener('click', function () {
        if (w.hasAttribute('data-empty')) return;
        var willOpen = !w.classList.contains('open');
        menu.querySelectorAll('.grpw.open').forEach(function (o) { if (o !== w) setGrp(o, false); });
        setGrp(w, willOpen);
        if (willOpen) setTimeout(function () { w.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 120);
      });
    });
    menu.querySelectorAll('[data-href]').forEach(function (b) {
      b.addEventListener('click', function () {
        var to = b.getAttribute('data-href');
        if (to === location.pathname.split('/').pop()) { setMenu(false); return; }
        location.href = to;
      });
    });
    burger.addEventListener('click', function (e) { e.stopPropagation(); setMenu(!menu.classList.contains('open')); });
    document.addEventListener('click', function (e) { if (menu.classList.contains('open') && !menu.contains(e.target)) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  /* ---------- แท็บ ---------- */
  function initTabs() {
    var tabs = document.querySelectorAll('.ss-tab');
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        tabs.forEach(function (x) { var on = x === t; x.classList.toggle('on', on); x.setAttribute('aria-selected', String(on)); });
        ['basic', 'font', 'notice', 'more'].forEach(function (k) { $('ssPanel-' + k).hidden = k !== t.getAttribute('data-tab'); });
        t.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      });
    });
  }

  /* ---------- ฟอร์ม ---------- */
  function initForm() {
    $('ssName').addEventListener('input', function () { this.dataset.dirty = '1'; });
    $('ssUpload').addEventListener('click', function () { $('ssFile').click(); });
    $('ssDrop').addEventListener('click', function () { $('ssFile').click(); });
    $('ssFile').addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (!f) return;
      if (!/^image\//.test(f.type)) { toast('กรุณาเลือกไฟล์รูปภาพ'); return; }
      var img = $('ssPreview'); img.src = URL.createObjectURL(f); img.hidden = false; $('ssDrop').classList.add('has');
    });
    $('ssSave').addEventListener('click', function () {
      var btn = this, name = $('ssName').value.trim();
      if (!name) { toast('กรุณากรอกชื่อเว็บไซต์'); $('ssName').focus(); return; }
      btn.disabled = true;
      fetch('/api/admin/site-settings', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ store_name: name }) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (x) {
          if (!x.ok || !x.j || !x.j.ok) throw new Error((x.j && x.j.error) || 'บันทึกไม่สำเร็จ');
          shopName = name; setTxt('spName', name); delete $('ssName').dataset.dirty; renderRental();
          toast('บันทึกการตั้งค่าแล้ว');
        })
        .catch(function (e) { toast(e.message || 'บันทึกไม่สำเร็จ'); })
        .then(function () { btn.disabled = false; });
    });
    $('spRenew').addEventListener('click', function () {
      if (rental.renew_url) { window.open(rental.renew_url, '_blank', 'noopener'); return; }
      showErr('ยังไม่ได้ตั้งลิงก์ต่ออายุ (SHOP_RENEW_URL) — ติดต่อผู้ให้เช่าเว็บเพื่อต่ออายุ');
      setTimeout(function () { $('spErr').hidden = true; }, 5000);
    });
  }

  initMenu(); initTabs(); initForm();
  fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
    if (!j || !j.loggedIn || !j.user || !j.user.isAdmin) { location.replace('index.html'); return; }
    load();
  }).catch(function () { location.replace('index.html'); });
  setInterval(renderRental, 30000);
})();

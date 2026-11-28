/* shop-settings.js — หน้า "ตั้งค่าเว็บไซต์" (เฉพาะแอดมิน) */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var TH_M = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  var rental = { expires_at: null, renew_url: null };
  var shopName = '';
  var logoSrc = null, logoImg = null, logoDirty = false, logoSaved = '';

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
        if (!logoDirty) { logoSaved = (logo && /^(https:|\/)/.test(logo)) ? logo : ''; preloadSaved(logoSaved); refreshLogo(); }
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
        $('ssPanel-basic2').hidden = t.getAttribute('data-tab') !== 'basic';
        setTimeout(placePika, 0); t.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      });
    });
  }

  /* ---------- โลโก้: เลือกรูป + ปรับขนาด + พรีวิว ---------- */
  /* ปิกาจูแดงบนแถบเลื่อน: ยืนนิ่ง (หายใจเบาๆ) ตอนไม่ได้ลาก — วิ่งตอนลาก หันตามทิศที่เลื่อน */
  var pikaT = 0, lastPct = 100;
  function placePika() {
    var r = $('ssLogoRange'), pk = $('ssPika'), w = $('ssRangeWrap');
    var ratio = (r.value - r.min) / (r.max - r.min);
    var W = w.clientWidth || w.getBoundingClientRect().width || 200; pk.style.left = Math.max(0, ratio * (W - 44)) + 'px';
  }
  function pikaRun(pct) {
    var pk = $('ssPika');
    if (pct !== lastPct) pk.classList.toggle('flip', pct < lastPct);
    lastPct = pct;
    pk.classList.remove('idle'); pk.classList.add('run');
    clearTimeout(pikaT);
    pikaT = setTimeout(function () { pk.classList.remove('run'); pk.classList.add('idle'); }, 220);
  }
  var baseImg = null, origDirty = false;
  function loadBlobImg(url, ok, bad) {
    fetch(url, { mode: 'cors', cache: 'no-store' }).then(function (r) { if (!r.ok) throw 0; return r.blob(); }).then(function (bl) {
      var im = new Image(); im.onload = function () { ok(im); }; im.onerror = bad; im.src = URL.createObjectURL(bl);
    }).catch(bad);
  }
  function preloadSaved(url) {
    baseImg = null; if (!url) return;
    var m = /_s(\d{2,3})\.\w+$/.exec(url), sc = m ? Math.min(100, Math.max(30, +m[1])) : 100;
    var orig = url.replace(/\/logo\/[^/]+$/, '/logo/original.png');
    loadBlobImg(orig + '?t=' + Date.now(), function (im) {
      if (logoSaved !== url) return;
      baseImg = im; if (!logoDirty) { $('ssLogoRange').value = sc; placePika(); $('ssLogoPct').textContent = sc + '%'; }
    }, function () {   // โลโก้เก่าที่ไม่มีต้นฉบับ -> ใช้ภาพที่บันทึกไว้เป็นฐาน 100%
      loadBlobImg(url, function (im) { if (logoSaved === url) baseImg = im; }, function () {});
    });
  }
  function origData(im) {
    var r = Math.min(1, 512 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth * r); c.height = Math.round(im.naturalHeight * r);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); return c.toDataURL('image/png');
  }
  function drawLogo(pct) {
    var c = document.createElement('canvas'); c.width = c.height = 256;
    var g = c.getContext('2d'), k = 256 * pct / 100, w = logoImg.naturalWidth, h = logoImg.naturalHeight, r = Math.min(k / w, k / h);
    g.drawImage(logoImg, (256 - w * r) / 2, (256 - h * r) / 2, w * r, h * r);
    return c.toDataURL('image/png');
  }
  function refreshLogo() {
    var pct = +$('ssLogoRange').value; $('ssLogoPct').textContent = pct + '%'; placePika();
    var url = logoImg ? drawLogo(pct) : (logoSaved || '');
    ['ssLogoImg', 'ssPrevImg'].forEach(function (id) { var im = $(id); if (url) { im.src = url; im.hidden = false; } else { im.hidden = true; } });
    $('ssLogoBox').classList.toggle('has', !!url); $('ssPrevTxt').hidden = !!url;
    $('ssPrevName').textContent = ($('ssName').value.trim() || shopName || 'DEK MASH');
  }
  function initLogo() {
    var pick = function () { $('ssLogoFile').click(); };
    $('ssLogoBox').addEventListener('click', pick);
    $('ssLogoBox').addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    $('ssLogoUpload').addEventListener('click', pick);
    $('ssLogoRange').addEventListener('input', function () {
      pikaRun(+this.value);
      if (!logoImg && baseImg) { logoImg = baseImg; }   // ใช้โลโก้ที่บันทึกไว้เป็นต้นฉบับ (โหลดเตรียมไว้แล้ว)
      logoDirty = !!logoImg; refreshLogo();
    });
    $('ssPika').classList.add('idle'); placePika(); window.addEventListener('resize', placePika);
    $('ssName').addEventListener('input', refreshLogo);
    $('ssLogoFile').addEventListener('change', function () {
      var f = this.files && this.files[0]; this.value = '';
      if (!f) return;
      if (!/^image\//.test(f.type)) { toast('กรุณาเลือกไฟล์รูปภาพ'); return; }
      var u = URL.createObjectURL(f), im = new Image();
      im.onload = function () { logoImg = im; logoDirty = true; origDirty = true; $('ssLogoRange').disabled = false; $('ssLogoRange').value = 100; refreshLogo(); };
      im.onerror = function () { toast('เปิดไฟล์รูปไม่ได้'); };
      im.src = u;
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
      var payload = { store_name: name };
      if (logoImg && logoDirty) {
        payload.logo_data = drawLogo(+$('ssLogoRange').value); payload.logo_scale = +$('ssLogoRange').value;
        if (origDirty) payload.logo_orig = origData(logoImg);
      }
      fetch('/api/admin/site-settings', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (x) {
          if (!x.ok || !x.j || !x.j.ok) throw new Error((x.j && x.j.error) || 'บันทึกไม่สำเร็จ');
          if (x.j.logo_url) { var keep = +$('ssLogoRange').value; logoSaved = x.j.logo_url; origDirty = false; if (logoImg) baseImg = logoImg; logoImg = null; logoDirty = false; $('ssLogoRange').value = keep; refreshLogo();
            var lb = $('spLogo'); lb.textContent = ''; var li = new Image(); li.alt = ''; li.src = x.j.logo_url; lb.appendChild(li); }
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

  initMenu(); initTabs(); initForm(); initLogo();
  fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
    if (!j || !j.loggedIn || !j.user || !j.user.isAdmin) { location.replace('index.html'); return; }
    load();
  }).catch(function () { location.replace('index.html'); });
  setInterval(renderRental, 30000);
})();

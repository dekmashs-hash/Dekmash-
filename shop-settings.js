/* shop-settings.js — หน้า "ตั้งค่าเว็บไซต์" (เฉพาะแอดมิน) */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var TH_M = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  var stDoneRes = function () {};
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
    return fetch('/api/admin/shop-stats?lite=1', { credentials: 'same-origin', cache: 'no-store' })
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
          var box = $('spLogo'); box.textContent = ''; box.classList.add('has-img');
          var img = new Image(); img.alt = ''; img.src = logo; box.appendChild(img);
        } else { setTxt('spLogoTxt', (shopName || 'D').charAt(0).toUpperCase()); }
        if (!logoDirty) { logoSaved = (logo && /^(https:|\/)/.test(logo)) ? logo : ''; refreshLogo(); var sv = logoSaved; stDone.then(function () { if (logoSaved === sv && !logoDirty) preloadSaved(sv); }); }
        setTxt('spAvatar', String((j.admin && j.admin.name) || 'A').charAt(0).toUpperCase());
        if (!dcLoaded) { dcStyle = (j.shop && j.shop.discord_style) || 'classic'; dcLoaded = true; renderDc(); }
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
        $('ssPanel-basic2').hidden = $('ssPanel-basic3').hidden = $('ssPanel-basic4').hidden = t.getAttribute('data-tab') !== 'basic';
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
  var baseImg = null, origDirty = false, baseWait = false;
  function loadBlobImg(url, ok, bad) {
    fetch(url, { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { if (!r.ok) throw 0; return r.blob(); }).then(function (bl) {
      var im = new Image(); im.onload = function () { ok(im); }; im.onerror = bad; im.src = URL.createObjectURL(bl);
    }).catch(bad);
  }
  // ตัดขอบโปร่งใสของโลโก้เก่าที่เคยบันทึกแบบย่อไว้ (ไม่มีต้นฉบับ) เพื่อให้ 100% = เต็มขนาดรูปจริง
  function trimImg(im) {
    try {
      var w = im.naturalWidth, h = im.naturalHeight, c = document.createElement('canvas'); c.width = w; c.height = h;
      var g = c.getContext('2d'); g.drawImage(im, 0, 0);
      var d = g.getImageData(0, 0, w, h).data, x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0 || (x0 === 0 && y0 === 0 && x1 === w - 1 && y1 === h - 1)) return im;
      var tw = x1 - x0 + 1, th = y1 - y0 + 1, t = document.createElement('canvas'); t.width = tw; t.height = th;
      t.getContext('2d').drawImage(c, x0, y0, tw, th, 0, 0, tw, th);
      var out = new Image(); out.src = t.toDataURL('image/png'); return out;
    } catch (e) { return im; }
  }
  function baseReady(im, scale) {
    baseImg = im;
    if (baseWait) { baseWait = false; logoImg = baseImg; logoDirty = true; }
    else if (!logoDirty) { $('ssLogoRange').value = scale; }
    refreshLogo();
  }
  function preloadSaved(url) {
    baseImg = null; if (!url) return;
    var m = /_s(\d{2,3})\.\w+$/.exec(url), sc = m ? Math.min(100, Math.max(30, +m[1])) : 100;
    loadBlobImg('/api/admin/site-logo?which=original&t=' + Date.now(), function (im) {
      if (logoSaved === url) baseReady(im, sc);
    }, function () {   // โลโก้เก่าที่ไม่มีต้นฉบับ -> ใช้ภาพที่บันทึกไว้ (ตัดขอบโปร่งใสออก) เป็นฐาน 100%
      loadBlobImg('/api/admin/site-logo?which=current&t=' + Date.now(), function (im) {
        if (logoSaved !== url) return;
        var t = trimImg(im);
        if (t.complete || t === im) baseReady(t, 100); else t.onload = function () { if (logoSaved === url) baseReady(t, 100); };
      }, function () { baseWait = false; });
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
      else if (!logoImg && logoSaved) { baseWait = true; }  // ต้นฉบับยังโหลดไม่เสร็จ — พอเสร็จจะใช้ค่าแถบเลื่อนตอนนั้นทันที
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

  /* ---------- ดีไซน์การ์ด Discord หน้าแรก (ติ๊กเลือก 1 แบบ) ---------- */
  var DC_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>';
  var dcStyle = 'classic', dcLoaded = false;
  var DC_OPTS = [
    { v: 'classic', t: 'ดีไซน์เดิม', c: '' },
    { v: 'a', t: 'A · Neon Glass', c: ' dcv-a' },
    { v: 'b', t: 'B · Banner', c: ' dcv-b' }
  ];
  function dcAv(c, t) { return 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="' + c + '"/><text x="20" y="26" text-anchor="middle" font-size="18" font-family="sans-serif" fill="#fff">' + t + '</text></svg>'); }
  function dcSample(cls) {
    return '<div class="hc-dc' + cls + '"><div class="hc-dc-top"><div class="hc-dc-ico">' + DC_ICON + '</div><div class="hc-dc-info"><div class="hc-dc-name">' + (shopName || 'DEK MASH').replace(/[<>&"]/g, '') + '</div><div class="hc-dc-on"><i></i><span>ອອນລາຍ 35 ຄົນ</span></div></div>' +
      '<div class="hc-dc-stack"><img alt="" src="' + dcAv('#c0392b', 'A') + '"><img alt="" src="' + dcAv('#2980b9', 'B') + '"><img alt="" src="' + dcAv('#8e44ad', 'C') + '"><span class="hc-dc-more">' + DC_ICON + '</span></div></div>' +
      '<div class="hc-dc-act"><button class="hc-dc-mem" type="button" tabindex="-1">ເບິ່ງສະມາຊິກ</button><a class="hc-dc-join">' + DC_ICON + 'ເຂົ້າຮ່ວມ Discord</a></div></div>';
  }
  function renderDc() {
    var box = $('ssDcOpts'); if (!box) return;
    box.innerHTML = DC_OPTS.map(function (o) {
      var on = o.v === dcStyle;
      return '<div class="ss-dc-opt' + (on ? ' on' : '') + '" role="radio" tabindex="0" aria-checked="' + on + '" data-v="' + o.v + '">' +
        '<div class="ss-dc-head"><span class="ss-dc-tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.500 4.500 4.500L19 7.500"/></svg></span><b>' + o.t + '</b></div>' +
        '<div class="ss-dc-prev" aria-hidden="true">' + dcSample(o.c) + '</div></div>';
    }).join('');
  }
  function initDc() {
    renderDc();
    $('ssDcOpts').addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('ss-dc-opt')) { e.preventDefault(); e.target.click(); }
    });
    $('ssDcOpts').addEventListener('click', function (e) {
      var b = e.target.closest('.ss-dc-opt'); if (!b) return;
      dcStyle = b.getAttribute('data-v'); dcLoaded = true; renderDc();
    });
  }

  /* ---------- สถิติหน้าแรก: สวิตช์ ตัวเลขจำลอง (เปิด = แก้เลขเองได้ / ปิด = ใช้เลขจริง) ---------- */
  var stDone = new Promise(function (res) { stDoneRes = res; });
  var stState = { enabled: false, real: { users: 0, products: 0, stock: 0, sold: 0 }, fake: { users: 0, products: 0, stock: 0, sold: 0 }, loaded: false };
  var ST_KEYS = ['users', 'products', 'stock', 'sold'];
  function fmtN(n) { return Number(n || 0).toLocaleString('en-US'); }
  function renderSt() {
    var sw = $('ssStSw'); if (!sw) return;
    sw.setAttribute('aria-checked', String(stState.enabled));
    $('ssStats').classList.toggle('edit', stState.enabled);
    $('ssStHint').textContent = stState.enabled ? 'เปิด = แสดงตัวเลขจำลองที่คุณตั้งเอง (แตะตัวเลขเพื่อแก้)' : 'ปิด = แสดงตัวเลขจริงของร้าน';
    ST_KEYS.forEach(function (k) {
      var el = $('ssSt-' + k); el.readOnly = !stState.enabled;
      if (document.activeElement !== el) el.value = fmtN(stState.enabled ? stState.fake[k] : stState.real[k]);
    });
  }
  function initSt() {
    $('ssStSw').addEventListener('click', function () {
      if (!stState.loaded) { toast('กำลังโหลดตัวเลข…'); return; }
      stState.enabled = !stState.enabled;
      // เปิดครั้งแรกที่ยังไม่เคยตั้งเลข -> เริ่มจากตัวเลขจริงให้แก้ต่อได้เลย
      if (stState.enabled && ST_KEYS.every(function (k) { return !stState.fake[k]; })) ST_KEYS.forEach(function (k) { stState.fake[k] = stState.real[k]; });
      renderSt();
    });
    ST_KEYS.forEach(function (k) {
      var el = $('ssSt-' + k);
      el.addEventListener('focus', function () { if (stState.enabled) { el.value = String(stState.fake[k] || ''); try { el.select(); } catch (e) {} } });
      el.addEventListener('input', function () {
        var d = el.value.replace(/\D/g, '').slice(0, 9); el.value = d; stState.fake[k] = d ? +d : 0;
      });
      el.addEventListener('blur', function () { renderSt(); });
    });
  }
  function loadSt() {
    return fetch('/api/admin/home-stats', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) {
      if (r.status === 401 || r.status === 403) { location.replace('index.html'); throw 0; }
      return r.json();
    }).then(function (j) {
      if (!j || !j.ok) throw 0;
      stState.enabled = !!j.enabled; stState.real = j.real; stState.fake = j.fake; stState.loaded = true; renderSt();
    }).catch(function () { setTxt('ssStHint', 'โหลดตัวเลขไม่สำเร็จ — รีเฟรชหน้านี้'); }).then(stDoneRes);
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
      if (dcLoaded) payload.discord_style = dcStyle;
      if (stState.loaded) { payload.stats_fake_enabled = stState.enabled; payload.stats_fake = stState.fake; }
      if (logoImg && logoDirty) {
        payload.logo_data = drawLogo(+$('ssLogoRange').value); payload.logo_scale = +$('ssLogoRange').value;
        if (origDirty) payload.logo_orig = origData(logoImg);
      }
      fetch('/api/admin/site-settings', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (x) {
          if (!x.ok || !x.j || !x.j.ok) throw new Error((x.j && x.j.error) || 'บันทึกไม่สำเร็จ');
          if (x.j.logo_url) { var keep = +$('ssLogoRange').value; logoSaved = x.j.logo_url; origDirty = false; if (logoImg) baseImg = logoImg; logoImg = null; logoDirty = false; $('ssLogoRange').value = keep; refreshLogo();
            var lb = $('spLogo'); lb.textContent = ''; lb.classList.add('has-img'); var li = new Image(); li.alt = ''; li.src = x.j.logo_url; lb.appendChild(li); }
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

  initMenu(); initTabs(); initForm(); initLogo(); initDc(); initSt();
  // เรียกพร้อมกันเลย (เดิมรอ /api/me ก่อนแล้วค่อยเรียกทีละตัว = ช้า) — 2 endpoint นี้ตรวจสิทธิ์แอดมินที่ฝั่ง Worker เอง และเด้งออกถ้า 401/403
  load(); loadSt();
  setInterval(renderRental, 30000);
})();

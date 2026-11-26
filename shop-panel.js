/* shop-panel.js — ໜ້າ "ຈັດການແຜງຮ້ານ" (ສະເພາະແອດມິນ)
   ດຶງສະຖິຕິຈິງຈາກ GET /api/admin/shop-stats (Worker ກວດສິດແອດມິນຊ້ຳອີກຊັ້ນ) */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var MONTHS = ['ມັງກອນ','ກຸມພາ','ມີນາ','ເມສາ','ພຶດສະພາ','ມິຖຸນາ','ກໍລະກົດ','ສິງຫາ','ກັນຍາ','ຕຸລາ','ພະຈິກ','ທັນວາ'];
  var rental = { expires_at: null, renew_url: null };
  var shopName = 'DEK MASH';

  function num(n) { return Number(n) || 0; }
  function full(n) { return num(n).toLocaleString('en-US'); }
  function kip(n, tight) {
    n = num(n);
    if (Math.abs(n) >= (tight ? 1e6 : 1e10)) return '₭' + new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 }).format(n);
    return '₭' + full(n);
  }
  function setTxt(id, t) { var el = $(id); if (el) el.textContent = t; }
  function setUnit(id, v, unit) { var el = $(id); if (!el) return; el.textContent = full(v); var u = document.createElement('small'); u.textContent = ' ' + unit; el.appendChild(u); }

  /* ---------- ອາຍຸແພັກເກັດ ---------- */
  function renderRental() {
    var pill = $('spPill');
    pill.className = 'sp-pill';
    if (!rental.expires_at) {
      pill.classList.add('warn');
      setTxt('spPillTxt', 'ສະຖານະເວັບ: ຍັງບໍ່ກຳນົດ');
      setTxt('spLeft', 'ຍັງບໍ່ໄດ້ຕັ້ງວັນໝົດອາຍຸ');
      setTxt('spLeftSub', 'ຕັ້ງຄ່າ SHOP_EXPIRES_AT ໃນ Cloudflare ເພື່ອສະແດງເວລາທີ່ເຫຼືອຂອງແພັກເກັດຮ້ານ');
      return;
    }
    var exp = new Date(rental.expires_at);
    var ms = exp.getTime() - Date.now();
    var p2 = function (x) { return String(x).padStart(2, '0'); };
    var when = exp.getDate() + ' ' + MONTHS[exp.getMonth()] + ' ' + exp.getFullYear() +
      ' ເວລາ ' + p2(exp.getHours()) + ':' + p2(exp.getMinutes()) + ' ນ.';
    if (ms <= 0) {
      pill.classList.add('bad');
      setTxt('spPillTxt', 'ສະຖານະເວັບ: ໝົດອາຍຸ');
      setTxt('spLeft', 'ແພັກເກັດໝົດອາຍຸແລ້ວ');
      setTxt('spLeftSub', 'ແພັກເກັດຮ້ານ ' + shopName + ' ໝົດອາຍຸ ' + when + ' ກະລຸນາຕໍ່ອາຍຸ');
      return;
    }
    var d = Math.floor(ms / 86400000), h = Math.floor(ms % 86400000 / 3600000), m = Math.floor(ms % 3600000 / 60000);
    var left = d > 0 ? d + ' ວັນ ' + h + ' ຊົ່ວໂມງ' : (h > 0 ? h + ' ຊົ່ວໂມງ ' + m + ' ນາທີ' : m + ' ນາທີ');
    if (d < 3) pill.classList.add('warn');
    setTxt('spPillTxt', 'ສະຖານະເວັບ: ເປີດໃຊ້ງານ');
    setTxt('spLeft', 'ເຫຼືອເວລາອີກ ' + left);
    setTxt('spLeftSub', 'ແພັກເກັດຮ້ານ ' + shopName + ' ໝົດອາຍຸ ' + when + ' · ຄົງເຫຼືອ ' + left);
  }

  /* ---------- ສະຖິຕິ ---------- */
  function renderStats(s) {
    setUnit('vMembers', s.members_total, 'ຄົນ');
    setTxt('sMembers', 'ມື້ນີ້ເພີ່ມ +' + full(s.members_today) + ' ຄົນ');
    setUnit('vOrders', s.orders_total, 'ລາຍການ');
    setTxt('sOrders', 'ມື້ນີ້ ' + full(s.orders_today) + ' ລາຍການ');
    var set = function (id, v, tight) { setTxt(id, kip(v, tight)); $(id).title = '₭' + full(v); };
    set('vSales', s.sales_total, true);
    setTxt('sSales', 'ມື້ນີ້ ' + kip(s.sales_today, true));
    set('vCredit', s.credit_total, true);
    setTxt('sCredit', 'ຍອດເງິນໃນກະເປົາຜູ້ໃຊ້ລວມ · ' + full(s.credit_users) + ' ຄົນ');
    set('vDeposit', s.deposit_total);
    setTxt('sDeposit', 'ມື້ນີ້ ' + kip(s.deposit_today) + ' · ອະນຸມັດແລ້ວ ' + full(s.deposit_count) + ' ລາຍການ');
    var pc = num(s.pending_count);
    setTxt('vPending', full(pc) + ' ລາຍການ');
    setTxt('sPending', pc ? 'ລໍຖ້າກວດສອບ · ລວມ ' + kip(s.pending_amount) : 'ບໍ່ມີລາຍການເຕີມເງິນທີ່ລໍຖ້າກວດສອບ');
    setTxt('spToday', kip(s.sales_today));
    renderBars(s.daily || []);
  }

  function renderBars(days) {
    var box = $('spBars');
    var max = 1;
    days.forEach(function (d) { max = Math.max(max, num(d.sales), num(d.deposit)); });
    box.innerHTML = days.map(function (d) {
      return '<div class="sp-bar"><div class="sp-bar-cols">' +
        '<div class="sp-col r" data-h="' + (num(d.sales) / max * 100).toFixed(1) + '" title="ຍອດຂາຍ ₭' + full(d.sales) + '"></div>' +
        '<div class="sp-col b" data-h="' + (num(d.deposit) / max * 100).toFixed(1) + '" title="ເຕີມເງິນ ₭' + full(d.deposit) + '"></div>' +
        '</div><small>' + String(d.label || '') + '</small></div>';
    }).join('');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        box.querySelectorAll('.sp-col').forEach(function (c) { c.style.height = c.getAttribute('data-h') + '%'; });
      });
    });
  }

  /* ---------- ໂຫຼດຂໍ້ມູນ ---------- */
  var loading = false;
  function load() {
    if (loading) return Promise.resolve();
    loading = true;
    var btn = $('spRefresh'); btn.classList.add('spin');
    return fetch('/api/admin/shop-stats', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) {
        if (r.status === 401 || r.status === 403) { location.replace('index.html'); throw new Error('forbidden'); }
        return r.json();
      })
      .then(function (j) {
        if (!j || !j.ok) throw new Error((j && j.error) || 'ໂຫຼດຂໍ້ມູນບໍ່ສຳເລັດ');
        $('spErr').hidden = true;
        shopName = (j.shop && j.shop.name) || shopName;
        setTxt('spName', shopName);
        var logo = j.shop && j.shop.logo;
        if (logo && /^(https:|\/)/.test(logo)) {
          var box = $('spLogo'); box.textContent = '';
          var img = new Image(); img.alt = ''; img.src = logo; box.appendChild(img);
        } else { setTxt('spLogoTxt', shopName.charAt(0).toUpperCase()); }
        setTxt('spAvatar', String((j.admin && j.admin.name) || 'A').charAt(0).toUpperCase());
        rental = j.rental || rental;
        renderRental();
        renderStats(j.stats || {});
        setTxt('spFoot', 'ອັບເດດລ່າສຸດ ' + new Date().toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' · ໂຫຼດໃໝ່ອັດຕະໂນມັດທຸກ 1 ນາທີ');
      })
      .catch(function (e) {
        if (e && e.message === 'forbidden') return;
        var el = $('spErr'); el.textContent = e && e.message ? e.message : 'ໂຫຼດຂໍ້ມູນບໍ່ສຳເລັດ'; el.hidden = false;
      })
      .then(function () { loading = false; setTimeout(function () { btn.classList.remove('spin'); }, 400); });
  }

  function init() {
    var burger = $('spBurger'), menu = $('spSheet');
    function setMenu(open) {
      menu.classList.toggle('open', open);
      menu.setAttribute('aria-hidden', String(!open));
      if (open) menu.removeAttribute('inert'); else menu.setAttribute('inert', '');
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'ປິດເມນູ' : 'ເມນູ');
    }
    burger.addEventListener('click', function (e) {
      e.stopPropagation();
      setMenu(!menu.classList.contains('open'));
    });
    document.addEventListener('click', function (e) {
      if (menu.classList.contains('open') && !menu.contains(e.target)) setMenu(false);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    $('spMenuDash').addEventListener('click', function (e) { e.preventDefault(); setMenu(false); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    $('spRefresh').addEventListener('click', load);
    $('spRenew').addEventListener('click', function () {
      if (rental.renew_url) { window.open(rental.renew_url, '_blank', 'noopener'); return; }
      var el = $('spErr'); el.textContent = 'ຍັງບໍ່ໄດ້ຕັ້ງລິ້ງຕໍ່ອາຍຸ (SHOP_RENEW_URL) — ຕິດຕໍ່ຜູ້ໃຫ້ເຊົ່າເວັບເພື່ອຕໍ່ອາຍຸ'; el.hidden = false;
      setTimeout(function () { el.hidden = true; }, 5000);
    });
    // ກວດວ່າລ໋ອກອິນເປັນແອດມິນ (Worker ກວດຊ້ຳອີກຊັ້ນໃນ /api/admin/shop-stats)
    fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.loggedIn || !j.user || !j.user.isAdmin) { location.replace('index.html'); return; }
      load();
    }).catch(function () { location.replace('index.html'); });
    setInterval(load, 60000);
    setInterval(renderRental, 30000);
  }
  init();
})();

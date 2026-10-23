/* Shared helpers for the SRD application pages */
(function () {
  var SRD = {};

  /* Demo data: used whenever nothing has been entered yet, or when the
     browser blocks storage (e.g. some browsers opening files locally). */
  var DEMO = {
    type: 'sa', id: '9603145800084', phone: '0723456789',
    first: 'Thandiwe', last: 'Mokoena', pay: 'Capitec ••• 7890', ref: 'SRD-482913',
    address: '12 Mandela Street, Benoni, Gauteng'
  };
  var memory = {};
  SRD.demoPin = '482193';

  SRD.get = function (k) {
    var v = '';
    try { v = sessionStorage.getItem('srd_' + k) || ''; } catch (e) { v = memory[k] || ''; }
    if (!v) { try { v = localStorage.getItem('srd_' + k) || ''; } catch (e) {} }
    return v || DEMO[k] || '';
  };
  SRD.set = function (k, v) {
    memory[k] = v;
    try { sessionStorage.setItem('srd_' + k, v); } catch (e) {}
    try { localStorage.setItem('srd_' + k, v); } catch (e) {}
  };
  SRD.digits = function (v) { return (v || '').replace(/\D/g, ''); };
  SRD.isAsylum = function () { return SRD.get('type') === 'asylum'; };

  SRD.maskId = function (id) { return id ? id.slice(0, 4) + ' ••••• ' + id.slice(-2) : '—'; };
  SRD.maskPhone = function (p) { return p ? p.slice(0, 3) + ' ••• ' + p.slice(6) : '—'; };

  // SA ID: 13 digits, real month/day, valid check digit (Luhn)
  SRD.validSaId = function (id) {
    if (!/^\d{13}$/.test(id)) return false;
    var mm = +id.slice(2, 4), dd = +id.slice(4, 6);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return false;
    var sum = 0;
    for (var i = 0; i < 13; i++) {
      var n = +id[12 - i];
      if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
      sum += n;
    }
    return sum % 10 === 0;
  };
  SRD.validPhone = function (p) { return /^0[6-8]\d{8}$/.test(p); };

  SRD.setErr = function (inp, msg) {
    var el = document.getElementById(inp.getAttribute('data-err'));
    if (el) el.textContent = msg || '';
    inp.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  };

  /* Step 1: details form -> PIN form -> next page */
  SRD.initVerify = function (opts) {
    var idForm = document.getElementById('idForm');
    var pinForm = document.getElementById('pinForm');
    var phInp = document.getElementById('phone');
    var boxes = Array.prototype.slice.call(pinForm.querySelectorAll('.pin input'));

    idForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var result = opts.validate();          // returns {ok, id, firstBad}
      var ph = SRD.digits(phInp.value);
      var phoneOk = SRD.setErr(phInp, SRD.validPhone(ph) ? '' : 'Enter a 10-digit SA cellphone number starting with 06, 07 or 08.');
      if (!result.ok || !phoneOk) { (result.ok ? phInp : result.firstBad).focus(); return; }
      SRD.set('type', opts.type); SRD.set('id', result.id); SRD.set('phone', ph);
      document.getElementById('maskedPhone').textContent = SRD.maskPhone(ph);
      idForm.hidden = true; pinForm.hidden = false; startTimer();
      // Demo: fill the PIN in, one digit at a time, as if the SMS arrived
      boxes.forEach(function (b, i) { setTimeout(function () { b.value = SRD.demoPin[i]; }, 250 + i * 120); });
      setTimeout(function () { pinForm.querySelector('button[type="submit"]').focus(); }, 250 + 6 * 120);
    });

    boxes.forEach(function (box, i) {
      box.addEventListener('input', function () {
        box.value = SRD.digits(box.value).slice(-1);
        if (box.value && i < 5) boxes[i + 1].focus();
      });
      box.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !box.value && i > 0) boxes[i - 1].focus();
      });
      box.addEventListener('paste', function (e) {
        var t = SRD.digits((e.clipboardData || window.clipboardData).getData('text')).slice(0, 6);
        if (!t) return;
        e.preventDefault();
        t.split('').forEach(function (c, j) { boxes[j].value = c; });
        boxes[Math.min(t.length, 5)].focus();
      });
    });

    pinForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var pin = boxes.map(function (b) { return b.value; }).join('');
      if (pin.length !== 6) { document.getElementById('pinErr').textContent = 'Enter all 6 digits of the PIN.'; return; }
      window.location.href = 'declaration.html';
    });

    document.getElementById('changeNum').addEventListener('click', function () {
      pinForm.hidden = true; idForm.hidden = false; phInp.focus();
    });

    var resend = document.getElementById('resend'), timer;
    function startTimer() {
      var left = 60; resend.disabled = true; clearInterval(timer);
      timer = setInterval(function () {
        left--;
        resend.textContent = 'Resend PIN in 0:' + (left < 10 ? '0' : '') + left;
        if (left <= 0) { clearInterval(timer); resend.disabled = false; resend.textContent = 'Resend PIN'; }
      }, 1000);
    }
    resend.addEventListener('click', startTimer);
  };

  /* Fill shared bits on every page */
  document.addEventListener('DOMContentLoaded', function () {
    var asylum = SRD.isAsylum();
    var startPage = asylum ? 'asylum.html' : 'sa-id.html';
    var title = asylum ? 'Asylum Seekers & Permit Holders' : 'South African ID Holders';

    document.querySelectorAll('[data-type-title]').forEach(function (el) { el.textContent = title; });
    document.querySelectorAll('[data-start-link]').forEach(function (el) { el.setAttribute('href', startPage); });
    document.querySelectorAll('[data-id-label]').forEach(function (el) { el.textContent = asylum ? 'File / permit no.' : 'ID number'; });

    var fills = {
      id: asylum ? (SRD.get('id') || '—') : SRD.maskId(SRD.get('id')),
      phone: SRD.maskPhone(SRD.get('phone')),
      name: ((SRD.get('first') + ' ' + SRD.get('last')).trim()) || '—',
      pay: SRD.get('pay') || '—',
      address: SRD.get('address') || '—',
      ref: SRD.get('ref')
    };
    document.querySelectorAll('[data-fill]').forEach(function (el) {
      var v = fills[el.getAttribute('data-fill')];
      if (v !== undefined) el.textContent = v;
    });

    // Yes / No toggle groups
    document.querySelectorAll('.yn').forEach(function (group) {
      var btns = group.querySelectorAll('button');
      btns.forEach(function (b) {
        b.addEventListener('click', function () {
          btns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
          group.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
    });
  });

  window.SRD = SRD;
})();

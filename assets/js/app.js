/* Shared helpers: config, safe storage, student profile, progress, header chip.
   Nothing here is sent anywhere. Practice data stays in the student's browser. */
(function () {
  'use strict';

  var CONFIG = window.EDL_CONFIG || {};

  var store = {
    get: function (k, fallback) {
      try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; }
      catch (e) { return fallback; }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
    }
  };

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') n.className = v;
        else if (k === 'text') n.textContent = v;
        else if (k === 'html') n.innerHTML = v; // only used with trusted, escaped markup
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v);
        else n.setAttribute(k, v === true ? '' : v);
      });
    }
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // **bold** only, after escaping
  function rich(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }

  /* ---------- profile (name, ID, section) ---------- */
  var PKEY = 'edl.profile';
  function getProfile() { return store.get(PKEY, null); }

  function profileDialog(onSaved) {
    var p = getProfile() || {};
    var sections = CONFIG.sections || ['01', '02'];
    var err = el('p', { class: 'err', role: 'alert' });
    var name = el('input', { id: 'pf-name', autocomplete: 'name', value: p.name || '', required: true });
    var sid = el('input', { id: 'pf-id', inputmode: 'numeric', autocomplete: 'off', value: p.id || '', required: true });
    var sec = el('select', { id: 'pf-sec' }, sections.map(function (s) {
      return el('option', { value: s, selected: p.section === s }, [s]);
    }));
    var d = el('dialog', { 'aria-labelledby': 'pf-title' }, [
      el('form', { class: 'dlg', method: 'dialog' }, [
        el('h2', { id: 'pf-title' }, ['About you ', el('span', { class: 'th', text: '· ข้อมูลผู้เรียน' })]),
        el('p', { class: 'small muted', text: 'Saved on this device only. Not sent to anyone. · บันทึกไว้ในเครื่องนี้เท่านั้น ไม่ส่งไปที่ใด' }),
        el('div', { class: 'field' }, [el('label', { for: 'pf-name', text: 'Name · ชื่อ-นามสกุล' }), name]),
        el('div', { class: 'field' }, [el('label', { for: 'pf-id', text: 'Student ID · รหัสนักศึกษา' }), sid,
          el('span', { class: 'hint', text: 'Numbers only · ตัวเลขเท่านั้น' })]),
        el('div', { class: 'field' }, [el('label', { for: 'pf-sec', text: 'Section · กลุ่มเรียน' }), sec]),
        err,
        el('div', { class: 'row' }, [
          el('button', { type: 'submit', class: 'btn primary', value: 'save' }, ['Save · บันทึก']),
          el('button', { type: 'button', class: 'btn ghost', onclick: function () { d.close(); d.remove(); } }, ['Cancel'])
        ])
      ])
    ]);
    d.querySelector('form').addEventListener('submit', function (e) {
      var pattern = new RegExp(CONFIG.studentIdPattern || '^\\d{10,13}$');
      if (!name.value.trim()) { e.preventDefault(); err.textContent = 'Please type your name. · กรุณากรอกชื่อ'; return; }
      if (!pattern.test(sid.value.trim())) { e.preventDefault(); err.textContent = 'Please check your student ID. · กรุณาตรวจรหัสนักศึกษา'; return; }
      store.set(PKEY, { name: name.value.trim(), id: sid.value.trim(), section: sec.value });
      setTimeout(function () { d.remove(); renderUserChip(); if (onSaved) onSaved(); }, 0);
    });
    document.body.appendChild(d);
    d.showModal();
    name.focus();
  }

  function renderUserChip() {
    var slot = document.getElementById('user-slot');
    if (!slot) return;
    var p = getProfile();
    slot.innerHTML = '';
    var icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>';
    var b = el('button', { type: 'button', class: 'chip-user', onclick: function () { profileDialog(); } });
    b.innerHTML = icon + '<span>' + (p ? esc(p.name.split(' ')[0]) + ' · ' + esc(p.section) : 'Sign in · ใส่ชื่อ') + '</span>';
    slot.appendChild(b);
  }

  /* ---------- progress (per week, per part) ---------- */
  var GKEY = 'edl.progress';
  function getProgress() { return store.get(GKEY, {}); }
  function markDone(week, part) {
    var g = getProgress(); g[week] = g[week] || {}; g[week][part] = true; store.set(GKEY, g);
  }

  function fetchJSON(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(url + ' ' + r.status);
      return r.json();
    });
  }

  window.EDL = { CONFIG: CONFIG, store: store, el: el, esc: esc, rich: rich, getProfile: getProfile,
    profileDialog: profileDialog, renderUserChip: renderUserChip, getProgress: getProgress,
    markDone: markDone, fetchJSON: fetchJSON };

  document.addEventListener('DOMContentLoaded', renderUserChip);
})();

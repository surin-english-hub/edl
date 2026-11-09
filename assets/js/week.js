/* Week page: reads data/weekNN.json and builds the tabs.
   Adding a week = adding one JSON file. No code changes. */
(function () {
  'use strict';
  var E = window.EDL, el = E.el, rich = E.rich;

  var params = new URLSearchParams(location.search);
  var wk = (params.get('w') || '01').replace(/\D/g, '').padStart(2, '0');
  var WEEK_KEY = 'w' + wk;
  var data = null;

  var TAB_DEFS = [
    { id: 'start', label: 'Start', th: 'เริ่มต้น' },
    { id: 'words', label: 'Words', th: 'คำศัพท์' },
    { id: 'listen', label: 'Listen', th: 'ฟัง' },
    { id: 'practice', label: 'Practice', th: 'แบบฝึก' },
    { id: 'speak', label: 'Speak', th: 'พูด' },
    { id: 'quiz', label: 'Quiz', th: 'แบบทดสอบ' }
  ];

  function icon(name) {
    var p = {
      play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none"/>',
      pause: '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" stroke="none"/>',
      sound: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/>',
      lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
      redo: '<path d="M4 12a8 8 0 1 0 2.3-5.6L4 8.7"/><path d="M4 4v4.7h4.7"/>'
    }[name];
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }
  function h2(en, th) { return el('h2', null, [en + ' ', th ? el('span', { class: 'th', text: '· ' + th }) : null]); }
  function card(children, cls) { return el('section', { class: 'card ' + (cls || '') }, children); }
  function fbBox(ok, text) { return el('p', { class: 'fb ' + (ok ? 'ok' : 'no'), role: 'status', text: (ok ? '✓ ถูกต้อง  ' : '✗ ยังไม่ถูก  ') + (text || '') }); }

  /* ---------------- audio player ---------------- */
  function player(audio) {
    // audio: { slow: 'audio/x_slow.mp3', normal: 'audio/x_normal.mp3' }
    var speeds = [];
    if (audio && audio.slow) speeds.push({ id: 'slow', label: 'Slow 0.85×', src: audio.slow });
    if (audio && audio.normal) speeds.push({ id: 'normal', label: 'Normal 1.0×', src: audio.normal });
    if (!speeds.length) return el('p', { class: 'missing', text: 'Audio coming soon. · ไฟล์เสียงจะเพิ่มเร็ว ๆ นี้' });

    var a = new Audio(); a.preload = 'metadata';
    var cur = speeds[0];
    var btn = el('button', { type: 'button', class: 'play', 'aria-label': 'Play' });
    btn.innerHTML = icon('play');
    var range = el('input', { type: 'range', min: '0', max: '100', value: '0', step: '0.1', 'aria-label': 'Position' });
    var t1 = el('span', { text: '0:00' }), t2 = el('span', { text: '–:––' });
    var missing = el('p', { class: 'missing', hidden: true, text: 'This audio file is not uploaded yet. · ยังไม่ได้อัปโหลดไฟล์เสียงนี้' });
    function fmt(s) { if (!isFinite(s)) return '–:––'; s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
    function load(sp) { cur = sp; a.src = sp.src; range.value = 0; t1.textContent = '0:00'; t2.textContent = '–:––'; setIcon(false); missing.hidden = true; }
    function setIcon(playing) { btn.innerHTML = icon(playing ? 'pause' : 'play'); btn.setAttribute('aria-label', playing ? 'Pause' : 'Play'); }
    a.addEventListener('loadedmetadata', function () { t2.textContent = fmt(a.duration); });
    a.addEventListener('timeupdate', function () { if (a.duration) { range.value = a.currentTime / a.duration * 100; t1.textContent = fmt(a.currentTime); } });
    a.addEventListener('ended', function () { setIcon(false); E.markDone(WEEK_KEY, 'listen'); refreshChecklist(); });
    a.addEventListener('error', function () { missing.hidden = false; setIcon(false); });
    btn.addEventListener('click', function () {
      if (a.paused) { a.play().then(function () { setIcon(true); }).catch(function () { missing.hidden = false; }); }
      else { a.pause(); setIcon(false); }
    });
    range.addEventListener('input', function () { if (a.duration) a.currentTime = range.value / 100 * a.duration; });
    var seg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Speed · ความเร็ว' });
    speeds.forEach(function (sp) {
      var b = el('button', { type: 'button', 'aria-pressed': sp === cur ? 'true' : 'false', text: sp.label,
        onclick: function () { a.pause(); load(sp); Array.prototype.forEach.call(seg.children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); } });
      seg.appendChild(b);
    });
    load(cur);
    stopOthers(a);
    return el('div', { class: 'stack', style: 'gap:10px' }, [
      seg,
      el('div', { class: 'player' }, [btn, el('div', { class: 'track' }, [range, el('div', { class: 'times' }, [t1, t2])])]),
      missing
    ]);
  }
  var allAudio = [];
  function stopOthers(a) { allAudio.push(a); a.addEventListener('play', function () { allAudio.forEach(function (x) { if (x !== a) x.pause(); }); }); }

  function speak(text) {
    // Browser voice for single words (free, nothing downloaded). Recorded audio is used when the JSON gives a file.
    try {
      if (!('speechSynthesis' in window)) return;
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.85;
      speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  }

  /* ---------------- exercises ---------------- */
  function exercise(ex) {
    var items = el('div');
    var answered = 0, correct = 0, total = ex.items.length;
    var score = el('p', { class: 'score', 'aria-live': 'polite' });
    function tally(ok) { answered++; if (ok) correct++; score.textContent = 'Score · คะแนน: ' + correct + ' / ' + total;
      if (answered === total) { E.markDone(WEEK_KEY, ex.part || 'practice'); refreshChecklist(); } }

    ex.items.forEach(function (it, i) {
      var box = el('div', { class: 'item' });
      var num = total > 1 ? (i + 1) + '. ' : '';
      var t = it.type || ex.type;

      if (t === 'mc' || t === 'tf') {
        var opts = t === 'tf' ? ['True', 'False'] : it.options;
        var ans = t === 'tf' ? (it.answer ? 0 : 1) : it.answer;
        box.appendChild(el('p', { class: 'q', html: num + rich(it.q) }));
        if (it.qTh) box.appendChild(el('p', { class: 'small muted', text: it.qTh }));
        var wrap = el('div', { class: 'opts' + (t === 'tf' || it.inline ? ' inline' : '') });
        var done = false;
        opts.forEach(function (o, k) {
          var b = el('button', { type: 'button', class: 'opt', html: rich(o) });
          b.addEventListener('click', function () {
            Array.prototype.forEach.call(wrap.children, function (x) { x.classList.remove('right', 'wrong'); });
            var ok = k === ans;
            b.classList.add(ok ? 'right' : 'wrong');
            var old = box.querySelector('.fb'); if (old) old.remove();
            box.appendChild(fbBox(ok, ok ? (it.fbOk || it.why || '') : (it.fbNo || it.why || '')));
            if (!done) { done = true; tally(ok); }
          });
          wrap.appendChild(b);
        });
        box.appendChild(wrap);
      }

      else if (t === 'gap') {
        // sentence with ___ ; choose from a word bank
        var parts = it.q.split('___');
        var blank = el('span', { class: 'blank', text: ' ' });
        box.appendChild(el('p', { class: 'q' }, [num + parts[0], blank, parts[1] || '']));
        var bank = el('div', { class: 'opts inline' });
        var gdone = false;
        (it.bank || ex.bank).forEach(function (w) {
          var b = el('button', { type: 'button', class: 'chip', text: w });
          b.addEventListener('click', function () {
            Array.prototype.forEach.call(bank.children, function (x) { x.classList.remove('right', 'wrong'); });
            var ok = w.toLowerCase() === String(it.answer).toLowerCase();
            b.classList.add(ok ? 'right' : 'wrong');
            blank.textContent = w;
            var old = box.querySelector('.fb'); if (old) old.remove();
            box.appendChild(fbBox(ok, ok ? it.fbOk || '' : it.fbNo || ('Answer: ' + it.answer)));
            if (!gdone) { gdone = true; tally(ok); }
          });
          bank.appendChild(b);
        });
        box.appendChild(bank);
      }

      else if (t === 'order') {
        // tap words to build the sentence
        var target = it.answer.split(' ');
        var pool = it.words ? it.words.slice() : shuffle(target.slice());
        var build = el('div', { class: 'build', 'data-hint': 'Tap the words in order · แตะคำเรียงตามลำดับ' });
        var poolBox = el('div', { class: 'opts inline' });
        var odone = false;
        if (it.qTh) box.appendChild(el('p', { class: 'q', text: num + it.qTh }));
        function check() {
          var got = Array.prototype.map.call(build.children, function (x) { return x.textContent; }).join(' ');
          if (build.children.length !== target.length) return;
          var ok = norm(got) === norm(it.answer);
          var old = box.querySelector('.fb'); if (old) old.remove();
          box.appendChild(fbBox(ok, ok ? (it.fbOk || it.answer) : (it.fbNo || 'Answer: ' + it.answer)));
          if (!odone) { odone = true; tally(ok); }
        }
        pool.forEach(function (w) {
          var b = el('button', { type: 'button', class: 'chip', text: w });
          b.addEventListener('click', function () {
            if (b.classList.contains('used')) return;
            b.classList.add('used'); b.disabled = true;
            var c = el('button', { type: 'button', class: 'chip', text: w, 'aria-label': 'Remove ' + w });
            c.addEventListener('click', function () { c.remove(); b.classList.remove('used'); b.disabled = false; var f = box.querySelector('.fb'); if (f) f.remove(); });
            build.appendChild(c); check();
          });
          poolBox.appendChild(b);
        });
        box.appendChild(build); box.appendChild(poolBox);
      }
      items.appendChild(box);
    });

    var redo = el('button', { type: 'button', class: 'btn small ghost', onclick: function () {
      var fresh = exercise(ex); node.replaceWith(fresh); } });
    redo.innerHTML = icon('redo') + '<span>Try again · ทำใหม่</span>';
    var node = card([
      el('div', { class: 'ex-head' }, [h2(ex.title, ex.titleTh), ex.instructions ? el('p', { class: 'small muted', text: ex.instructions }) : null]),
      ex.reading ? el('div', { class: 'reading', html: rich(ex.reading).replace(/\n/g, '<br>') }) : null,
      ex.image ? figure(ex.image) : null,
      items,
      el('div', { class: 'row between' }, [score, redo])
    ], 'ex');
    return node;
  }
  function norm(s) { return s.toLowerCase().replace(/[^a-z0-9' ]/g, '').replace(/\s+/g, ' ').trim(); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  function figure(img) {
    var inner = img.src
      ? el('img', { src: img.src, alt: img.alt || '', loading: 'lazy', onerror: function (e) { e.target.replaceWith(el('div', { class: 'ph-img', text: img.alt || 'Image' })); } })
      : el('div', { class: 'ph-img', text: img.alt || 'Image' });
    return el('figure', { class: 'figure', style: 'margin:0' }, [inner, img.caption ? el('figcaption', { text: img.caption }) : null]);
  }

  /* ---------------- voice recorder (stays in the browser) ---------------- */
  function recorder() {
    var note = el('p', { class: 'small muted', text: 'Your voice stays on this device. It is not uploaded. · เสียงของคุณอยู่ในเครื่องนี้เท่านั้น ไม่ถูกอัปโหลด' });
    if (!(navigator.mediaDevices && window.MediaRecorder)) {
      return el('div', { class: 'stack', style: 'gap:6px' }, [el('p', { class: 'missing', text: 'Recording is not supported in this browser. Try Chrome or Safari. · เบราว์เซอร์นี้อัดเสียงไม่ได้ ลองใช้ Chrome หรือ Safari' })]);
    }
    var rec = null, chunks = [], url = null, stream = null;
    var mine = new Audio(); stopOthers(mine);
    var go = el('button', { type: 'button', class: 'btn rec', text: '● Record · อัดเสียง' });
    var play = el('button', { type: 'button', class: 'btn', text: '▶ Play my voice · ฟังเสียงตัวเอง', disabled: true });
    var err = el('p', { class: 'err', role: 'alert' });
    go.addEventListener('click', function () {
      if (rec && rec.state === 'recording') { rec.stop(); return; }
      err.textContent = '';
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) {
        stream = s; chunks = [];
        rec = new MediaRecorder(s);
        rec.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
        rec.onstop = function () {
          stream.getTracks().forEach(function (t) { t.stop(); });
          if (url) URL.revokeObjectURL(url);
          url = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
          mine.src = url; play.disabled = false;
          go.classList.remove('on'); go.textContent = '● Record again · อัดใหม่';
          E.markDone(WEEK_KEY, 'speak'); refreshChecklist();
        };
        rec.start(); go.classList.add('on'); go.textContent = '■ Stop · หยุด';
      }).catch(function () { err.textContent = 'Please allow the microphone. · กรุณาอนุญาตให้ใช้ไมโครโฟน'; });
    });
    play.addEventListener('click', function () { mine.currentTime = 0; mine.play(); });
    return el('div', { class: 'stack', style: 'gap:8px' }, [el('div', { class: 'row' }, [go, play]), err, note]);
  }

  /* ---------------- tabs ---------------- */
  var panels = {
    start: function () {
      var s = data.start || {};
      var out = [];
      if (s.images && s.images.length) out.push(card([h2(s.title || 'Warm-up', s.titleTh || 'อุ่นเครื่อง'), el('div', { class: 'imgs' }, s.images.map(figure)),
        s.questions ? el('ol', { style: 'margin:0;padding-left:22px;display:flex;flex-direction:column;gap:6px' }, s.questions.map(function (q) {
          return el('li', null, [q.en, q.th ? el('div', { class: 'small muted', text: q.th }) : null]); })) : null]));
      (s.blocks || []).forEach(function (b) {
        out.push(card([h2(b.title, b.titleTh), b.text ? el('p', { html: rich(b.text) }) : null, b.textTh ? el('p', { class: 'muted', text: b.textTh }) : null,
          b.list ? el('ul', { style: 'margin:0;padding-left:22px;display:flex;flex-direction:column;gap:6px' }, b.list.map(function (li) {
            return el('li', null, [el('span', { html: rich(li.en) }), li.th ? el('div', { class: 'small muted', text: li.th }) : null]); })) : null,
          b.image ? figure(b.image) : null,
          b.link ? el('a', { class: 'btn primary', href: b.link.href, style: 'align-self:flex-start' }, [b.link.label]) : null], 'stack'));
      });
      if (!out.length) out.push(card([el('p', { class: 'muted', text: 'Nothing here this week. · สัปดาห์นี้ไม่มีส่วนนี้' })]));
      return out;
    },

    words: function () {
      var list = data.words || [];
      if (!list.length) return [card([el('p', { class: 'muted', text: 'No word list this week. · สัปดาห์นี้ไม่มีคำศัพท์' })])];
      var i = 0, flipped = false, seen = {};
      var pos = el('span', { class: 'small muted' });
      var w = el('span', { class: 'w' }), m = el('span', { class: 'm' }), ex = el('span', { class: 'ex' });
      var hint = el('span', { class: 'small muted', text: 'Tap to see the meaning · แตะเพื่อดูความหมาย' });
      var face = el('button', { type: 'button', class: 'flash', 'aria-live': 'polite' }, [w, m, ex, hint]);
      function show() {
        var c = list[i]; seen[i] = true;
        pos.textContent = (i + 1) + ' / ' + list.length;
        w.textContent = c.word; m.textContent = flipped ? c.th : ''; ex.textContent = flipped ? (c.example || '') : '';
        m.hidden = ex.hidden = !flipped; hint.hidden = flipped;
        if (Object.keys(seen).length === list.length) { E.markDone(WEEK_KEY, 'words'); refreshChecklist(); }
      }
      face.addEventListener('click', function () { flipped = !flipped; show(); });
      var listen = el('button', { type: 'button', class: 'btn', onclick: function () {
        var c = list[i]; if (c.audio) { var a = new Audio(c.audio); a.play().catch(function () { speak(c.word); }); } else speak(c.word); } });
      listen.innerHTML = icon('sound') + '<span>Listen</span>';
      var table = el('details', null, [el('summary', { class: 'small', style: 'cursor:pointer;min-height:44px;display:flex;align-items:center', text: 'See all words · ดูคำศัพท์ทั้งหมด' }),
        el('div', { style: 'overflow-x:auto' }, [el('table', { style: 'width:100%;border-collapse:collapse;font-size:15px' }, [
          el('thead', null, [el('tr', null, ['Word', 'Thai', 'Example'].map(function (hd) { return el('th', { style: 'text-align:left;padding:8px;border-bottom:1px solid var(--line)', text: hd }); }))]),
          el('tbody', null, list.map(function (c) { return el('tr', null, [c.word, c.th, c.example || ''].map(function (v, k) {
            return el('td', { style: 'padding:8px;border-bottom:1px solid #EEF2EF;' + (k === 0 ? 'font-weight:600;color:var(--accent-dark)' : ''), text: v }); })); }))
        ])])]);
      show();
      return [card([el('div', { class: 'row between' }, [h2('Words', 'คำศัพท์'), pos]), face,
        el('div', { class: 'row between' }, [
          el('button', { type: 'button', class: 'btn', onclick: function () { i = (i + list.length - 1) % list.length; flipped = false; show(); } }, ['← Back']),
          listen,
          el('button', { type: 'button', class: 'btn primary', onclick: function () { i = (i + 1) % list.length; flipped = false; show(); } }, ['Next →'])
        ]), table], 'stack')];
    },

    listen: function () {
      var L = data.listen;
      if (!L) return [card([el('p', { class: 'muted', text: 'No listening this week. · สัปดาห์นี้ไม่มีการฟัง' })])];
      var scriptBox = el('div', { class: 'script', hidden: true }, (L.script || []).map(function (ln) {
        if (ln.pause) return el('p', { class: 'pause', text: '(pause)' });
        return el('p', null, [el('span', { class: 'who', text: ln.who + ': ' }), ln.en, ln.th ? el('span', { class: 'small muted', style: 'display:block', text: ln.th }) : null]);
      }));
      var toggle = el('button', { type: 'button', class: 'btn', 'aria-expanded': 'false', text: 'Show script · ดูบทพูด' });
      toggle.addEventListener('click', function () {
        var open = scriptBox.hidden; scriptBox.hidden = !open;
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.textContent = open ? 'Hide script · ซ่อนบทพูด' : 'Show script · ดูบทพูด';
      });
      var out = [card([
        el('div', { class: 'ex-head' }, [h2(L.title, L.titleTh), L.setting ? el('p', { class: 'small muted', text: L.setting }) : null]),
        L.image ? figure(L.image) : null,
        el('p', { class: 'small muted', text: 'Listen at slow speed first, then normal speed. · ฟังแบบช้าก่อน แล้วฟังความเร็วปกติ' }),
        player(L.audio),
        el('div', null, [toggle]), scriptBox
      ], 'stack')];
      (L.exercises || []).forEach(function (ex) { ex.part = ex.part || 'listen'; out.push(exercise(ex)); });
      return out;
    },

    practice: function () {
      var list = data.practice || [];
      if (!list.length) return [card([el('p', { class: 'muted', text: 'No practice this week. · สัปดาห์นี้ไม่มีแบบฝึก' })])];
      return list.map(function (ex) { ex.part = 'practice'; return exercise(ex); });
    },

    speak: function () {
      var S = data.speak || {};
      var out = [];
      if (S.shadowing && S.shadowing.length) {
        out.push(card([
          el('div', { class: 'ex-head' }, [h2('Shadowing', 'พูดตาม'),
            el('p', { class: 'small muted', text: 'Listen, then say it with the same stress. Bold = stress. / = short pause. · ฟังแล้วพูดตาม คำตัวหนาคือคำที่ลงเสียงหนัก' })]),
          S.audio ? player(S.audio) : null,
          el('div', { class: 'stack', style: 'gap:10px' }, S.shadowing.map(function (l) { return el('div', { class: 'shadow-line', html: rich(l) }); })),
          recorder()
        ], 'stack'));
      }
      if (S.roleplay && S.roleplay.length) {
        out.push(card([h2('Role-play', 'บทบาทสมมติ'), el('p', { class: 'small muted', text: 'Choose your level. Practise with a friend. · เลือกระดับ แล้วฝึกกับเพื่อน' })]
          .concat(S.roleplay.map(function (r) { return el('div', { class: 'notice' }, [el('b', { text: r.level }), el('span', { text: r.en }), r.th ? el('span', { class: 'muted', text: r.th }) : null]); })), 'stack'));
      }
      if (S.aiPrompt) {
        var pre = el('pre', { style: 'white-space:pre-wrap;margin:0;font:inherit;font-size:14px;background:var(--bg);border-radius:10px;padding:14px', text: S.aiPrompt });
        var copy = el('button', { type: 'button', class: 'btn small', text: 'Copy prompt · คัดลอก' });
        copy.addEventListener('click', function () {
          (navigator.clipboard ? navigator.clipboard.writeText(S.aiPrompt) : Promise.reject()).then(function () { copy.textContent = 'Copied ✓'; })
            .catch(function () { copy.textContent = 'Select and copy the text'; });
        });
        out.push(card([h2('Practise with AI', 'ฝึกพูดกับ AI'), el('p', { class: 'small muted', text: 'Paste this into an AI chatbot. Do not share personal information. · วางข้อความนี้ในแชทบอท AI ห้ามให้ข้อมูลส่วนตัว' }), pre, el('div', null, [copy])], 'stack'));
      }
      if (!out.length) out.push(card([el('p', { class: 'muted', text: 'No speaking practice this week. · สัปดาห์นี้ไม่มีการฝึกพูด' })]));
      return out;
    },

    quiz: function () {
      var Q = data.quiz || {};
      var open = Q.enabled && E.CONFIG.quizEndpoint;
      var head = el('div', { class: 'row' });
      head.innerHTML = '<span style="color:#7A4F06">' + icon('lock') + '</span>';
      head.appendChild(h2(open ? 'Listening quiz' : 'Quiz is closed', open ? 'แบบทดสอบการฟัง' : 'ยังไม่เปิดให้ทำ'));
      return [card([
        head,
        el('p', { text: Q.note || 'The weekly quiz is done in class on Google Forms. Your teacher will give you the link.' }),
        el('p', { class: 'muted', text: Q.noteTh || 'แบบทดสอบประจำสัปดาห์ทำในชั้นเรียนผ่าน Google Forms อาจารย์จะแจ้งลิงก์ในห้อง' }),
        el('div', { class: 'notice' }, [
          el('b', { style: 'color:var(--accent-dark)', text: 'Privacy · ความเป็นส่วนตัว' }),
          el('span', { text: 'Practice on this site is saved on your device only. Scored quizzes save your name, student ID, section, answers, score and time. Only your teacher can see them.' }),
          el('span', { class: 'muted', text: 'การฝึกบนเว็บนี้บันทึกในเครื่องของคุณเท่านั้น แบบทดสอบที่เก็บคะแนนจะบันทึกชื่อ รหัสนักศึกษา กลุ่มเรียน คำตอบ คะแนน และเวลา เฉพาะอาจารย์ผู้สอนเท่านั้นที่เห็น' }),
          el('a', { href: 'privacy.html', text: 'Read the privacy notice · อ่านประกาศความเป็นส่วนตัว' })
        ])
      ], 'stack')];
    }
  };

  /* ---------------- page frame ---------------- */
  var checklistBox;
  function refreshChecklist() {
    if (!checklistBox) return;
    var g = (E.getProgress()[WEEK_KEY]) || {};
    checklistBox.innerHTML = '';
    var parts = activeTabs().filter(function (t) { return t.id !== 'quiz' && t.id !== 'start'; });
    checklistBox.hidden = !parts.length;
    checklistBox.appendChild(h2('This week', 'ความคืบหน้า'));
    parts.forEach(function (t) {
      checklistBox.appendChild(el('div', { class: 'check' }, [el('span', { class: 'dot' + (g[t.id] ? ' on' : ''), 'aria-hidden': 'true' }),
        el('span', { text: t.label }), el('span', { class: 'state', text: g[t.id] ? 'Done' : 'Not yet' })]));
    });
  }
  function activeTabs() {
    return TAB_DEFS.filter(function (t) {
      if (t.id === 'quiz') return data.quiz !== false;
      if (t.id === 'start') return !!data.start;
      if (t.id === 'words') return data.words && data.words.length;
      if (t.id === 'listen') return !!data.listen;
      if (t.id === 'practice') return data.practice && data.practice.length;
      if (t.id === 'speak') return !!data.speak;
      return true;
    });
  }

  function render() {
    document.title = 'Week ' + Number(wk) + ' · ' + data.title + ' · EDL';
    var root = document.getElementById('week-root');
    root.innerHTML = '';
    var tabs = activeTabs();
    var tablist = el('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Week sections' });
    var content = el('div', { class: 'content', id: 'panel', role: 'tabpanel', tabindex: '-1' });

    function select(id, focus) {
      if (!tabs.some(function (t) { return t.id === id; })) id = tabs[0].id;
      Array.prototype.forEach.call(tablist.children, function (b) { b.setAttribute('aria-selected', b.dataset.id === id ? 'true' : 'false'); b.tabIndex = b.dataset.id === id ? 0 : -1; });
      content.innerHTML = '';
      allAudio.forEach(function (a) { a.pause(); }); allAudio = [];
      panels[id]().forEach(function (n) { content.appendChild(n); });
      if (history.replaceState) history.replaceState(null, '', '?w=' + wk + '#' + id);
      if (focus) content.focus({ preventScroll: true });
    }
    tabs.forEach(function (t, k) {
      var b = el('button', { type: 'button', class: 'tab', role: 'tab', 'data-id': t.id, 'aria-controls': 'panel' }, [t.label + ' ', el('span', { class: 'th', text: t.th })]);
      b.addEventListener('click', function () { select(t.id); });
      b.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        var n = tabs[(k + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        select(n.id); tablist.querySelector('[data-id="' + n.id + '"]').focus();
      });
      tablist.appendChild(b);
    });

    checklistBox = el('div', { class: 'card stack', style: 'gap:10px' });
    var aside = el('aside', null, [
      data.cando && data.cando.length ? el('div', { class: 'card stack cando', style: 'gap:8px' }, [h2('I can…', 'ฉันสามารถ…')].concat(
        data.cando.map(function (c) { return el('p', null, [c.en, c.th ? el('span', { class: 'small muted', style: 'display:block', text: c.th }) : null]); }))) : null,
      checklistBox
    ]);

    root.appendChild(el('nav', { class: 'crumb', 'aria-label': 'Breadcrumb' }, [el('a', { href: './', text: 'EDL Home' }), ' / Week ' + Number(wk)]));
    root.appendChild(el('div', { class: 'stack', style: 'gap:4px' }, [
      el('p', { class: 'eyebrow', text: 'Week ' + Number(wk) + (data.phase ? ' · ' + data.phase : '') }),
      el('h1', { text: data.title }),
      data.titleTh ? el('p', { class: 'lead muted', text: data.titleTh }) : null
    ]));
    root.appendChild(tablist);
    root.appendChild(el('div', { class: 'layout' }, [content, aside]));
    refreshChecklist();
    select((location.hash || '').slice(1) || tabs[0].id);
  }

  function fail(msg) {
    var root = document.getElementById('week-root');
    root.innerHTML = '';
    root.appendChild(el('div', { class: 'card stack' }, [el('h1', { text: 'This week is not open yet.' }),
      el('p', { class: 'muted', text: 'บทเรียนสัปดาห์นี้ยังไม่เปิด' }), el('a', { class: 'btn', href: './', style: 'align-self:flex-start', text: '← Back to all weeks' })]));
    if (msg) console.warn(msg);
  }

  document.addEventListener('DOMContentLoaded', function () {
    E.fetchJSON('data/week' + wk + '.json').then(function (d) {
      if (d.status && d.status !== 'open' && d.status !== 'done') return fail('status ' + d.status);
      data = d; render();
    }).catch(function (e) { fail(e.message); });
  });
})();

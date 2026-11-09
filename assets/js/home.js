/* Course home: week cards from data/weeks.json, plus "continue" card. */
(function () {
  'use strict';
  var E = window.EDL, el = E.el;
  var LABEL = { open: 'Open', done: 'Done', soon: 'Coming soon', test: 'Test', exam: 'Exam' };

  function weekCard(w) {
    var num = String(w.week).padStart(2, '0');
    var openable = w.status === 'open' || w.status === 'done';
    var cls = 'wk' + (openable ? '' : (w.status === 'test' || w.status === 'exam') ? ' test' : ' locked');
    var kids = [
      el('div', { class: 'wk-top' }, [el('span', { class: 'wk-num', text: 'WEEK ' + w.week }),
        el('span', { class: 'badge ' + (w.status === 'exam' ? 'test' : w.status), text: LABEL[w.status] || w.status })]),
      el('span', { class: 'wk-title', text: w.title }),
      w.titleTh ? el('span', { class: 'wk-th', text: w.titleTh }) : null
    ];
    return openable ? el('a', { class: cls, href: 'week.html?w=' + num }, kids) : el('div', { class: cls, 'aria-disabled': 'true' }, kids);
  }

  function continueCard(weeks) {
    var open = weeks.filter(function (w) { return w.status === 'open'; });
    var target = open[open.length - 1] || weeks.filter(function (w) { return w.status === 'done'; }).slice(-1)[0];
    var box = document.getElementById('continue');
    if (!box || !target) { if (box) box.hidden = true; return; }
    var num = String(target.week).padStart(2, '0');
    var g = E.getProgress()['w' + num] || {};
    var parts = target.parts || ['words', 'listen', 'practice', 'speak'];
    var done = parts.filter(function (p) { return g[p]; }).length;
    var pct = parts.length ? Math.round(done / parts.length * 100) : 0;
    box.innerHTML = '';
    box.appendChild(el('div', { class: 'stack', style: 'gap:6px' }, [
      el('p', { class: 'eyebrow', text: 'Continue · เรียนต่อ' }),
      el('p', { class: 'title', text: 'Week ' + target.week + ' · ' + target.title }),
      el('p', { class: 'small', style: 'color:#DDF0E4', text: done + ' of ' + parts.length + ' parts done · ทำแล้ว ' + done + ' จาก ' + parts.length + ' ส่วน' })
    ]));
    var bar = el('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct), 'aria-label': 'Progress' });
    bar.appendChild(el('i', { style: 'width:' + pct + '%' }));
    box.appendChild(bar);
    box.appendChild(el('a', { class: 'btn', href: 'week.html?w=' + num, text: 'Open Week ' + target.week + ' →' }));
  }

  document.addEventListener('DOMContentLoaded', function () {
    var root = document.getElementById('weeks-root');
    E.fetchJSON('data/weeks.json').then(function (d) {
      root.innerHTML = '';
      d.phases.forEach(function (ph) {
        root.appendChild(el('div', { class: 'phase' }, [
          el('p', { class: 'phase-label', text: ph.label }),
          el('div', { class: 'grid-weeks' }, ph.weeks.map(weekCard))
        ]));
      });
      continueCard([].concat.apply([], d.phases.map(function (p) { return p.weeks; })));
    }).catch(function () {
      root.innerHTML = '';
      root.appendChild(el('p', { class: 'missing', text: 'Could not load the weeks. Please refresh. · โหลดรายการบทเรียนไม่สำเร็จ กรุณารีเฟรช' }));
    });
  });
})();

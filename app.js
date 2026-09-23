/* =============================================================
   Модальные конструкции в турецком — интерактив
   Без зависимостей. Формы глаголов — в forms.js (tools/forms.py).
   ============================================================= */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- озвучка: сначала mp3, потом синтез браузера ---------------- */
const A = { a: null, el: null };
function stopAudio() {
  if (A.a) { A.a.pause(); A.a = null; }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  if (A.el) A.el.classList.remove('playing');
  A.el = null;
}
function tts(text, el) {
  if (!('speechSynthesis' in window) || !text) { el && el.classList.remove('playing'); return; }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'tr-TR'; u.rate = .92;
  const v = speechSynthesis.getVoices().find(v => /^tr/i.test(v.lang));
  if (v) u.voice = v;
  u.onend = () => el && el.classList.remove('playing');
  speechSynthesis.speak(u);
}
function play(slug, text, el) {
  stopAudio();
  if (el) { el.classList.add('playing'); A.el = el; }
  if (!slug) { tts(text, el); return; }
  const a = new Audio('audio/tr/' + slug + '.mp3');
  A.a = a;
  let fell = false;
  const fb = () => { if (fell || A.a !== a) return; fell = true; A.a = null; tts(text, el); };
  a.onended = () => { el && el.classList.remove('playing'); };
  a.onerror = fb;
  a.play().catch(fb);
}
const textOf = el => el.dataset.t || (el.childNodes[0] && el.childNodes[0].textContent.trim()) || el.textContent.trim();
document.addEventListener('click', e => {
  const el = e.target.closest('[data-say]');
  if (!el || el.classList.contains('flip')) return;
  play(el.dataset.say, textOf(el), el);
});

/* ---------------- меню, прогресс, курсор ---------------- */
const menu = $('#menu');
$('#burger').onclick = () => { menu.classList.add('open'); menu.setAttribute('aria-hidden', 'false'); };
const closeMenu = () => { menu.classList.remove('open'); menu.setAttribute('aria-hidden', 'true'); };
$('#menuX').onclick = closeMenu;
$$('#menu a').forEach(a => a.addEventListener('click', closeMenu));

const cur = $('#cur');
if (matchMedia('(pointer:fine)').matches && !reduce) {
  let mx = -99, my = -99, cx = -99, cy = -99;
  addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
  document.addEventListener('mouseover', e => cur.classList.toggle('big', !!e.target.closest('a,button,.flip,.pcard,input')));
  (function loop() { cx += (mx - cx) * .22; cy += (my - cy) * .22; cur.style.transform = `translate(${cx}px,${cy}px)`; requestAnimationFrame(loop); })();
}

/* ---------------- появление, счётчики ---------------- */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add('in');
  io.unobserve(e.target);
}), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
$$('.rv, .mask').forEach(el => io.observe(el));

function countUp(el) {
  const end = +el.dataset.count, dur = 1600, t0 = performance.now();
  const step = t => {
    const p = clamp((t - t0) / dur, 0, 1), k = 1 - Math.pow(1 - p, 4);
    el.textContent = Math.round(end * k).toLocaleString('ru-RU');
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const cio = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); }
}), { threshold: .6 });
$$('[data-count]').forEach(el => cio.observe(el));

/* слова, которые загораются по мере прокрутки */
const wordBlocks = $$('[data-words]').map(el => {
  el.innerHTML = el.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span> `).join('');
  return { el, ws: $$('.w', el) };
});

/* ---------------- HERO: путник поднимается при прокрутке ---------------- */
const hero = $('#hero'), climber = $('#climber'), far = $('#far'), h1 = $('.hero h1');
// склон: из (-60,150) в (1500,1040)
const slopeY = x => 150 + (x + 60) * (890 / 1560);
const X0 = 790;

/* ---------------- прокрутка: всё, что зависит от позиции ---------------- */
const prog = $('#prog'), sticky = $('#sticky');
let stickyBlock = false;
function onScroll() {
  const sy = scrollY, vh = innerHeight;
  const max = document.documentElement.scrollHeight - vh;
  prog.style.transform = `scaleX(${max > 0 ? sy / max : 0})`;

  const hp = clamp(sy / hero.offsetHeight, 0, 1);
  const x = X0 - hp * 330;
  climber.setAttribute('transform', `translate(${x.toFixed(1)} ${slopeY(x).toFixed(1)}) scale(1.7)`);
  $('#dustg').setAttribute('transform', `translate(${(x - X0).toFixed(1)} ${(slopeY(x) - slopeY(X0)).toFixed(1)})`);
  far.setAttribute('transform', `translate(0 ${(hp * 60).toFixed(1)})`);
  if (!reduce) h1.style.transform = `translateY(${hp * -80}px)`;

  wordBlocks.forEach(({ el, ws }) => {
    const r = el.getBoundingClientRect();
    const p = clamp((vh * .85 - r.top) / (r.height + vh * .35), 0, 1);
    const on = Math.round(p * ws.length * 1.15);
    ws.forEach((w, i) => w.classList.toggle('on', i < on));
  });

  const start = $('#ebil').getBoundingClientRect().top < vh * .5;
  sticky.classList.toggle('show', start && !stickyBlock);
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);

const blockIO = new IntersectionObserver(es => {
  es.forEach(e => { e.target._vis = e.isIntersecting; });
  stickyBlock = ['#price', '#buy', '#ask'].some(s => $(s)._vis);
  onScroll();
}, { threshold: .15 });
['#price', '#buy', '#ask'].forEach(s => blockIO.observe($(s)));

/* ---------------- туманный лес ---------------- */
(function trees() {
  const svg = $('#trees'); if (!svg) return;
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const fir = (x, base, h, w, c) => {
    const tiers = 7, top = base - h; let r = '', l = '';
    for (let i = 1; i <= tiers; i++) {
      const y = top + (h * .9) * i / tiers, wi = w * (i / tiers) * (.85 + rnd() * .3), yi = y - h / tiers * .35;
      r += `L${(x + wi).toFixed(1)} ${y.toFixed(1)} L${(x + wi * .32).toFixed(1)} ${yi.toFixed(1)} `;
      l = `L${(x - wi * .32).toFixed(1)} ${yi.toFixed(1)} L${(x - wi).toFixed(1)} ${y.toFixed(1)} ` + l;
    }
    return `<path fill="${c}" d="M${x} ${top} ${r}L${x + 3} ${base} L${x - 3} ${base} ${l}Z"/>`;
  };
  let out = `<defs><linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8d8d5" stop-opacity="1"/><stop offset=".55" stop-color="#d8d8d5" stop-opacity=".55"/><stop offset="1" stop-color="#d8d8d5" stop-opacity="0"/></linearGradient></defs>`;
  out += `<rect width="1440" height="900" fill="#d8d8d5"/>`;
  const layers = [
    { n: 34, base: 640, h: [150, 240], w: [34, 52], c: '#b9b9b5' },
    { n: 26, base: 760, h: [260, 380], w: [50, 74], c: '#8c8c88' },
    { n: 18, base: 930, h: [420, 600], w: [70, 105], c: '#3f3f3c' },
  ];
  layers.forEach((L, li) => {
    let g = '';
    for (let i = 0; i < L.n; i++) {
      const x = (i / L.n) * 1500 - 30 + rnd() * 40;
      const h = L.h[0] + rnd() * (L.h[1] - L.h[0]), w = L.w[0] + rnd() * (L.w[1] - L.w[0]);
      g += fir(x, L.base + rnd() * 30, h, w, L.c);
    }
    out += `<g class="tl" data-d="${(li + 1) * 16}">${g}</g>`;
    if (li < 2) out += `<rect y="${360 + li * 120}" width="1440" height="340" fill="url(#fg)" opacity=".9"/>`;
  });
  out += `<rect y="700" width="1440" height="200" fill="#0c0c0c" opacity=".55"/>`;
  svg.innerHTML = out;
  const tl = $$('.tl', svg), forest = $('#forest');
  addEventListener('scroll', () => {
    const r = forest.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const p = (innerHeight - r.top) / (innerHeight + r.height);
    tl.forEach(g => g.setAttribute('transform', `translate(0 ${((.5 - p) * +g.dataset.d * 2).toFixed(1)})`));
  }, { passive: true });
})();

/* ---------------- бегущая строка ---------------- */
(function marquee() {
  const items = [['gelebilirim', 'c-gel-abil-0'], ['gelemem', 'c-gel-ama-0'], ['gitmeliyim', 'c-git-mali-0'], ['bana su lazım', 'l-bana-su-lazim'],
    ['gerek yok', 'o-gerekyok'], ['zorundayım', 'c-bekle-zorunda-0'], ['şart', 's-sart'], ['olabilir', 'e-4'], ['olmalı', 'e-1'], ['olur mu?', 'o-olurmu'], ['olmaz', 'o-olmaz']];
  const html = items.map(([t, s]) => `<span data-say="${s}" data-t="${t}">${t}</span><span>·</span>`).join('');
  $('#marq').innerHTML = html + html;
})();

/* ---------------- трио-карточки ---------------- */
$$('#trio .flip').forEach(f => f.addEventListener('click', () => {
  f.classList.toggle('on');
  play(f.dataset.say, $('.f .w', f).textContent, null);
}));

/* ---------------- lazım-конструктор ---------------- */
(function lazim() {
  const WHO = [['bana', 'Bana', 'мне'], ['sana', 'Sana', 'тебе'], ['ona', 'Ona', 'ему'], ['bize', 'Bize', 'нам'], ['size', 'Size', 'вам'], ['onlara', 'Onlara', 'им']];
  const WHAT = [['su', 'su', 'вода', 'нужна'], ['taksi', 'bir taksi', 'такси', 'нужно'], ['yardim', 'yardım', 'помощь', 'нужна'],
    ['sarj', 'şarj aleti', 'зарядка', 'нужна'], ['zaman', 'biraz zaman', 'немного времени', 'нужно'], ['kahve', 'bir kahve', 'кофе', 'нужен']];
  const HOW = [['lazim', 'lazım', 'разговорное'], ['gerek', 'gerek', 'нейтральнее']];
  const st = { who: 0, what: 3, how: 0 };
  const chips = (box, arr, key, lab) => {
    box.innerHTML = arr.map((a, i) => `<button class="chip" data-i="${i}">${lab(a)}</button>`).join('');
    box.onclick = e => { const b = e.target.closest('.chip'); if (!b) return; st[key] = +b.dataset.i; render(true); };
  };
  chips($('#lzWho'), WHO, 'who', a => `${a[1]}<small>${a[2]}</small>`);
  chips($('#lzWhat'), WHAT, 'what', a => `${a[1]}<small>${a[2]}</small>`);
  chips($('#lzHow'), HOW, 'how', a => `${a[1]}<small>${a[2]}</small>`);
  const slug = () => `l-${WHO[st.who][0]}-${WHAT[st.what][0]}-${HOW[st.how][0]}`;
  const txt = () => `${WHO[st.who][1]} ${WHAT[st.what][1]} ${HOW[st.how][1]}.`;
  function render(say) {
    [['#lzWho', 'who'], ['#lzWhat', 'what'], ['#lzHow', 'how']].forEach(([s, k]) =>
      $$('.chip', $(s)).forEach((c, i) => c.classList.toggle('on', i === st[k])));
    const w = WHO[st.who], t = WHAT[st.what], h = HOW[st.how];
    $('#lzSent').innerHTML = `<span class="k">${w[1]}</span> <span style="animation-delay:.08s">${t[1]}</span> <span class="k" style="animation-delay:.16s">${h[1]}.</span>`;
    const ru = `${w[2]} ${t[3]} ${t[2]}.`;
    $('#lzRu').textContent = ru[0].toUpperCase() + ru.slice(1);
    $('#lzWarn').textContent = '';
    $('#lzTrap').classList.remove('on');
    if (say) play(slug(), txt(), $('#lzPlay'));
  }
  $('#lzPlay').onclick = () => play(slug(), txt(), $('#lzPlay'));
  let trapT;
  $('#lzTrap').onclick = () => {
    clearTimeout(trapT);
    $('#lzTrap').classList.add('on');
    $('#lzSent').innerHTML = `<span style="text-decoration:line-through;text-decoration-color:var(--red)">Ben</span> <span>su</span> <span class="k">lazım.</span>`;
    $('#lzRu').textContent = '«Я вода нужен». Продавец смотрит на тебя, как на телефон.';
    $('#lzWarn').textContent = '✗ Нужен дательный: не «я», а «мне». Ben → Bana. Исправляю…';
    trapT = setTimeout(() => { st.who = 0; st.what = 0; render(true); }, 2600);
  };
  render(false);
})();

/* ---------------- шкала обязательности ---------------- */
(function scale() {
  const S = [
    ['Gidebilirsin.', '«Можешь пойти». Разрешение, дверь открыта.', 'Ты', 'Разрешение', 'Можешь'],
    ['Gitsen iyi olur.', '«Лучше бы тебе пойти». Мягкий совет.', 'Ты, с подсказкой', 'Совет', 'Лучше бы'],
    ['Gitmelisin.', '«Тебе стоит пойти. Ты должен». Совет врача, голос совести.', 'Совесть', 'Долг', 'Стоит'],
    ['Gitmen lazım.', '«Тебе надо идти». Дела, встреча, автобус.', 'Дела', 'Потребность', 'Надо'],
    ['Gitmek zorundasın.', '«Ты вынужден идти». Выбора нет.', 'Обстоятельства', 'Выбора нет', 'Вынужден'],
    ['Gitmen şart.', '«Идти обязательно». Обсуждение закрыто.', 'Правила', 'Стена', 'Şart'],
  ];
  const svg = $('#mountSvg');
  const P = S.map((_, i) => [70 + i * 132, 292 - i * 48 - (i % 2 ? 10 : 0)]);
  let ridge = `M0 330 L0 ${P[0][1] + 20} `;
  P.forEach(([x, y], i) => { ridge += `L${x} ${y} `; if (i < P.length - 1) { const nx = P[i + 1][0], ny = P[i + 1][1]; ridge += `L${(x + nx) / 2 - 20} ${(y + ny) / 2 + 22} L${(x + nx) / 2 + 12} ${(y + ny) / 2 - 6} `; } });
  ridge += `L800 ${P[5][1] + 30} L800 340 L0 340Z`;
  const trail = 'M' + P.map(p => p.join(' ')).join(' L');
  svg.innerHTML = `
    <defs><linearGradient id="mg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2a27"/><stop offset="1" stop-color="#0c0c0c"/></linearGradient></defs>
    <path d="M0 340 L0 200 L120 150 L210 190 L330 110 L430 160 L560 70 L660 120 L800 60 L800 340Z" fill="#161615"/>
    <path d="${ridge}" fill="url(#mg)" stroke="#3b3b38" stroke-width="1"/>
    <path id="trailBg" d="${trail}" fill="none" stroke="#3b3b38" stroke-width="2" stroke-dasharray="4 6"/>
    <path id="trail" d="${trail}" fill="none" stroke="#f6f10b" stroke-width="3" stroke-linecap="round"/>
    ${P.map(([x, y], i) => `<g class="stop" data-i="${i}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="16" fill="transparent"/><circle cx="${x}" cy="${y}" r="5" fill="#0c0c0c" stroke="#8d8d88" stroke-width="2" class="dot"/><text x="${x}" y="${y - 16}" text-anchor="middle" font-family="Oswald" font-size="13" fill="#8d8d88">0${i + 1}</text></g>`).join('')}
    <g id="climb2"><g transform="scale(.9)" fill="#f1f1ee" stroke="#f1f1ee" stroke-linecap="round">
      <path d="M-1 -30 L4 -15 L8 0" fill="none" stroke-width="5"/><path d="M-2 -30 L-9 -18 L-13 -9" fill="none" stroke-width="5"/>
      <path d="M-7 -56 L6 -55 L5 -30 L-6 -29Z"/><rect x="3" y="-56" width="11" height="20" rx="3" fill="#f6f10b" stroke="none"/><circle cx="-3" cy="-63" r="6" stroke="none"/>
      <path d="M-5 -51 L-13 -38" fill="none" stroke-width="3.5"/><path d="M-13 -38 L-17 -2" fill="none" stroke-width="1.4"/></g></g>
    <g id="flag" opacity="0"><line x1="${P[5][0]}" y1="${P[5][1]}" x2="${P[5][0]}" y2="${P[5][1] - 52}" stroke="#f1f1ee" stroke-width="2"/><path d="M${P[5][0]} ${P[5][1] - 52} l30 8 l-30 8z" fill="#f6f10b"/></g>`;
  const trailEl = $('#trail'), len = trailEl.getTotalLength();
  const segLen = [0]; { let acc = 0; for (let i = 1; i < P.length; i++) { acc += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); segLen.push(acc); } }
  trailEl.style.strokeDasharray = len; trailEl.style.strokeDashoffset = len;
  trailEl.style.transition = 'stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1)';
  const c2 = $('#climb2'); c2.style.transition = 'transform .9s cubic-bezier(.2,.8,.2,1)';
  const R = $('#scR'), T = $('#scT');
  T.innerHTML = S.map((s, i) => `<button data-i="${i}">${s[4]}</button>`).join('');
  let cur = -1, scrT;
  function scramble(el, to) {
    clearInterval(scrT);
    if (reduce) { el.textContent = to; return; }
    const ch = 'abcçdefgğhıijklmnoöprsştuüvyz';
    let f = 0;
    scrT = setInterval(() => {
      f++;
      el.textContent = to.split('').map((c, i) => (i < f * 1.4 || c === ' ' || c === '.') ? c : ch[(Math.random() * ch.length) | 0]).join('');
      if (f * 1.4 >= to.length) { clearInterval(scrT); el.textContent = to; }
    }, 28);
  }
  function set(i, say) {
    i = clamp(i, 0, 5); if (i === cur) return; cur = i;
    R.value = i; R.style.setProperty('--p', (i / 5 * 100) + '%');
    scramble($('#scW'), S[i][0]);
    $('#scRu').textContent = S[i][1]; $('#scWho').textContent = S[i][2]; $('#scPow').textContent = S[i][3];
    $$('button', T).forEach((b, k) => b.classList.toggle('on', k === i));
    $$('.stop .dot', svg).forEach((d, k) => { d.setAttribute('fill', k <= i ? '#f6f10b' : '#0c0c0c'); d.setAttribute('stroke', k <= i ? '#f6f10b' : '#8d8d88'); });
    trailEl.style.strokeDashoffset = len - segLen[i];
    c2.style.transform = `translate(${P[i][0]}px, ${P[i][1]}px)`;
    $('#flag').setAttribute('opacity', i === 5 ? 1 : 0);
    if (say) play('k-' + i, S[i][0], $('#scPlay'));
  }
  let user = false;
  R.addEventListener('input', () => { user = true; set(+R.value, true); });
  T.onclick = e => { const b = e.target.closest('button'); if (b) { user = true; set(+b.dataset.i, true); } };
  svg.addEventListener('click', e => { const g = e.target.closest('.stop'); if (g) { user = true; set(+g.dataset.i, true); } });
  $('#scPlay').onclick = () => play('k-' + cur, S[cur][0], $('#scPlay'));
  set(0, false);
  // один раз показываем подъём сами, пока пользователь не тронул
  const dio = new IntersectionObserver(es => {
    if (!es[0].isIntersecting) return; dio.disconnect();
    if (reduce) return;
    let k = 0; const t = setInterval(() => { if (user || ++k > 5) { clearInterval(t); if (!user) setTimeout(() => !user && set(2, false), 900); return; } set(k, false); }, 750);
  }, { threshold: .5 });
  dio.observe($('#mount'));
})();

/* ---------------- большой конструктор ---------------- */
(function lab() {
  const F = window.FORMS; if (!F) return;
  const MODES = [
    ['abil', 'Могу', 'можно · умею'], ['ama', 'Не могу', 'bil исчезает'], ['mayabil', 'Могу не', 'может, не'], ['q', 'Можно?', 'просьба · вопрос'],
    ['mali', 'Должен', 'стоит'], ['mamali', 'Не должен', 'не стоит'], ['lazim', 'Надо', 'lazım'], ['zorunda', 'Вынужден', 'zorunda'],
  ];
  // классы кирпичей по режиму: s — корень, k — модальный кусок, n — отрицание, p — лицо, aux — служебное
  const CLS = { abil: ['s', 'k', 'aux', 'p'], ama: ['s', 'k', 'n', 'p'], mayabil: ['s', 'n', 'k', 'aux', 'p'], q: ['s', 'k', 'aux', 'p', 'p'],
    mali: ['s', 'k', 'p'], mamali: ['s', 'n', 'k', 'p'], lazim: ['s', 'aux', 'p', 'k'], zorunda: ['s', 'aux', 'k', 'p'] };
  const INF = { gel: 'прийти', yap: 'сделать', oku: 'читать', git: 'пойти', konus: 'поговорить', bekle: 'подождать', ic: 'выпить', gor: 'увидеть' };
  const SUBJ = ['я', 'ты', 'он/она', 'мы', 'вы', 'они'];
  const DAT = ['мне', 'тебе', 'ему/ей', 'нам', 'вам', 'им'];
  const CAN = ['могу', 'можешь', 'может', 'можем', 'можете', 'могут'];
  const MUST = ['должен(на)', 'должен(на)', 'должен(на)', 'должны', 'должны', 'должны'];
  const FORCED = ['вынужден(а)', 'вынужден(а)', 'вынужден(а)', 'вынуждены', 'вынуждены', 'вынуждены'];
  const Q = ['Можно мне %?', 'Можешь %?', 'Может ли он/она %?', 'Можно нам %?', 'Не могли бы вы %?', 'Могут ли они %?'];
  const cap = s => s[0].toUpperCase() + s.slice(1);
  const ru = (m, v, p) => {
    const inf = INF[v];
    switch (m) {
      case 'abil': return cap(`${SUBJ[p]} ${CAN[p]} ${inf}.`);
      case 'ama': return cap(`${SUBJ[p]} не ${CAN[p]} ${inf}.`);
      case 'mayabil': return cap(`${SUBJ[p]} ${CAN[p]} не ${inf}. (Может, и не…)`);
      case 'q': return Q[p].replace('%', inf);
      case 'mali': return cap(`${SUBJ[p]} ${MUST[p]} ${inf}. / ${DAT[p]} стоит ${inf}.`);
      case 'mamali': return cap(`${DAT[p]} не стоит ${inf}.`);
      case 'lazim': return cap(`${DAT[p]} надо ${inf}.`);
      case 'zorunda': return cap(`${SUBJ[p]} ${FORCED[p]} ${inf}.`);
    }
  };
  const BACK = 'aıou';
  const lastV = s => [...s].filter(c => 'aeıioöuü'.includes(c)).pop();
  const why = (m, V, p) => {
    const v = lastV(V.stem), a = BACK.includes(v) ? 'a' : 'e', out = [];
    const endsV = /[aeıioöuü]$/.test(V.stem);
    const names = { abil: `-${a}bil`, ama: `-${a}m${a}`, mayabil: `-m${a}y${a}bil`, q: `-${a}bil`, mali: a === 'a' ? '-malı' : '-meli', mamali: a === 'a' ? '-mamalı' : '-memeli', lazim: `-m${a}`, zorunda: `-m${a}k` };
    out.push(`Последняя гласная корня — «${v}», поэтому ${a}-вариант: ${names[m]}.`);
    if (endsV && ['abil', 'ama', 'q'].includes(m)) out.push(`Корень кончается на гласную — между гласными вставили y: ${V.stem}y-.`);
    if (V.slug === 'git' && ['abil', 'ama', 'q'].includes(m)) out.push('git перед гласной звонкает: t → d, gid-. Как kitap → kitabı.');
    if (V.slug === 'git' && !['abil', 'ama', 'q'].includes(m)) out.push('Суффикс начинается с согласной — t остаётся: git-.');
    if (m === 'ama') out.push('В отрицании bil исчезает: не «gelebilmem», а gelemem. Дальше — отрицательный аорист.');
    if (m === 'ama' && p === 3) out.push('У biz между -ma/-me и окончанием встаёт y: -mayız / -meyiz.');
    if (m === 'mayabil') out.push('Отрицание -ma/-me стоит ДО -yabil. Смысл: «могу и не делать».');
    if (m === 'q') out.push(p === 5 ? 'У onlar -ler остаётся на глаголе, mi стоит последним: …bilirler mi.' : 'Частица mi пишется отдельно и забирает окончание лица: …bilir miyim.');
    if (m === 'mali' || m === 'mamali') out.push('-malı/-meli начинается с согласной — буфер не нужен.');
    if (m === 'lazim') out.push(`Глагол стал существительным через -m${a}, окончание принадлежности показывает «чьё»: ${F.gen[p]} …. lazım не меняется.`);
    if (m === 'zorunda') out.push('-mak/-mek — инфинитив. zorunda не меняется, лицо цепляется к нему: zorundayım.');
    return out;
  };
  const st = { v: 0, m: 0, p: 0 };
  const vBox = $('#labV'), mBox = $('#labM'), pBox = $('#labP');
  vBox.innerHTML = F.verbs.map((v, i) => `<button class="chip" data-i="${i}">${v.stem}<small>${v.ru}</small></button>`).join('');
  mBox.innerHTML = MODES.map((m, i) => `<button class="chip" data-i="${i}">${m[1]}<small>${m[2]}</small></button>`).join('');
  const pers = () => (MODES[st.m][0] === 'lazim' ? F.gen : F.pers);
  const drawP = () => { pBox.innerHTML = pers().map((p, i) => `<button class="chip${i === st.p ? ' on' : ''}" data-i="${i}">${p}</button>`).join(''); };
  vBox.onclick = e => { const b = e.target.closest('.chip'); if (b) { st.v = +b.dataset.i; render(true); } };
  mBox.onclick = e => { const b = e.target.closest('.chip'); if (b) { st.m = +b.dataset.i; render(true); } };
  pBox.onclick = e => { const b = e.target.closest('.chip'); if (b) { st.p = +b.dataset.i; render(true); } };
  const cur = () => { const V = F.verbs[st.v], m = MODES[st.m][0]; return { V, m, f: V.forms[m][st.p] }; };
  const slug = (V, m, p) => `c-${V.slug}-${m}-${p}`;
  function render(say) {
    const { V, m, f } = cur();
    $$('.chip', vBox).forEach((c, i) => c.classList.toggle('on', i === st.v));
    $$('.chip', mBox).forEach((c, i) => c.classList.toggle('on', i === st.m));
    drawP();
    $('#labTag').textContent = `${V.stem} · ${MODES[st.m][1]} · ${pers()[st.p]}`;
    const cls = CLS[m];
    $('#labB').innerHTML = f.parts.map((pt, i) => pt.trim() ? `<b class="${cls[i] || 'p'}" style="animation-delay:${i * .12}s">${pt.trim()}</b>` : '').join('');
    const pron = m === 'lazim' ? F.gen[st.p] : F.pers[st.p];
    $('#labW').innerHTML = `<span class="g">${pron}</span> ${f.w}`;
    $('#labRu').textContent = ru(m, V.slug, st.p);
    $('#labWhy').innerHTML = why(m, V, st.p).map((t, i) => `<div style="animation-delay:${.3 + i * .12}s">${t}</div>`).join('');
    $('#labC').innerHTML = V.forms[m].map((x, i) => `<button class="${i === st.p ? 'cur' : ''}" data-i="${i}"><span>${pers()[i]}</span><span>${x.w}</span></button>`).join('');
    if (say) play(slug(V, m, st.p), f.w, $('#labPlay'));
  }
  $('#labC').onclick = e => { const b = e.target.closest('button'); if (b) { st.p = +b.dataset.i; render(true); } };
  $('#labPlay').onclick = () => { const { V, m, f } = cur(); play(slug(V, m, st.p), f.w, $('#labPlay')); };
  render(false);
})();

/* ---------------- измеритель уверенности ---------------- */
(function gauge() {
  const G = [
    ['e-4', 'Olabilir.', 'Может быть. Возможно.', 50],
    ['e-0', 'Evde olabilir.', 'Может, он дома.', 50],
    ['s-uyuyor-olabilir', 'Uyuyor olabilir.', 'Может, спит.', 50],
    ['e-3', 'Yorgun olmalısın.', 'Ты, наверное, устал.', 85],
    ['e-1', 'Evde olmalı.', 'Он, должно быть, дома.', 90],
    ['s-uyumus-olmali', 'Uyumuş olmalı.', 'Видимо, уснул. Уже случилось.', 90],
    ['e-2', 'Eve gitmiş olmalı.', 'Видимо, уже ушёл домой.', 90],
  ];
  const box = $('#gBtns');
  box.innerHTML = G.map((g, i) => `<button class="say" data-i="${i}">${g[1]}<small>${g[2]}</small></button>`).join('');
  function set(i, say) {
    const [s, w, r, pct] = G[i];
    $('#needle').style.transform = `rotate(${-90 + pct * 1.8}deg)`;
    $('#gArc').style.strokeDashoffset = 503 * (1 - pct / 100);
    $('#gPct').textContent = '≈ ' + pct + '%';
    $('#gW').textContent = w; $('#gRu').textContent = r;
    if (say) play(s, w, box.children[i]);
  }
  box.onclick = e => { const b = e.target.closest('.say'); if (b) set(+b.dataset.i, true); };
  $('#needle').style.transform = 'rotate(-90deg)';
  const gio = new IntersectionObserver(es => { if (es[0].isIntersecting) { gio.disconnect(); setTimeout(() => set(1, false), 300); } }, { threshold: .5 });
  gio.observe($('.gauge'));
})();

/* ---------------- чат olur / olmaz ---------------- */
(function chat() {
  const box = $('#chat'), btns = $('#chatBtns');
  const bub = (side, html) => { const d = document.createElement('div'); d.className = 'bub ' + side; d.innerHTML = html; box.appendChild(d); return d; };
  function reset() {
    box.innerHTML = '';
    bub('l', 'В аудитории +38. Кондиционер сломан. Ханде-ходжа проверяет тетради.<small>Ты у окна</small>');
    btns.innerHTML = `<button class="chip" id="ask1">Спросить: <span lang="tr">Pencereyi açsam olur mu?</span></button>`;
    $('#ask1').onclick = step1;
  }
  function step1() {
    btns.innerHTML = '';
    bub('r', 'Hocam, pencereyi açsam olur mu?<small>Ходжа, ничего, если я открою окно?</small>');
    play('o-yapsam', 'Pencereyi açsam olur mu?', null);
    const typing = bub('l', '…');
    setTimeout(() => {
      typing.remove();
      const yes = Math.random() < .5;
      bub('l', yes ? 'Olur.<small>Можно.</small>' : 'Olmaz.<small>Нельзя.</small>');
      play(yes ? 'o-olur' : 'o-olmaz', yes ? 'Olur.' : 'Olmaz.', null);
      setTimeout(() => {
        bub('l', yes ? 'Окно открыто. На улице +38. Ханде-ходжа уже жалеет.' : 'Окно закрыто. Ты сидишь. Потеешь. Зато уважительно.');
        btns.innerHTML = `<button class="chip" id="again">Спросить ещё раз ↻</button>`;
        $('#again').onclick = reset;
      }, 1100);
    }, 1300);
  }
  reset();
})();

/* ---------------- тест ---------------- */
(function quiz() {
  const Q = [
    ['Консульство. Посетитель пришёл раньше времени. Вежливо попроси его подождать.', ['Bekleyebilir misiniz?', 'Beklemelisiniz.', 'Beklemek zorundasınız.'], 'q-1',
      '-ebilir + mi — вежливая просьба. -meli звучит как нотация, zorunda — как приказ.'],
    ['Друг зовёт на футбол. У тебя экзамен в это же время. Прийти точно не получится.', ['Gelemem.', 'Gelmeyebilirim.', 'Gelmemeliyim.'], 'q-2',
      'Gelemem — «не могу». Gelmeyebilirim оставляет надежду, Gelmemeliyim — «мне не стоит», как будто это вопрос совести.'],
    ['Зовут на день рождения. Ты ещё не решил и не хочешь ничего обещать.', ['Gelmeyebilirim.', 'Gelemem.', 'Gelmem lazım.'], 'q-3',
      'Отрицание перед -ebil: «могу и не прийти». Честно и мягко.'],
    ['Врач говорит, что тебе стоит больше отдыхать.', ['Dinlenmelisin.', 'Dinlenebilirsin.', 'Dinlenmek zorundasın.'], 'q-4',
      'Совет и внутренний долг — -meli. -ebilir — просто разрешение. zorunda — как будто отдыхать заставляет полиция.'],
    ['Магазин. Тебе нужна вода.', ['Bana su lazım.', 'Ben su lazım.', 'Su lazımım.'], 'q-5',
      'Кому нужно — в дательном падеже: bana. «Ben su lazım» — «я вода нужен».'],
    ['Göç İdaresi. Без страховки заявление не примут. Что говорит чиновник?', ['Sağlık sigortası şart.', 'Sağlık sigortası olabilir.', 'Sağlık sigortası lazım mı?'], 'q-6',
      'Обязательное условие — şart. «Olabilir» чиновник не скажет никогда.'],
    ['Автобус ушёл, такси нет. Вечером рассказываешь, что до общаги пришлось идти пешком.', ['Yürümek zorunda kaldım.', 'Yürüyebildim.', 'Yürümeliydim.'], 'q-7',
      'Пришлось, выбора не было — zorunda kaldım. Yürümeliydim — «мне стоило пойти пешком» (но я не пошёл).'],
    ['Эмре не берёт трубку три часа. Ты почти уверен, что он уснул.', ['Uyumuş olmalı.', 'Uyuyabilir.', 'Uyumalı.'], 'q-8',
      'Почти уверен и уже случилось — -miş olmalı. Uyumalı — «ему надо поспать», совет. Uyuyabilir — «ему можно спать».'],
  ];
  const box = $('#quiz');
  let i = 0, score = 0, res = [];
  const shuffle = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(p => p[1]);
  function bars() { return `<div class="bars">${Q.map((_, k) => `<i class="${res[k] === true ? 'ok' : res[k] === false ? 'bad' : k === i ? 'cur' : ''}"></i>`).join('')}</div>`; }
  function show() {
    if (i >= Q.length) return finish();
    const [sit, opts, s, expl] = Q[i];
    const order = shuffle(opts.map((t, k) => [t, k === 0]));
    box.innerHTML = `<div class="top">${bars()}<span class="num">${String(i + 1).padStart(2, '0')} / 0${Q.length}</span></div>
      <div class="sit">${sit}</div>
      <div class="opts">${order.map(([t, ok]) => `<button class="opt" data-ok="${ok}">${t}<span></span></button>`).join('')}</div>
      <div class="expl"></div><div class="next"></div>`;
    $$('.opt', box).forEach(b => b.onclick = () => {
      const ok = b.dataset.ok === 'true';
      $$('.opt', box).forEach(x => { x.disabled = true; if (x.dataset.ok === 'true') { x.classList.add('ok'); x.lastChild.textContent = '✓'; } });
      if (!ok) { b.classList.add('bad'); b.lastChild.textContent = '✗'; }
      res[i] = ok; if (ok) score++;
      $('.bars', box).outerHTML = bars();
      $('.expl', box).textContent = (ok ? 'Да. ' : 'Не совсем. ') + expl;
      play(s, opts[0], null);
      $('.next', box).innerHTML = `<button class="br">${i === Q.length - 1 ? 'Результат' : 'Дальше'}</button>`;
      $('.next .br', box).onclick = () => { i++; show(); };
    });
  }
  function finish() {
    const msg = score === 8 ? 'Восемь из восьми. Модальность твоя. Дальше — эпистемика, частицы и субъюнктив. Они лежат на платформе.'
      : score >= 6 ? 'Хорошо. Одна-две ловушки ещё ловят — обычно это gelemem и gelmeyebilirim. Вернись к главе 01 или иди дальше на платформу.'
      : score >= 4 ? 'Половина есть. Пройди конструктор ещё раз, особенно режимы «Не могу» и «Могу не».'
      : 'Нормально для первого раза. Я в TÖMER так и начинал. Пролистай шпаргалку и попробуй снова.';
    box.innerHTML = `<div class="top">${bars()}<span class="num">ГОТОВО</span></div>
      <div class="res"><div class="n">${score}/8</div><p>${msg}</p>
      <div style="margin-top:18px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="br w" id="qAgain">Ещё раз</button><a class="br" href="#platform">Что дальше</a></div></div>`;
    $('#qAgain').onclick = () => { i = 0; score = 0; res = []; show(); };
    if (score >= 6) confetti();
  }
  show();
})();

/* ---------------- конфетти ---------------- */
function confetti() {
  if (reduce) return;
  const c = $('#confetti'), x = c.getContext('2d');
  c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio; x.scale(devicePixelRatio, devicePixelRatio);
  const cols = ['#f6f10b', '#f1f1ee', '#8d8d88', '#f6f10b'];
  const ps = Array.from({ length: 160 }, () => ({ x: innerWidth / 2, y: innerHeight * .55, vx: (Math.random() - .5) * 16, vy: -Math.random() * 16 - 4, r: Math.random() * 6 + 3, c: cols[(Math.random() * 4) | 0], a: Math.random() * 6, s: Math.random() * .3 - .15 }));
  let f = 0;
  (function tick() {
    x.clearRect(0, 0, innerWidth, innerHeight);
    ps.forEach(p => { p.vy += .42; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.s; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.fillRect(-p.r, -p.r / 3, p.r * 2, p.r / 1.5); x.restore(); });
    if (++f < 170) requestAnimationFrame(tick); else x.clearRect(0, 0, innerWidth, innerHeight);
  })();
}

/* ---------------- витрина платформы ---------------- */
(function showcase() {
  const I = [
    ['grammar', 'Модальность и наречия', 'Грамматика B1–C1', 'n-modal', 'Семь тем блока: -ebilir, -malı/-meli, lazım/gerek/şart, эпистемика, частицы, субъюнктив. Этот гайд — первые три.'],
    ['grammar', 'Грамматика B1 — C1', 'Notion', 'n-b1c1', 'Отдельное пространство для продвинутых уровней: навигация, подборки ресурсов, заметки и таймер.'],
    ['grammar', 'Старт: A0 — A2', 'Notion', 'n-a0a2', 'С чего начинать с нуля. Алфавит, первые конструкции и подборка ресурсов для уровней до B1.'],
    ['lexika', 'Лексика по темам', '131 блок', 'n-temy', 'Еда, ресторан, семья, больница, хобби, погода, гостиница, дом, транспорт — с фото и живыми фразами.'],
    ['lexika', 'Знакомство на турецком', 'Лексика A1', 'n-tanisma', 'Таблица: русский, турецкий, транскрипция кириллицей. Всё, что говорят при знакомстве.'],
    ['progress', 'Прогресс по темам', 'База Notion', 'n-progress', 'Каждая тема грамматики с блоком, уровнем и отметкой «пройдено». Видно, где ты и что осталось.'],
    ['progress', 'Трекер привычек', 'Чтение · аудирование · речь · письмо', 'n-habits', 'Отмечаешь, что сделал сегодня: чтение, аудирование, разговор, письмо. Колесо показывает баланс.'],
    ['video', 'Каталог YouTube', 'по уровням', 'p-video', 'Каналы, плейлисты и видео, отобранные вручную. Смотришь прямо на сайте, прогресс уходит в кабинет.'],
    ['video', 'План на неделю', 'пять видео', 'p-plan', 'Пять роликов на будние дни под твой уровень. Обновляется каждую неделю.'],
    ['cizgi', 'Alterna Çizgi', '138 мультфильмов', 'p-cizgi', 'Мультфильмы по уровням: медленная речь, короткие фразы, картинка объясняет половину смысла. 70 — с нуля.'],
    ['kitap', 'Alterna Kitap', 'книги по уровням', 'p-kitap', 'Что читать на твоём уровне и где взять: бумага, электронные версии, библиотеки.'],
    ['podcast', 'Alterna Podcasts', 'A1 · A2 · B1 · B2 · C1', 'p-podcast', 'Проверенные вручную подкасты: от бытовых фраз до радиопередач для носителей.'],
    ['apps', 'Alterna Uygulama', '143 сервиса', 'p-uygulama', 'Приложения, которые реально двигают турецкий. С фильтрами по уровню, платформе и бесплатному режиму.'],
    ['progress', 'Маршрут A1 → C1', 'пять ступеней', 'p-marshrut', 'У каждой ступени задача, сроки и своя связка инструментов. Нажимаешь — разворачивается.'],
  ];
  const CATS = [['all', 'Всё'], ['grammar', 'Грамматика'], ['lexika', 'Лексика'], ['video', 'Видео'], ['cizgi', 'Мультики'], ['kitap', 'Книги'], ['podcast', 'Подкасты'], ['apps', 'Приложения'], ['progress', 'Прогресс']];
  const stack = $('#stack'), fl = $('#filters');
  let cat = 'all', list = I, idx = 0, auto, touched = false;
  fl.innerHTML = CATS.map(c => `<button data-c="${c[0]}">${c[1]}</button>`).join('');
  fl.onclick = e => { const b = e.target.closest('button'); if (!b) return; touched = true; cat = b.dataset.c; build(); };
  function build() {
    $$('button', fl).forEach(b => b.classList.toggle('on', b.dataset.c === cat));
    list = cat === 'all' ? I : I.filter(x => x[0] === cat);
    idx = 0;
    stack.innerHTML = list.map((x, i) => `<article class="pcard" data-i="${i}">
      <div class="ph"><img src="media/shots/${x[3]}.webp" alt="${x[1]}" loading="lazy" draggable="false"></div>
      <div class="t"><b${x[1].startsWith('Alterna') ? ' lang="tr"' : ''}>${x[1]}</b><span>${x[2]}</span></div>
      <p>${x[4]}</p>
      <div class="f"><span>Alterna</span><u>A0 → C1</u></div></article>`).join('');
    $('#cntB').textContent = String(list.length).padStart(2, '0');
    lay();
  }
  function lay() {
    const narrow = innerWidth < 720;
    $$('.pcard', stack).forEach((c, i) => {
      let d = i - idx;
      const n = list.length;
      if (n > 3) { if (d > n / 2) d -= n; if (d < -n / 2) d += n; }
      const ad = Math.abs(d);
      const off = narrow ? 34 : 62;
      c.style.transform = `translateX(calc(-50% + ${d * off}%)) translateY(${ad * 26}px) rotate(${d * 5}deg) scale(${1 - ad * .08})`;
      c.style.zIndex = 20 - ad;
      c.style.opacity = ad > 2 ? 0 : 1;
      c.style.pointerEvents = ad > 2 ? 'none' : 'auto';
      c.style.filter = ad ? `brightness(${1 - ad * .25})` : 'none';
      c.classList.toggle('front', d === 0);
    });
    $('#cntA').textContent = String(idx + 1).padStart(2, '0');
  }
  const go = n => { idx = (idx + n + list.length) % list.length; lay(); };
  $('#prevC').onclick = () => { touched = true; go(-1); };
  $('#nextC').onclick = () => { touched = true; go(1); };
  let sx = null, moved = false;
  stack.addEventListener('pointerdown', e => { sx = e.clientX; moved = false; });
  stack.addEventListener('pointermove', e => { if (sx !== null && Math.abs(e.clientX - sx) > 8) moved = true; });
  stack.addEventListener('pointerup', e => {
    if (sx === null) return;
    const dx = e.clientX - sx; sx = null;
    if (Math.abs(dx) > 40) { touched = true; go(dx < 0 ? 1 : -1); return; }
    const c = e.target.closest('.pcard');
    if (c && !moved) { touched = true; const k = +c.dataset.i; if (k !== idx) { idx = k; lay(); } }
  });
  stack.addEventListener('pointercancel', () => { sx = null; });
  addEventListener('resize', lay);
  const sio = new IntersectionObserver(es => {
    clearInterval(auto);
    if (es[0].isIntersecting && !reduce) auto = setInterval(() => { if (!touched) go(1); }, 3800);
  }, { threshold: .4 });
  sio.observe(stack);
  build();
})();

/* ---------------- видео платформы ---------------- */
(function vids() {
  const V = [
    ['grammar', 'Грамматика', 'alterna · grammar · ünsüz yumuşaması', 'Гайд по грамматике', 'Чередование согласных: сетка из четырёх пар, три ловушки, словарь-проверка и тренажёр, который считает ответы. Модальность на платформе устроена так же.'],
    ['trainer', 'Тренажёр', 'alterna · grammar · kaynaştırma', 'Тренажёр с прогрессом', 'Буферные согласные: собираешь форму, видишь, что произошло, отвечаешь. Статистика ошибок по типам сохраняется.'],
    ['cizgi', 'Мультики', 'alterna çizgi · katalog', 'Alterna Çizgi', '138 мультфильмов по уровням. Фильтры по формату, жанру и дубляжу, кнопка «случайный мультик».'],
    ['uygulama', 'Приложения', 'alterna uygulama · katalog', 'Alterna Uygulama', '143 приложения и сервиса по уровням: курс, карточки, словарь, разговор. Видно, где есть бесплатный режим.'],
    ['podcast', 'Подкасты', 'alterna podcasts · katalog', 'Alterna Podcasts', 'Подкасты A1–C1, проверенные вручную. От бытовых фраз до радиопередач для носителей.'],
  ];
  const tabs = $('#vtabs'), vid = $('#vid'), poster = $('#vposter'), br = $('#browser');
  let k = 0, vis = false;
  tabs.innerHTML = V.map((v, i) => `<button class="chip" data-i="${i}">${v[1]}</button>`).join('');
  tabs.onclick = e => { const b = e.target.closest('.chip'); if (b) set(+b.dataset.i); };
  function set(i) {
    k = i;
    $$('.chip', tabs).forEach((c, j) => c.classList.toggle('on', j === i));
    const [id, , url, title, text] = V[i];
    poster.src = `media/video/${id}.jpg`; vid.poster = poster.src;
    vid.src = `media/video/${id}.mp4`;
    $('#vurl').textContent = url; $('#vtitle').textContent = title; $('#vtitle').lang = title.startsWith('Alterna') ? 'tr' : 'ru'; $('#vtext').textContent = text;
    if (vis) vid.play().catch(() => {});
  }
  const vio = new IntersectionObserver(es => es.forEach(e => {
    vis = e.intersectionRatio > .45;
    br.classList.toggle('color', e.intersectionRatio > .7);
    if (vis) vid.play().catch(() => {}); else vid.pause();
  }), { threshold: [0, .45, .7, 1] });
  vio.observe(br);
  vid.addEventListener('ended', () => set((k + 1) % V.length));
  set(0);

  const P = [['p-komu', 'Кому подойдёт'], ['p-video', 'Видео каталога'], ['p-plan', 'План на неделю'], ['p-cifry', 'Каталог в цифрах'], ['p-kabinet', 'Личный кабинет'],
    ['p-cizgi', 'Alterna Çizgi'], ['p-mult', 'Карточка мультика'], ['p-klub', 'Клуб и значки'], ['p-kitap', 'Alterna Kitap'], ['p-podcast', 'Alterna Podcasts'],
    ['p-uygulama', 'Alterna Uygulama'], ['p-marshrut', 'Маршрут A1 → C1'], ['p-karta', 'Стамбул → Анкара']];
  $('#phones').innerHTML = P.map(p => `<figure class="phone"><div class="scr"><img src="media/shots/${p[0]}.webp" alt="${p[1]}" loading="lazy"></div><figcaption>${p[1]}</figcaption></figure>`).join('');
})();

/* ---------------- полоса «1 из 128» ---------------- */
const gb = $('#guidebar');
new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { $('i', gb).style.width = 'max(8px, ' + (100 / 128) + '%)'; o.disconnect(); } }, { threshold: .6 }).observe(gb);

/* ---------------- выбор уровня ---------------- */
(function level() {
  const L = [
    ['A0', 'Старт с нуля', 'Ветка A0–A1–A2: алфавит, 29 букв, гласные и согласные, первые фразы. Параллельно — мультики с нуля в Alterna Çizgi.'],
    ['A1', 'Первые фразы в дело', 'Грамматика A1, лексика «Знакомство», «Еда», «Транспорт». План «пять видео на неделю» подбирается под A1.'],
    ['A2', 'Падежи и времена', 'Падежи, прошедшие времена, лексика «Больница», «Гостиница», «Дом». Подкасты и мультики уровня A2.'],
    ['B1', 'Ты сейчас здесь', 'Блок «Модальность и наречия» — ты уже в нём. Дальше условное наклонение, косвенная речь, причастия. Книги и подкасты B1.'],
    ['B2', 'Убрать акцент из речи', 'Причастия, деепричастия, придаточные. Аутентичные каналы и подкасты B2. Отдельный блок по экзамену B2.'],
    ['C1', 'Отделка', 'Связность текста, официальный и разговорный стиль, академическое письмо, морфофонология. Экзамен C1 отдельным блоком.'],
  ];
  const box = $('#lvl');
  box.innerHTML = L.map((l, i) => `<button class="chip" data-i="${i}">${l[0]}</button>`).join('');
  box.onclick = e => {
    const b = e.target.closest('.chip'); if (!b) return;
    const l = L[+b.dataset.i];
    $$('.chip', box).forEach(c => c.classList.toggle('on', c === b));
    $('#lvlOut').innerHTML = `<b>${l[0]} · ${l[1]}</b><p>${l[2]}</p>`;
  };
})();

onScroll();
})();

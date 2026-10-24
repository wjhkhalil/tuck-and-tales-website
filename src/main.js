import './style.css';
import { stories } from './stories.js';

const BASE = import.meta.env.BASE_URL;
const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;

const $ = (sel) => document.querySelector(sel);

/* ---------- Tiny sound effects (WebAudio, no files) ---------- */
let audio;
function chime(freq = 880, length = 0.35) {
  try {
    audio ??= new AudioContext();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, audio.currentTime + length);
    gain.gain.setValueAtTime(0.12, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + length);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + length);
  } catch {
    /* Sound is a bonus; ignore if unavailable. */
  }
}

/* ---------- Sky: stars + clouds ---------- */
const starNotes = [523, 587, 659, 784, 880, 988, 1047];
const starsEl = $('#stars');
for (let i = 0; i < 60; i++) {
  const s = document.createElement('button');
  s.className = 'star';
  s.type = 'button';
  s.tabIndex = -1;
  s.setAttribute('aria-hidden', 'true');
  s.style.left = `${Math.random() * 100}%`;
  s.style.top = `${Math.random() * 85}%`;
  s.style.setProperty('--s', `${6 + Math.random() * 12}px`);
  s.style.setProperty('--d', `${2 + Math.random() * 3}s`);
  s.style.setProperty('--delay', `${-Math.random() * 4}s`);
  s.addEventListener('click', () => {
    s.classList.remove('ping');
    void s.offsetWidth;
    s.classList.add('ping');
    chime(starNotes[Math.floor(Math.random() * starNotes.length)]);
  });
  starsEl.append(s);
}

const cloudSvg =
  '<svg viewBox="0 0 240 100"><path d="M40 90a30 30 0 0 1 4-60 42 42 0 0 1 80-12 34 34 0 0 1 62 14 28 28 0 0 1 14 58Z"/></svg>';
const cloudsEl = $('#clouds');
const clouds = [];
for (let i = 0; i < 6; i++) {
  const c = document.createElement('div');
  c.className = 'cloud';
  c.innerHTML = cloudSvg;
  c.style.top = `${5 + i * 15}%`;
  c.style.setProperty('--w', `${120 + Math.random() * 160}px`);
  c.style.setProperty('--t', `${60 + Math.random() * 60}s`);
  c.style.setProperty('--delay', `${-Math.random() * 100}s`);
  cloudsEl.append(c);
  clouds.push({ el: c.firstElementChild, depth: 0.05 + Math.random() * 0.15 });
}

/* ---------- Scroll: day → night, cloud parallax, owl reactions ---------- */
const owl = $('#owl');
let nightLight = false;
let lastY = window.scrollY;
let yawnTimer;
let ticking = false;

function onScroll() {
  ticking = false;
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const progress = max > 0 ? Math.min(1, y / max) : 0;
  root.style.setProperty('--night', nightLight ? 1 : Math.min(1, progress * 1.25).toFixed(3));

  for (const c of clouds) c.el.style.setProperty('--py', `${-y * c.depth}px`);

  // Ollie yawns after a big scroll, and waves goodnight at the bottom.
  if (Math.abs(y - lastY) > 500) {
    lastY = y;
    yawn();
  }
  const atBottom = progress > 0.97;
  if (atBottom && !owl.classList.contains('awake')) {
    owl.classList.add('awake', 'wave');
    say('Goodnight! Sleep tight! 💤', 2600);
    setTimeout(() => owl.classList.remove('wave'), 2200);
  } else if (!atBottom) {
    owl.classList.remove('awake');
  }
}

window.addEventListener(
  'scroll',
  () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScroll);
    }
  },
  { passive: true },
);
onScroll();

/* ---------- Owl mascot ---------- */
const bubble = $('#owl-bubble');
const owlLines = [
  'Hoo-hoo! Story time?',
  'Try tapping the stars! ✨',
  'My favourite is Milo’s Moonbeam Yawn.',
  'Psst… click the moon three times!',
  'Shh… someone is getting sleepy.',
];
let lineIdx = 0;
let talkTimer;

function say(text, ms = 2400) {
  bubble.textContent = text;
  owl.classList.add('talk');
  clearTimeout(talkTimer);
  talkTimer = setTimeout(() => owl.classList.remove('talk'), ms);
}

function yawn() {
  if (owl.classList.contains('yawn')) return;
  owl.classList.add('yawn');
  clearTimeout(yawnTimer);
  yawnTimer = setTimeout(() => owl.classList.remove('yawn'), 1500);
}

owl.addEventListener('click', () => {
  say(owlLines[lineIdx++ % owlLines.length]);
  owl.classList.add('wave');
  setTimeout(() => owl.classList.remove('wave'), 2000);
  chime(660, 0.25);
});

setTimeout(() => say('Hoo-hoo! Story time?'), 1800);

/* ---------- Night light toggle ---------- */
const lamp = $('#lamp');
function setNightLight(on) {
  nightLight = on;
  lamp.setAttribute('aria-pressed', String(on));
  root.dataset.nightlight = on ? 'on' : 'off';
  onScroll();
  try {
    localStorage.setItem('tt-nightlight', on ? 'on' : 'off');
  } catch {
    /* Storage can be blocked; the toggle still works for this visit. */
  }
}

lamp.addEventListener('click', () => {
  lamp.classList.add('tug');
  setTimeout(() => lamp.classList.remove('tug'), 180);
  chime(nightLight ? 440 : 330, 0.2);
  setNightLight(!nightLight);
});

try {
  if (localStorage.getItem('tt-nightlight') === 'on') setNightLight(true);
} catch {
  /* ignore */
}

/* ---------- Moon easter egg: 3 clicks = wink + shooting star ---------- */
const moon = $('#moon');
const shootingStar = $('#shooting-star');
let moonClicks = 0;
moon.addEventListener('click', () => {
  moonClicks++;
  moon.classList.remove('bump');
  void moon.offsetWidth;
  moon.classList.add('bump');
  chime(400 + moonClicks * 120, 0.2);
  if (moonClicks >= 3) {
    moonClicks = 0;
    moon.classList.add('wink');
    shootingStar.classList.remove('go');
    void shootingStar.offsetWidth;
    shootingStar.classList.add('go');
    setTimeout(() => chime(1200, 0.6), 200);
    setTimeout(() => moon.classList.remove('wink'), 1600);
  }
});

/* ---------- Storybook in the hero ---------- */
const book = $('#book');
const spreads = [
  ['01-home', 'Tuck & Tales home screen', '03-read-story', 'Reading The Little Bunny and the Carrot'],
  ['02-story-library', 'The story library with categories', '04-favorites', 'Favourite stories'],
  ['05-bedtime-stories', 'Bedtime stories', '06-bedtime-reading', 'Dark bedtime reading mode'],
];
let spread = 0;
setTimeout(() => book.classList.add('open'), reduceMotion ? 0 : 700);

const leaf = $('#leaf');
const leftImg = $('#book-left');
const rightImg = $('#book-right');
let turning = false;

function setImg(img, file, alt) {
  img.src = `${BASE}screens/${file}.webp`;
  img.alt = alt;
  return img.decode().catch(() => {});
}

async function turnPage() {
  if (!book.classList.contains('open')) {
    book.classList.add('open');
    return;
  }
  if (turning) return;
  turning = true;

  const [, , curR, curRa] = spreads[spread];
  spread = (spread + 1) % spreads.length;
  const [l, la, r, ra] = spreads[spread];

  // Front of the leaf = the page we are turning; back = the new left page.
  // The new right page waits underneath and is revealed as the leaf lifts.
  await Promise.all([
    setImg($('#leaf-front'), curR, ''),
    setImg($('#leaf-back'), l, ''),
  ]);
  await setImg(rightImg, r, ra);

  chime(700, 0.2);
  if (reduceMotion) {
    await setImg(leftImg, l, la);
    turning = false;
    return;
  }
  book.classList.add('turning');
  leaf.classList.add('turning');
  const done = async (e) => {
    // Shading animations on the faces bubble up here too; wait for the turn itself.
    if (e.target !== leaf) return;
    leaf.removeEventListener('animationend', done);
    await setImg(leftImg, l, la);
    leaf.classList.remove('turning');
    book.classList.remove('turning');
    turning = false;
  };
  leaf.addEventListener('animationend', done);
}

$('#book-flip').addEventListener('click', turnPage);
rightImg.parentElement.addEventListener('click', turnPage);

/* ---------- Story library: cartoon books on a bookcase ---------- */
const bookcaseEl = $('#bookcase');
const chipsEl = $('#chips');
const searchEl = $('#story-search');
const emptyEl = $('#story-empty');
const modal = $('#story-modal');
let selectedCategory = 'All';

// The original illustrations are ~2 MB PNGs; ask Cloudinary for a small, cropped copy instead.
const thumb = (url, w, h) => url.replace('/upload/', `/upload/c_fill,w_${w},h_${h},f_auto,q_auto/`);

const categoryLook = {
  Bedtime: { color: '#5B7BE0', emoji: '🌙' },
  Animals: { color: '#4CB873', emoji: '🐾' },
  Patience: { color: '#A57BE6', emoji: '🌱' },
  Adventure: { color: '#FF9D19', emoji: '🚀' },
  Friendship: { color: '#FF7A8A', emoji: '💛' },
};

/* Story preview: an open storybook showing the first few pages of the tale */
const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.tuckandtales.app';
const sbook = $('#sbook');
const sLeft = $('#sbook-left');
const sRight = $('#sbook-right');
const sLeaf = $('#sbook-leaf');
const [sLeafFront, sLeafBack] = sLeaf.children;
const sPrev = $('#sbook-prev');
const sNext = $('#sbook-next');
const onePageMode = window.matchMedia('(max-width: 700px)');
let current;
let pages = [];
let at = 0; // index of the first visible page
let flipping = false;
let queued = 0; // a tap made mid-turn runs right after

const esc = (text) => text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function buildPages(story) {
  const result = [{ type: 'art' }];
  let paras = [];
  let length = 0;
  for (const p of story.preview) {
    if (paras.length && length + p.length > 170) {
      result.push({ type: 'text', paras });
      paras = [];
      length = 0;
    }
    paras.push(p);
    length += p.length;
  }
  if (paras.length) result.push({ type: 'text', paras });
  // Two-page spreads need an even count so the "what happens next" page lands on the right.
  if (!onePageMode.matches && result.length % 2 === 0) result.push({ type: 'tbc' });
  result.push({ type: 'end' });
  return result;
}

function renderPage(index) {
  const page = pages[index];
  if (!page) return '';
  switch (page.type) {
    case 'art':
      return `<div class="sp-art"><img src="${thumb(current.image, 640, 640)}" alt="Illustration for ${esc(current.title)}" /></div>
        <h3 class="sp-title">${esc(current.title)}</h3>
        <span class="sp-cat">${esc(current.category)}</span>`;
    case 'text': {
      const number = pages.slice(0, index + 1).filter((p) => p.type === 'text').length;
      return `<div class="sp-text${number > 1 ? ' sp-text--cont' : ''}">${page.paras.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
        <div class="sp-num">${number}</div>`;
    }
    case 'end':
      return `<div class="sp-end">
          <div class="sp-end__icon" aria-hidden="true">🦉</div>
          <h3>What happens next?</h3>
          <p>Read the rest of “${esc(current.title)}” in the Tuck &amp; Tales app.</p>
          <a class="sp-btn" href="${PLAY_URL}" target="_blank" rel="noopener">Get the app →</a>
          <button class="sp-btn sp-btn--light" type="button" data-action="restart">Read again</button>
        </div>`;
    default:
      return `<div class="sp-tbc">
          <div class="sp-art sp-art--small"><img src="${thumb(current.image, 400, 400)}" alt="" /></div>
          <p>To be continued…</p>
        </div>`;
  }
}

const step = () => (onePageMode.matches ? 1 : 2);

function showSpread() {
  if (onePageMode.matches) {
    sRight.innerHTML = renderPage(at);
    $('#sbook-count').textContent = `Page ${at + 1} of ${pages.length}`;
  } else {
    sLeft.innerHTML = renderPage(at);
    sRight.innerHTML = renderPage(at + 1);
    $('#sbook-count').textContent = `Pages ${at + 1}–${at + 2} of ${pages.length}`;
  }
  sPrev.disabled = at === 0;
  sNext.disabled = at + step() >= pages.length;
}

async function swing(from, to) {
  sLeaf.classList.add('turning');
  if (!reduceMotion) {
    await sLeaf.animate([{ transform: `rotateY(${from}deg)` }, { transform: `rotateY(${to}deg)` }], {
      duration: 850,
      easing: 'cubic-bezier(0.45, 0.05, 0.35, 1)',
    }).finished;
  }
  sLeaf.classList.remove('turning');
}

async function turn(direction) {
  if (flipping) {
    queued = direction;
    return;
  }
  const single = onePageMode.matches;
  const target = at + direction * step();
  if (target < 0 || target >= pages.length) return;
  flipping = true;
  chime(direction > 0 ? 700 : 560, 0.18);

  if (direction > 0) {
    // The right page lifts and lands on the left; the next page waits underneath.
    sLeafFront.innerHTML = renderPage(single ? at : at + 1);
    sLeafBack.innerHTML = single ? '' : renderPage(at + 2);
    sRight.innerHTML = renderPage(single ? at + 1 : at + 3);
    await swing(0, -180);
  } else {
    // The left page lifts and lands back on the right.
    sLeafFront.innerHTML = renderPage(at - 1);
    sLeafBack.innerHTML = single ? '' : renderPage(at);
    if (!single) sLeft.innerHTML = renderPage(at - 2);
    await swing(-180, 0);
  }

  at = target;
  showSpread();
  flipping = false;
  if (queued) {
    const next = queued;
    queued = 0;
    turn(next);
  }
}

function openStory(story) {
  current = story;
  queued = 0;
  pages = buildPages(story);
  at = 0;
  sbook.style.setProperty('--c', (categoryLook[story.category] ?? { color: '#FF9D19' }).color);
  $('#sbook-title').textContent = story.title;
  showSpread();
  modal.showModal();
  chime(620, 0.2);
}

sNext.addEventListener('click', () => turn(1));
sPrev.addEventListener('click', () => turn(-1));

sbook.addEventListener('click', (e) => {
  if (e.target.closest('a')) return;
  if (e.target.closest('[data-action="restart"]')) {
    at = 0;
    showSpread();
    return;
  }
  if (e.target.closest('.sbook__page--left')) turn(-1);
  else if (e.target.closest('.sbook__page--right')) turn(1);
});

modal.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') turn(1);
  if (e.key === 'ArrowLeft') turn(-1);
});

onePageMode.addEventListener('change', () => {
  if (!current) return;
  pages = buildPages(current);
  at = Math.min(at - (at % step()), pages.length - 1);
  showSpread();
});

$('#modal-close').addEventListener('click', () => modal.close());
// Clicking the dimmed backdrop closes the preview too.
modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.close();
});


const books = stories.map((story, i) => {
  const look = categoryLook[story.category] ?? { color: '#FF9D19', emoji: '⭐' };
  const book = document.createElement('button');
  book.type = 'button';
  book.className = 'cbook';
  book.setAttribute('aria-label', `${story.title} (${story.category})`);
  book.style.setProperty('--c', look.color);
  book.style.setProperty('--tilt', `${[-2, 1.5, -1, 2, 0][i % 5]}deg`);
  book.innerHTML = `
    <span class="cbook__badge" aria-hidden="true">${look.emoji}</span>
    <span class="cbook__cover">
      <span class="cbook__art"><img src="${thumb(story.image, 300, 300)}" alt="" width="300" height="300" loading="lazy" decoding="async" /></span>
      <span class="cbook__title"><span>${story.title}</span></span>
    </span>`;
  book.addEventListener('click', () => openStory(story));
  return { book, story };
});

// Books are grouped into shelf rows in JS so every row gets its own full-width plank.
function booksPerRow() {
  const bookWidth = parseFloat(getComputedStyle(bookcaseEl).getPropertyValue('--bw')) + 22;
  const inner = bookcaseEl.clientWidth - 90;
  return Math.min(4, Math.max(2, Math.floor(inner / bookWidth)));
}

const SHELF_LIMIT = 8; // the website shows a taster; the full library is in the app
const moreEl = $('#more-stories');
let visibleBooks = books.slice(0, SHELF_LIMIT);
let lastPerRow = 0;

function layoutShelves(animate = true) {
  const perRow = booksPerRow();
  lastPerRow = perRow;
  bookcaseEl.replaceChildren();
  for (let i = 0; i < visibleBooks.length; i += perRow) {
    const row = document.createElement('div');
    row.className = 'shelf-row';
    visibleBooks.slice(i, i + perRow).forEach(({ book }, j) => {
      book.style.setProperty('--in', animate ? `${(i + j) * 0.04}s` : '0s');
      row.append(book);
    });
    bookcaseEl.append(row);
  }
  bookcaseEl.hidden = visibleBooks.length === 0;
}

function filterStories() {
  const q = searchEl.value.trim().toLowerCase();
  const matches = books.filter(
    ({ story }) =>
      (selectedCategory === 'All' || story.category === selectedCategory) &&
      (!q || story.title.toLowerCase().includes(q) || story.description.toLowerCase().includes(q)),
  );
  visibleBooks = matches.slice(0, SHELF_LIMIT);
  emptyEl.hidden = matches.length > 0;
  updateMore(matches.length - visibleBooks.length);
  layoutShelves();
}

new ResizeObserver(() => {
  if (booksPerRow() !== lastPerRow) layoutShelves(false);
}).observe(bookcaseEl);

function updateMore(extra) {
  moreEl.hidden = extra <= 0;
  moreEl.textContent = `+${extra} more ${extra === 1 ? 'story' : 'stories'} in the app →`;
}

updateMore(books.length - visibleBooks.length);
layoutShelves();

// Same order as the chips in the app.
for (const cat of ['All', 'Bedtime', 'Animals', 'Patience', 'Adventure', 'Friendship']) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'chip jelly';
  chip.textContent = cat;
  chip.setAttribute('aria-pressed', String(cat === selectedCategory));
  chip.addEventListener('click', () => {
    selectedCategory = cat;
    for (const c of chipsEl.children) c.setAttribute('aria-pressed', String(c === chip));
    filterStories();
  });
  chipsEl.append(chip);
}

searchEl.addEventListener('input', filterStories);

/* ---------- Polaroid screenshots ---------- */
const shots = [
  ['01-home', 'Home sweet home'],
  ['02-story-library', 'So many stories'],
  ['03-read-story', 'Once upon a time…'],
  ['04-favorites', 'Our favourites'],
  ['05-bedtime-stories', 'Bedtime picks'],
  ['06-bedtime-reading', 'Lights low'],
  ['07-standard-reading', 'Daytime reading'],
  ['08-splash', 'Hello, Tuck & Tales!'],
];
const polaroidsEl = $('#polaroids');
shots.forEach(([file, caption], i) => {
  const fig = document.createElement('figure');
  fig.className = 'polaroid';
  fig.style.setProperty('--tilt', `${i % 2 ? 3 : -3}deg`);
  fig.style.setProperty('--tape', `${i % 3 ? 4 : -5}deg`);
  fig.innerHTML = `<img src="${BASE}screens/${file}.webp" alt="${caption}" width="540" height="960" loading="lazy" /><figcaption>${caption}</figcaption>`;
  polaroidsEl.append(fig);
});

const scrollPolaroids = (dir) => polaroidsEl.scrollBy({ left: dir * 260, behavior: 'smooth' });
$('#pol-prev').addEventListener('click', () => scrollPolaroids(-1));
$('#pol-next').addEventListener('click', () => scrollPolaroids(1));

/* ---------- Cursor sparkle trail ---------- */
if (finePointer && !reduceMotion) {
  const colors = ['#FFD36B', '#FF9D19', '#FFB3C7', '#9CC9F5', '#FFFFFF'];
  let last = 0;
  window.addEventListener('pointermove', (e) => {
    const now = performance.now();
    if (now - last < 45) return;
    last = now;
    const sp = document.createElement('span');
    sp.className = 'sparkle';
    sp.style.left = `${e.clientX}px`;
    sp.style.top = `${e.clientY}px`;
    sp.style.setProperty('--c', colors[Math.floor(Math.random() * colors.length)]);
    document.body.append(sp);
    sp.addEventListener('animationend', () => sp.remove());
  });
}

$('#year').textContent = new Date().getFullYear();

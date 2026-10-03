const $ = (id) => document.getElementById(id);

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function toast(text) {
  const t = el('div', 'toast', text);
  document.body.append(t);
  setTimeout(() => t.remove(), 2500);
}

let me = null; // the logged-in user, or null when visiting without an account
let savingPinId = null;
let boards = [];
const query = new URLSearchParams(window.location.search).get('q') || '';
$('q').value = query;

/* ---------- who is visiting? ---------- */
async function getMe() {
  try {
    const res = await fetch('/api/auth/me');
    return res.ok ? await res.json() : null;
  } catch (e) {
    return null;
  }
}

function renderNav() {
  const box = $('navRight');
  box.innerHTML = '';

  const placeholder = (text) => {
    const a = el('a', 'nav-link hide-sm', text);
    a.href = '#';
    a.addEventListener('click', (e) => e.preventDefault());
    return a;
  };

  if (me) {
    const create = el('a', 'nav-link hide-sm', 'Create');
    create.href = '/dashboard.html#mypins';
    const saved = el('a', 'nav-link hide-sm', 'Saved');
    saved.href = '/dashboard.html#boards';
    const hi = el('span', 'nav-link hide-sm', 'Hi, ' + me.name);
    hi.style.cursor = 'default';
    const out = el('button', 'btn btn-gray', 'Log out');
    out.onclick = async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
    };
    box.append(create, saved, hi, out);
  } else {
    const create = el('a', 'nav-link hide-sm', 'Create');
    create.href = '/login.html';
    const login = el('a', 'btn btn-red', 'Log in');
    login.href = '/login.html';
    const signup = el('a', 'btn btn-gray', 'Sign up');
    signup.href = '/signup.html';
    box.append(placeholder('About'), placeholder('Businesses'), create, placeholder('News'), login, signup);
  }
}

/* ---------- pins feed (public) ---------- */
function buildPin(pin) {
  const card = el('div', 'pin');
  const wrap = el('div', 'imgwrap');

  const img = el('img');
  img.src = pin.imageUrl;
  img.alt = pin.title;
  img.loading = 'lazy';
  img.onerror = () => { img.onerror = null; img.src = 'https://picsum.photos/seed/fallback/400/500'; };

  const overlay = el('div', 'overlay');
  const save = el('button', 'save-btn', 'Save');
  save.onclick = () => (me ? openSave(pin._id) : openModal('loginModal')); // login needed to save
  overlay.append(save);

  wrap.append(img, overlay);
  card.append(wrap, el('div', 'title', pin.title));
  card.append(el('div', 'by', pin.user && pin.user.name ? pin.user.name : 'Pinterest'));
  return card;
}

async function loadPins() {
  const url = '/api/pins' + (query ? '?q=' + encodeURIComponent(query) : '');
  const grid = $('grid');
  grid.innerHTML = '';
  let pins = [];
  try {
    const res = await fetch(url);
    pins = await res.json();
  } catch (e) {
    $('status').textContent = 'Could not load pins. Check your connection.';
    return;
  }
  if (!Array.isArray(pins) || pins.length === 0) {
    $('status').textContent = query ? `No pins found for "${query}".` : 'No pins yet.';
    return;
  }
  $('status').textContent = query ? `Results for "${query}"` : '';
  pins.forEach((p) => grid.append(buildPin(p)));
}

$('searchForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = $('q').value.trim();
  window.location.href = '/explore.html' + (q ? '?q=' + encodeURIComponent(q) : '');
});

/* ---------- modals ---------- */
function openModal(id) { $(id).classList.remove('hidden'); }
function closeModals() { document.querySelectorAll('.modal-bg').forEach((m) => m.classList.add('hidden')); }
document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeModals));
document.querySelectorAll('.modal-bg').forEach((m) =>
  m.addEventListener('click', (e) => { if (e.target === m) closeModals(); })
);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModals(); });

/* ---------- save a pin to a board (logged-in users only) ---------- */
async function openSave(pinId) {
  savingPinId = pinId;
  $('saveMsg').textContent = '';
  $('saveMsg').className = 'msg';
  $('newBoard').value = '';

  const res = await fetch('/api/boards');
  if (res.status === 401) { me = null; renderNav(); openModal('loginModal'); return; }
  boards = res.ok ? await res.json() : [];

  const select = $('boardSelect');
  select.innerHTML = '';
  boards.forEach((b) => {
    const o = document.createElement('option');
    o.value = b._id;
    o.textContent = b.name;
    select.append(o);
  });
  select.classList.toggle('hidden', boards.length === 0);
  openModal('saveModal');
}

$('confirmSave').addEventListener('click', async () => {
  const msg = $('saveMsg');
  msg.className = 'msg';
  msg.textContent = '';
  let boardId = boards.length ? $('boardSelect').value : '';
  const newName = $('newBoard').value.trim();

  if (newName) {
    const r = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    const board = await r.json().catch(() => ({}));
    if (!r.ok) { msg.textContent = board.message || 'Could not create board'; return; }
    boardId = board._id;
  }
  if (!boardId) { msg.textContent = 'Choose a board or type a new board name'; return; }

  const res = await fetch(`/api/boards/${boardId}/pins/${savingPinId}`, { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { msg.textContent = data.message || 'Could not save'; return; }
  closeModals();
  toast(data.message || 'Saved');
});

/* ---------- start ---------- */
(async function init() {
  me = await getMe();
  renderNav();
  loadPins();
})();
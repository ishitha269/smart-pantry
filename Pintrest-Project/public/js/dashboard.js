const $ = (id) => document.getElementById(id);
let editingId = null;

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

// Talks to the backend. If the session has ended (401) it sends you to the login page.
async function api(url, method = 'GET', body) {
  const opts = { method, headers: {} };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  let data = null;
  try { data = await res.json(); } catch (e) {}
  if (res.status === 401) window.location.href = '/login.html';
  return { ok: res.ok, data };
}

/* ---------- one pin card ---------- */
// mode is 'mine' (edit + delete) or 'board' (remove from board)
function buildPin(pin, mode, boardId) {
  const card = el('div', 'pin');

  const wrap = el('div', 'imgwrap');
  const img = el('img');
  img.src = pin.imageUrl;
  img.alt = pin.title;
  img.onerror = () => { img.onerror = null; img.src = 'https://picsum.photos/seed/fallback/400/500'; };
  wrap.append(img);

  card.append(wrap, el('div', 'title', pin.title));
  if (pin.description) card.append(el('div', 'desc', pin.description));
  if (mode === 'board') card.append(el('div', 'by', pin.user && pin.user.name ? pin.user.name : 'Pinterest'));

  const actions = el('div', 'actions');
  if (mode === 'mine') {
    const edit = el('button', '', 'Edit');
    edit.onclick = () => startEdit(pin);
    const del = el('button', 'danger', 'Delete');
    del.onclick = () => deletePin(pin._id);
    actions.append(edit, del);
  } else {
    const rm = el('button', '', 'Remove');
    rm.onclick = () => removeFromBoard(boardId, pin._id);
    actions.append(rm);
  }
  card.append(actions);
  return card;
}

/* ---------- tabs ---------- */
function showTab(name) {
  ['mypins', 'boards'].forEach((t) => $('tab-' + t).classList.toggle('hidden', t !== name));
  document.querySelectorAll('.tabs .nav-link').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  history.replaceState(null, '', '#' + name);
  if (name === 'mypins') loadMyPins();
  if (name === 'boards') loadBoards();
}
document.querySelectorAll('.tabs .nav-link').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));

/* ---------- MY PINS (create, read, update, delete) ---------- */
async function loadMyPins() {
  const { data } = await api('/api/pins/mine');
  const grid = $('myPinsGrid');
  grid.innerHTML = '';
  if (!data || data.length === 0) {
    grid.append(el('p', 'empty', 'You have no pins yet. Create one above! Try the image URL https://picsum.photos/400/500'));
    return;
  }
  data.forEach((pin) => grid.append(buildPin(pin, 'mine')));
}

$('pinForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('pinMsg').textContent = '';
  const body = { title: $('title').value, imageUrl: $('imageUrl').value, description: $('description').value };
  const url = editingId ? `/api/pins/${editingId}` : '/api/pins';
  const method = editingId ? 'PUT' : 'POST';
  const { ok, data } = await api(url, method, body);
  if (!ok) { $('pinMsg').textContent = (data && data.message) || 'Error'; return; }
  resetForm();
  loadMyPins();
});

function startEdit(pin) {
  editingId = pin._id;
  $('title').value = pin.title;
  $('imageUrl').value = pin.imageUrl;
  $('description').value = pin.description || '';
  $('formTitle').textContent = 'Edit Pin';
  $('submitBtn').textContent = 'Update Pin';
  $('cancelBtn').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
  editingId = null;
  $('pinForm').reset();
  $('formTitle').textContent = 'Create a Pin';
  $('submitBtn').textContent = 'Save Pin';
  $('cancelBtn').classList.add('hidden');
}
$('cancelBtn').addEventListener('click', resetForm);

async function deletePin(id) {
  if (!confirm('Delete this pin?')) return;
  await api('/api/pins/' + id, 'DELETE');
  loadMyPins();
}

/* ---------- BOARDS ---------- */
async function loadBoards() {
  const { data } = await api('/api/boards');
  const boards = data || [];
  const list = $('boardsList');
  list.innerHTML = '';

  if (boards.length === 0) {
    list.append(el('p', 'empty', 'No boards yet. Create one above, then save pins to it from Explore.'));
    return;
  }

  boards.forEach((board) => {
    const box = el('div', 'board-box');

    const head = el('div', 'board-head');
    const title = el('h3', '', board.name);
    const pins = board.pins.filter(Boolean);
    title.append(el('span', '', `${pins.length} pin(s)`));
    const del = el('button', 'btn btn-gray', 'Delete board');
    del.onclick = () => deleteBoard(board._id);
    head.append(title, del);

    const grid = el('div', 'masonry');
    if (pins.length === 0) grid.append(el('p', 'empty', 'Nothing saved here yet. Go to Explore and click Save on a pin.'));
    else pins.forEach((pin) => grid.append(buildPin(pin, 'board', board._id)));

    box.append(head, grid);
    list.append(box);
  });
}

$('boardForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('boardMsg').textContent = '';
  const { ok, data } = await api('/api/boards', 'POST', { name: $('boardName').value });
  if (!ok) { $('boardMsg').textContent = (data && data.message) || 'Error'; return; }
  $('boardForm').reset();
  loadBoards();
});

async function deleteBoard(id) {
  if (!confirm('Delete this board? (The pins themselves are not deleted)')) return;
  await api('/api/boards/' + id, 'DELETE');
  loadBoards();
}

async function removeFromBoard(boardId, pinId) {
  await api(`/api/boards/${boardId}/pins/${pinId}`, 'DELETE');
  loadBoards();
}

/* ---------- logout + start ---------- */
$('logoutBtn').addEventListener('click', async () => {
  await api('/api/auth/logout', 'POST');
  window.location.href = '/';
});

(async function init() {
  const { ok, data } = await api('/api/auth/me');
  if (!ok) return; // api() already redirected to the login page
  $('welcome').textContent = 'Hi, ' + data.name;
  showTab(window.location.hash === '#boards' ? 'boards' : 'mypins');
})();
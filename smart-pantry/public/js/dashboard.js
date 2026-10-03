const CATEGORIES = ['Dairy', 'Vegetables', 'Fruits', 'Grains', 'Meat & Fish', 'Snacks', 'Beverages', 'Other'];
let items = [];
let editingId = null;
const filters = { status: 'all', category: 'all', q: '' };

/* ---------- date helpers (all dates are YYYY-MM-DD text) ---------- */
function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function parseDate(s) { return new Date(s + 'T00:00:00'); }
function fmtDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function addDays(s, n) { const d = parseDate(s); d.setDate(d.getDate() + n); return fmtDate(d); }
function daysLeft(item) { return Math.round((parseDate(item.expiryDate) - startOfToday()) / 86400000); }

// expired | soon (0-3 days) | fresh | consumed
function statusOf(item) {
  if (item.consumed) return 'consumed';
  const d = daysLeft(item);
  if (d < 0) return 'expired';
  if (d <= 3) return 'soon';
  return 'fresh';
}

function expiryText(item) {
  const d = daysLeft(item);
  if (d < 0) return `Expired ${-d} day(s) ago`;
  if (d === 0) return 'Expires today';
  if (d === 1) return 'Expires tomorrow';
  return `Expires in ${d} days`;
}

/* ---------- API ---------- */
async function loadItems() {
  const { data } = await api('/api/items');
  items = data || [];
  render();
}

async function update(id, changes, message) {
  const { ok, data } = await api('/api/items/' + id, 'PUT', changes);
  if (!ok) toast((data && data.message) || 'Error', true);
  else if (message) toast(message);
  loadItems();
}

async function remove(id) {
  if (!confirm('Remove this item from your pantry?')) return;
  await api('/api/items/' + id, 'DELETE');
  loadItems();
}

/* ---------- banner + stats ---------- */
function renderBanner() {
  const box = $('banner');
  box.innerHTML = '';
  const active = items.filter((i) => !i.consumed);
  const expired = active.filter((i) => statusOf(i) === 'expired');
  const soon = active.filter((i) => statusOf(i) === 'soon');

  if (expired.length) {
    const b = el('div', 'banner bad', `${expired.length} item(s) already expired: ${expired.map((i) => i.name).join(', ')}. Check and toss them.`);
    box.append(b);
  }
  if (soon.length) {
    const names = soon.map((i) => `${i.name} (${daysLeft(i) === 0 ? 'today' : daysLeft(i) + 'd'})`).join(', ');
    box.append(el('div', 'banner warn', `Use these within 3 days: ${names}`));
  }
  if (!expired.length && !soon.length) {
    box.append(el('div', 'banner good', active.length ? 'Nothing is about to expire. Your pantry is in good shape.' : 'Your pantry is empty. Add your first item on the left.'));
  }
}

function renderStats() {
  const count = (s) => items.filter((i) => statusOf(i) === s).length;
  const box = $('stats');
  box.innerHTML = '';
  [['Expired', count('expired'), 'bad'], ['Expiring soon', count('soon'), 'warn'], ['Fresh', count('fresh'), 'good'], ['Consumed', count('consumed'), 'gray']]
    .forEach(([label, n, cls]) => {
      const s = el('div', 'stat ' + cls);
      s.append(el('div', 'stat-n', String(n)), el('div', 'stat-l', label));
      box.append(s);
    });
}

/* ---------- filters ---------- */
function renderChips() {
  const chips = $('chips');
  chips.innerHTML = '';
  const defs = [['all', 'All'], ['expired', 'Expired'], ['soon', 'Expiring soon'], ['fresh', 'Fresh'], ['consumed', 'Consumed'], ['shopping', 'Shopping list']];
  defs.forEach(([key, label]) => {
    const n = key === 'all' ? items.length
      : key === 'shopping' ? items.filter((i) => i.onShoppingList).length
      : items.filter((i) => statusOf(i) === key).length;
    const b = el('button', 'tab' + (filters.status === key ? ' active' : ''), `${label} (${n})`);
    b.onclick = () => { filters.status = key; render(); };
    chips.append(b);
  });
}

function passesFilters(i) {
  if (filters.status === 'shopping') { if (!i.onShoppingList) return false; }
  else if (filters.status !== 'all' && statusOf(i) !== filters.status) return false;
  if (filters.category !== 'all' && i.category !== filters.category) return false;
  if (filters.q && !i.name.toLowerCase().includes(filters.q.toLowerCase())) return false;
  return true;
}

/* ---------- item card ---------- */
function itemCard(i) {
  const st = statusOf(i);
  const card = el('div', 'card item ' + st);

  const top = el('div', 'row between');
  top.append(el('h3', '', i.name), el('span', 'badge ' + ({ expired: 'bad', soon: 'warn', fresh: 'good', consumed: 'gray' }[st]),
    { expired: 'Expired', soon: 'Expiring soon', fresh: 'Fresh', consumed: 'Consumed' }[st]));
  card.append(top);
  card.append(el('p', 'muted', `${i.category} · ${i.quantity} ${i.unit}${i.onShoppingList ? ' · on shopping list' : ''}`));
  card.append(el('p', st === 'consumed' ? 'muted' : 'when', i.consumed ? 'Marked as consumed' : expiryText(i)));
  card.append(el('p', 'note', `Bought ${i.purchaseDate} · Expires ${i.expiryDate}`));

  const q = el('div', 'row');
  const minus = el('button', 'btn btn-sm btn-light', '−');
  minus.onclick = () => {
    const n = Math.max(0, i.quantity - 1);
    update(i._id, n === 0 ? { quantity: 0, consumed: true } : { quantity: n });
  };
  const plus = el('button', 'btn btn-sm btn-light', '+');
  plus.onclick = () => update(i._id, { quantity: i.quantity + 1 });
  q.append(el('span', 'note', 'Quantity'), minus, plus);
  card.append(q);

  const a = el('div', 'row');
  const c = el('button', 'btn btn-sm ' + (i.consumed ? 'btn-light' : 'btn-accent'), i.consumed ? 'Undo consumed' : 'Mark consumed');
  c.onclick = () => update(i._id, { consumed: !i.consumed });
  a.append(c);
  if (!i.consumed) {
    const e3 = el('button', 'btn btn-sm btn-light', 'Extend +3 days');
    e3.onclick = () => update(i._id, { expiryDate: addDays(i.expiryDate, 3) }, 'Expiry extended');
    const e7 = el('button', 'btn btn-sm btn-light', '+7 days');
    e7.onclick = () => update(i._id, { expiryDate: addDays(i.expiryDate, 7) }, 'Expiry extended');
    a.append(e3, e7);
  }
  card.append(a);

  const b = el('div', 'row');
  const s = el('button', 'btn btn-sm btn-light', i.onShoppingList ? 'Remove from shopping list' : 'Add to shopping list');
  s.onclick = () => update(i._id, { onShoppingList: !i.onShoppingList });
  const ed = el('button', 'btn btn-sm btn-light', 'Edit');
  ed.onclick = () => startEdit(i);
  const d = el('button', 'btn btn-sm btn-danger', 'Delete');
  d.onclick = () => remove(i._id);
  b.append(s, ed, d);
  card.append(b);
  return card;
}

/* ---------- list ---------- */
function renderList() {
  const list = $('list');
  list.innerHTML = '';
  const shown = items.filter(passesFilters);
  if (shown.length === 0) {
    list.append(el('p', 'empty', items.length ? 'No items match these filters.' : 'No items yet. Add one using the form.'));
    return;
  }
  const groups = [['expired', 'Expired'], ['soon', 'Expiring soon (within 3 days)'], ['fresh', 'Fresh'], ['consumed', 'Consumed']];
  groups.forEach(([key, title]) => {
    const part = shown.filter((i) => statusOf(i) === key).sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
    if (!part.length) return;
    list.append(el('h2', 'group-title', title));
    const grid = el('div', 'grid-cards');
    part.forEach((i) => grid.append(itemCard(i)));
    list.append(grid);
  });
}

function render() {
  renderBanner();
  renderStats();
  renderChips();
  renderList();
}

/* ---------- form (add + edit) ---------- */
function resetForm() {
  editingId = null;
  $('formTitle').textContent = 'Add an item';
  $('saveBtn').textContent = 'Add item';
  $('cancelBtn').classList.add('hidden');
  $('fName').value = '';
  $('fCategory').value = 'Other';
  $('fQty').value = 1;
  $('fUnit').value = 'pcs';
  $('fBought').value = fmtDate(startOfToday());
  $('fExpiry').value = '';
  $('formMsg').textContent = '';
}

function startEdit(i) {
  editingId = i._id;
  $('formTitle').textContent = 'Edit item';
  $('saveBtn').textContent = 'Save changes';
  $('cancelBtn').classList.remove('hidden');
  $('fName').value = i.name;
  $('fCategory').value = i.category;
  $('fQty').value = i.quantity;
  $('fUnit').value = i.unit;
  $('fBought').value = i.purchaseDate;
  $('fExpiry').value = i.expiryDate;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$('saveBtn').addEventListener('click', async () => {
  $('formMsg').textContent = '';
  const body = {
    name: $('fName').value, category: $('fCategory').value, quantity: $('fQty').value,
    unit: $('fUnit').value, purchaseDate: $('fBought').value, expiryDate: $('fExpiry').value,
  };
  const { ok, data } = editingId
    ? await api('/api/items/' + editingId, 'PUT', body)
    : await api('/api/items', 'POST', body);
  if (!ok) { $('formMsg').textContent = (data && data.message) || 'Error'; return; }
  toast(editingId ? 'Item updated' : 'Item added');
  resetForm();
  loadItems();
});
$('cancelBtn').addEventListener('click', resetForm);

/* ---------- other controls ---------- */
$('clearConsumed').addEventListener('click', async () => {
  if (!items.some((i) => i.consumed)) return toast('No consumed items to remove');
  if (!confirm('Delete all consumed items?')) return;
  const { data } = await api('/api/items/consumed/all', 'DELETE');
  toast((data && data.message) || 'Removed');
  loadItems();
});

$('search').addEventListener('input', (e) => { filters.q = e.target.value.trim(); renderList(); });
$('catFilter').addEventListener('change', (e) => { filters.category = e.target.value; renderList(); });

/* ---------- start ---------- */
(async function init() {
  const me = await loadMe();
  if (!me) return;
  CATEGORIES.forEach((c) => {
    const o = document.createElement('option'); o.value = c; o.textContent = c;
    $('fCategory').append(o);
  });
  $('catFilter').innerHTML = '<option value="all">All categories</option>';
  CATEGORIES.forEach((c) => {
    const o = document.createElement('option'); o.value = c; o.textContent = c;
    $('catFilter').append(o);
  });
  resetForm();
  loadItems();
})();

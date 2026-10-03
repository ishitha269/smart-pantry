# 🥫 Smart Pantry & Grocery Expiry Tracker: Full Step-by-Step Guide

A household inventory app that sorts groceries by expiry priority and warns you about food that needs using up.

**Stack:** Node.js + Express (backend), MongoDB Atlas + Mongoose (database), plain HTML/CSS/JavaScript (frontend), bcrypt + JWT cookie (login). Express serves both the pages and the API, so you deploy **one** project.

One kind of account. Every user only sees their own pantry.

## What this project does (CRUD)

| | What the user can do |
|---|---|
| **Create** | Add grocery items with category, quantity, purchase date and expiry date. |
| **Read** | Inventory grouped as Expired, Expiring soon (within 3 days), Fresh and Consumed, with filters. |
| **Update** | Mark consumed, change quantity, extend expiry by 3 or 7 days, edit details, flag for the shopping list. |
| **Delete** | Remove single items or clear all consumed items at once. |

**Unique edge:** **Colour-coded warning banners** for items expiring within 3 days, plus quick filters including a **Shopping list** filter.

> **Shortcut:** a ready-made copy of this whole project is included in the zip. If you only want to run it, unzip it, open the folder in VS Code, run `npm install`, create the `.env` file from Step 7 and run `npm run dev`. Follow the steps below if you want to build it file by file and understand each part.

---

## STEP 1: Install the things we need

On your laptop install:

1. **VS Code** from the official site (code.visualstudio.com). Install normally.
2. **Node.js (LTS version)** from nodejs.org. Install with the default settings.

---

## STEP 2: Check Node.js

Open Command Prompt or PowerShell and run:
```
node --version
npm --version
```
You should see version numbers (for example `v22.x.x` and `10.x.x`). If you do, you are ready.

---

## STEP 3: Create the project

Create a new folder, for example `Smart-Pantry` on your Desktop, and open that folder in VS Code. Then open **Terminal → New Terminal** and run:
```
npm init -y
```
A file called `package.json` appears.

---

## STEP 4: Install the backend packages

In the VS Code terminal run:
```
npm install express mongoose bcryptjs jsonwebtoken cookie-parser dotenv
```
Wait for it to finish, then install the development helper (it restarts the server automatically when you save a file):
```
npm install --save-dev nodemon
```

---

## STEP 5: Set up MongoDB Atlas

1. Go to **mongodb.com/atlas** and sign up or log in.
2. **Already made a cluster for another project? Reuse it.** You do not need a new cluster. Skip to point 5 and just use a new database name (`smartpantry`) in the connection string.
3. Otherwise create a **free cluster (M0)** in any region and create a **database user** (username + password). Use a password with only letters and numbers, because special characters break the connection string.
4. Go to **Network Access → Add IP Address → Allow access from anywhere (0.0.0.0/0)**. This is needed so your deployed site can connect later.
5. Go to **Database → Connect → Drivers** and copy the connection string, which looks like:
```
mongodb+srv://myuser:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
```
6. Replace `<password>` with your real password and add the database name `smartpantry` just before the `?`:
```
mongodb+srv://myuser:mypassword@cluster0.abcde.mongodb.net/smartpantry?retryWrites=true&w=majority
```
Atlas creates the database automatically the first time the app saves data.

---

## STEP 6: Create the folders and files

In the VS Code terminal run these one by one:
```
mkdir models
mkdir middleware
mkdir routes
mkdir public
mkdir public\css
mkdir public\js
```
Then create the empty files with right-click → **New File** in the Explorer. The final structure is:

```
Smart-Pantry/
├── middleware
│   └── auth.js
├── models
│   ├── Item.js
│   └── User.js
├── public
│   ├── css
│   │   └── style.css
│   ├── js
│   │   ├── auth.js
│   │   ├── common.js
│   │   └── dashboard.js
│   ├── dashboard.html
│   ├── index.html
│   ├── login.html
│   └── signup.html
├── routes
│   ├── auth.js
│   └── items.js
├── .env
├── .gitignore
├── package.json
└── server.js
```

---

## STEP 7: Config files

**`.env`** (create this file in the main folder. Use your own values and never share or upload this file):
```
MONGO_URI=mongodb+srv://myuser:mypassword@cluster0.abcde.mongodb.net/smartpantry?retryWrites=true&w=majority
JWT_SECRET=change_this_to_any_long_random_text_12345xyz
PORT=5000
```

**`.gitignore`** (stops your secrets and the huge `node_modules` folder going to GitHub):
```
node_modules
.env
```

**`package.json`**: open it and change **only** the `"scripts"` part to the following, then press **Ctrl + S** to save:
```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
},
```
Keep the commas correct: there is a comma after the `"start"` line but not after the `"dev"` line. Leave the `dependencies` part as it is.

---

## STEP 8: Backend code

Copy each block into the file named above it.

**`server.js`**
```js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
app.set('trust proxy', 1); // needed for secure cookies on Render

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/items', require('./routes/items'));

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => console.error('MongoDB connection error:', err.message));
```

**`models/Item.js`**
```js
const mongoose = require('mongoose');

const CATEGORIES = ['Dairy', 'Vegetables', 'Fruits', 'Grains', 'Meat & Fish', 'Snacks', 'Beverages', 'Other'];

const itemSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: CATEGORIES, default: 'Other' },
    quantity: { type: Number, default: 1, min: 0 },
    unit: { type: String, default: 'pcs', trim: true },
    purchaseDate: { type: String, required: true }, // YYYY-MM-DD
    expiryDate: { type: String, required: true }, // YYYY-MM-DD
    consumed: { type: Boolean, default: false },
    onShoppingList: { type: Boolean, default: false }, // "need to buy again"
  },
  { timestamps: true }
);

module.exports = mongoose.model('Item', itemSchema);
module.exports.CATEGORIES = CATEGORIES;
```

**`models/User.js`**
```js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // stored hashed, never plain text
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
```

**`middleware/auth.js`**
```js
const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: 'Not logged in' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired session' });
  }
};
```

**`routes/auth.js`** (sign up, log in, log out)
```js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

function setTokenCookie(res, userId) {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

// SIGN UP
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields are required' });
    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });

    setTokenCookie(res, user._id);
    res.status(201).json({ message: 'Account created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// LOG IN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid email or password' });

    setTokenCookie(res, user._id);
    res.json({ message: 'Logged in' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// LOG OUT
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

// WHO AM I
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.userId).select('-password');
  if (!user) return res.status(401).json({ message: 'User not found' });
  res.json(user);
});

module.exports = router;
```

**`routes/items.js`**
```js
const express = require('express');
const Item = require('../models/Item');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

const dateOk = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || '');

// READ: all my items (the page groups them into Expired / Expiring soon / Fresh)
router.get('/', async (req, res) => {
  try {
    const items = await Item.find({ user: req.userId }).sort({ expiryDate: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE
router.post('/', async (req, res) => {
  try {
    const { name, category, quantity, unit, purchaseDate, expiryDate } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ message: 'Item name is required' });
    if (!dateOk(purchaseDate) || !dateOk(expiryDate))
      return res.status(400).json({ message: 'Purchase and expiry dates are required' });
    if (expiryDate < purchaseDate)
      return res.status(400).json({ message: 'Expiry date cannot be before the purchase date' });

    const item = await Item.create({
      user: req.userId, name, category, quantity: Number(quantity) || 1, unit, purchaseDate, expiryDate,
    });
    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE all consumed items at once (must be above "/:id")
router.delete('/consumed/all', async (req, res) => {
  try {
    const result = await Item.deleteMany({ user: req.userId, consumed: true });
    res.json({ message: `${result.deletedCount} consumed item(s) removed` });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE: edit details, change quantity, mark consumed, extend expiry, toggle shopping list
router.put('/:id', async (req, res) => {
  try {
    const allowed = ['name', 'category', 'quantity', 'unit', 'purchaseDate', 'expiryDate', 'consumed', 'onShoppingList'];
    const changes = {};
    allowed.forEach((k) => {
      if (req.body && req.body[k] !== undefined) changes[k] = req.body[k];
    });
    if (changes.quantity !== undefined) changes.quantity = Math.max(0, Number(changes.quantity) || 0);
    if (changes.expiryDate !== undefined && !dateOk(changes.expiryDate))
      return res.status(400).json({ message: 'Invalid expiry date' });

    const item = await Item.findOneAndUpdate({ _id: req.params.id, user: req.userId }, changes, {
      new: true,
      runValidators: true,
    });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE one item
router.delete('/:id', async (req, res) => {
  try {
    const item = await Item.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
```

---

## STEP 9: Frontend code

**`public/css/style.css`**
```css
:root { --accent: #15803d; --accent-dark: #166534; }
.layout { display: grid; grid-template-columns: 320px 1fr; gap: 22px; align-items: start; }
aside { position: sticky; top: 84px; }
@media (max-width: 860px) { .layout { grid-template-columns: 1fr; } aside { position: static; } }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 16px; }
.stat { border-radius: 14px; padding: 12px 14px; }
.stat-n { font-size: 28px; font-weight: 800; }
.stat-l { font-size: 13px; font-weight: 600; }
.stat.bad { background: var(--bad-bg); color: var(--bad); }
.stat.warn { background: var(--warn-bg); color: var(--warn); }
.stat.good { background: var(--good-bg); color: var(--good); }
.stat.gray { background: #eceef3; color: #4b5563; }
.filters { margin-bottom: 8px; }
.group-title { margin: 22px 0 10px; }
.item { border-left: 6px solid var(--line); }
.item.expired { border-left-color: #dc2626; }
.item.soon { border-left-color: #f59e0b; }
.item.fresh { border-left-color: #16a34a; }
.item.consumed { border-left-color: #9ca3af; opacity: .75; }
.when { font-weight: 600; }
.item.expired .when { color: var(--bad); }
.item.soon .when { color: var(--warn); }
:root {
  --bg: #f6f7fb; --card: #ffffff; --text: #1c1f2a; --muted: #6b7280; --line: #e5e7eb;
  --good: #15803d; --good-bg: #dcfce7; --warn: #b45309; --warn-bg: #fef3c7;
  --bad: #b91c1c; --bad-bg: #fee2e2; --info: #1d4ed8; --info-bg: #dbeafe;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: "Segoe UI", system-ui, -apple-system, Arial, sans-serif; background: var(--bg); color: var(--text); line-height: 1.45; min-height: 100vh; }
a { color: inherit; text-decoration: none; }
h2 { font-size: 22px; margin-bottom: 12px; }
h3 { font-size: 18px; }
.hidden { display: none !important; }
.muted { color: var(--muted); font-size: 14px; }
.note { color: var(--muted); font-size: 13px; margin: 6px 0; }
.row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.between { justify-content: space-between; }
.empty { color: var(--muted); padding: 14px 0; }
.msg { color: var(--bad); min-height: 20px; margin-bottom: 8px; font-size: 14px; }

/* Navbar */
.navbar { display: flex; justify-content: space-between; align-items: center; padding: 14px 28px; background: var(--card); border-bottom: 1px solid var(--line); position: sticky; top: 0; z-index: 10; flex-wrap: wrap; gap: 10px; }
.brand { font-weight: 800; font-size: 22px; color: var(--accent); letter-spacing: -0.3px; }
.nav-right { display: flex; gap: 12px; align-items: center; }

/* Buttons */
.btn { padding: 10px 18px; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; display: inline-block; text-align: center; transition: background .15s; }
.btn-accent { background: var(--accent); color: #fff; }
.btn-accent:hover { background: var(--accent-dark); }
.btn-light { background: #eceef3; color: var(--text); }
.btn-light:hover { background: #dfe2ea; }
.btn-danger { background: var(--bad-bg); color: var(--bad); }
.btn-danger:hover { background: #fecaca; }
.btn-sm { padding: 6px 12px; font-size: 13px; border-radius: 10px; }
.btn-block { width: 100%; }
:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }

/* Layout */
.container { max-width: 1100px; margin: 0 auto; padding: 20px 20px 60px; }
.tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
.tab { padding: 10px 18px; border: 1px solid var(--line); background: var(--card); border-radius: 999px; font-size: 15px; font-weight: 600; cursor: pointer; }
.tab.active { background: var(--text); color: #fff; border-color: var(--text); }
.grid-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 16px; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 18px; margin-bottom: 0; }
.card > * + * { margin-top: 8px; }
.card .row { margin-top: 10px; }
.stack > * + * { margin-top: 16px; }

/* Forms */
input, select, textarea { width: 100%; padding: 11px 12px; border: 1.5px solid #d1d5db; border-radius: 10px; font-size: 15px; background: #fff; font-family: inherit; }
input:focus, select:focus, textarea:focus { outline: none; border-color: var(--accent); }
label { display: block; font-size: 13px; font-weight: 600; color: var(--muted); margin: 10px 0 4px; }
.form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
.form-card input, .form-card select { margin-bottom: 4px; }

/* Badges & banners */
.badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
.badge.good { background: var(--good-bg); color: var(--good); }
.badge.warn { background: var(--warn-bg); color: var(--warn); }
.badge.bad { background: var(--bad-bg); color: var(--bad); }
.badge.info { background: var(--info-bg); color: var(--info); }
.badge.gray { background: #eceef3; color: #4b5563; }
.banner { padding: 14px 18px; border-radius: 14px; font-weight: 600; margin-bottom: 18px; }
.banner.good { background: var(--good-bg); color: var(--good); }
.banner.warn { background: var(--warn-bg); color: var(--warn); }
.banner.bad { background: var(--bad-bg); color: var(--bad); }

/* Toast */
.toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #111827; color: #fff; padding: 12px 20px; border-radius: 12px; z-index: 100; font-size: 15px; max-width: 90vw; }
.toast-error { background: var(--bad); }

/* Auth pages */
.auth-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
.auth-card { background: var(--card); width: 100%; max-width: 400px; padding: 32px; border-radius: 22px; border: 1px solid var(--line); text-align: center; }
.auth-card h2 { margin: 12px 0 16px; }
.auth-card input, .auth-card select { margin-bottom: 12px; }
.switch { margin-top: 16px; font-size: 14px; color: var(--muted); }
.switch a { color: var(--accent); font-weight: 700; }

/* Landing page */
.hero { text-align: center; padding: 70px 20px 40px; max-width: 760px; margin: 0 auto; }
.hero h1 { font-size: 46px; line-height: 1.1; margin-bottom: 14px; letter-spacing: -1px; }
.hero p { font-size: 19px; color: var(--muted); margin-bottom: 26px; }
.features { max-width: 1000px; margin: 20px auto 60px; padding: 0 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
.features .card h3 { margin-bottom: 4px; }
@media (max-width: 600px) { .hero h1 { font-size: 32px; } }
```

**`public/index.html`** (landing page)
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Smart Pantry - Waste less food</title>
  <link rel="stylesheet" href="/css/style.css" />
</head>
<body>
  <nav class="navbar">
    <a href="/" class="brand">🥫 Smart Pantry</a>
    <div class="nav-right">
      <a href="/login.html" class="btn btn-light">Log in</a>
      <a href="/signup.html" class="btn btn-accent">Sign up</a>
    </div>
  </nav>

  <section class="hero">
    <h1>Know what is about to expire before it goes in the bin.</h1>
    <p>Log your groceries once. Smart Pantry sorts them by expiry and warns you about anything that needs eating in the next 3 days.</p>
    <a href="/signup.html" class="btn btn-accent">Open my pantry</a>
  </section>

  <section class="features">
    <div class="card"><h3>Expiry priority</h3><p class="muted">Items are grouped as Expired, Expiring soon and Fresh.</p></div>
    <div class="card"><h3>Warning banner</h3><p class="muted">A colour-coded banner for anything expiring within 3 days.</p></div>
    <div class="card"><h3>Quick updates</h3><p class="muted">Change quantity, mark consumed or extend an expiry in one tap.</p></div>
    <div class="card"><h3>Shopping list</h3><p class="muted">Flag items to buy again and filter to see just those.</p></div>
  </section>
</body>
</html>
```

**`public/signup.html`** (sign up page)
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign up - Smart Pantry</title>
  <link rel="stylesheet" href="/css/style.css" />
</head>
<body>
  <div class="auth-wrap">
    <div class="auth-card">
      <a href="/" class="brand">🥫 Smart Pantry</a>
      <h2>Create your account</h2>
      <p class="msg" id="msg"></p>
      <form data-url="/api/auth/signup">
        <input type="text" name="name" placeholder="Name" required />
        <input type="email" name="email" placeholder="Email" required />
        <input type="password" name="password" placeholder="Password (min 6 characters)" required />
        <button type="submit" class="btn btn-accent btn-block">Sign up</button>
      </form>
      <p class="switch">Already have an account? <a href="/login.html">Log in</a></p>
    </div>
  </div>
  <script src="/js/auth.js"></script>
</body>
</html>
```

**`public/login.html`** (log in page)
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Log in - Smart Pantry</title>
  <link rel="stylesheet" href="/css/style.css" />
</head>
<body>
  <div class="auth-wrap">
    <div class="auth-card">
      <a href="/" class="brand">🥫 Smart Pantry</a>
      <h2>Welcome back</h2>
      <p class="msg" id="msg"></p>
      <form data-url="/api/auth/login">
        <input type="email" name="email" placeholder="Email" required />
        <input type="password" name="password" placeholder="Password" required />
        <button type="submit" class="btn btn-accent btn-block">Log in</button>
      </form>
      <p class="switch">New here? <a href="/signup.html">Create an account</a></p>
    </div>
  </div>
  <script src="/js/auth.js"></script>
</body>
</html>
```

**`public/js/auth.js`** (used by the sign up and log in pages)
```js
// Used by login.html and signup.html. Sends every named input in the form to the URL in data-url.
const msg = document.getElementById('msg');
const form = document.querySelector('form');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = '';
  const body = Object.fromEntries(new FormData(form));
  try {
    const res = await fetch(form.dataset.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      msg.textContent = data.message || 'Something went wrong';
      return;
    }
    window.location.href = '/dashboard.html';
  } catch (err) {
    msg.textContent = 'Network error, try again';
  }
});
```

**`public/js/common.js`** (small helpers used by the dashboard)
```js
// Small helpers shared by every dashboard page
const $ = (id) => document.getElementById(id);

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function toast(text, isError) {
  const t = el('div', 'toast' + (isError ? ' toast-error' : ''), text);
  document.body.append(t);
  setTimeout(() => t.remove(), 2800);
}

async function api(url, method = 'GET', body) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(url, opts);
  } catch (e) {
    toast('Network error, try again', true);
    return { ok: false, data: null };
  }
  let data = null;
  try { data = await res.json(); } catch (e) {}
  if (res.status === 401) {
    window.location.href = '/login.html';
    return { ok: false, data };
  }
  return { ok: res.ok, data };
}

// Builds a row of tabs inside <div id="tabs">. Returns a function to switch tabs.
function makeTabs(list, onSelect) {
  const box = $('tabs');
  box.innerHTML = '';
  list.forEach(([key, label]) => {
    const b = el('button', 'tab', label);
    b.dataset.key = key;
    b.onclick = () => select(key);
    box.append(b);
  });
  function select(key) {
    box.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.key === key));
    onSelect(key);
  }
  return select;
}

async function loadMe() {
  const { ok, data } = await api('/api/auth/me');
  if (!ok) return null;
  if ($('welcome')) $('welcome').textContent = 'Hi, ' + data.name;
  return data;
}

if ($('logoutBtn')) {
  $('logoutBtn').addEventListener('click', async () => {
    await api('/api/auth/logout', 'POST');
    window.location.href = '/';
  });
}
```

**`public/dashboard.html`** (the main page after login)
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Pantry - Smart Pantry</title>
  <link rel="stylesheet" href="/css/style.css" />
</head>
<body>
  <nav class="navbar">
    <a href="/" class="brand">🥫 Smart Pantry</a>
    <div class="nav-right">
      <span id="welcome" class="muted"></span>
      <button class="btn btn-light" id="logoutBtn">Log out</button>
    </div>
  </nav>

  <div class="container">
    <div id="banner"></div>

    <div class="layout">
      <aside>
        <div class="card form-card">
          <h3 id="formTitle">Add an item</h3>
          <p class="msg" id="formMsg"></p>
          <label>Name</label>
          <input id="fName" placeholder="e.g. Milk" />
          <div class="form-row">
            <div><label>Category</label><select id="fCategory"></select></div>
            <div><label>Quantity</label><input id="fQty" type="number" min="0" value="1" /></div>
          </div>
          <label>Unit</label>
          <select id="fUnit">
            <option>pcs</option><option>kg</option><option>g</option><option>L</option><option>ml</option><option>pack</option>
          </select>
          <div class="form-row">
            <div><label>Purchased</label><input id="fBought" type="date" /></div>
            <div><label>Expires</label><input id="fExpiry" type="date" /></div>
          </div>
          <div class="row">
            <button class="btn btn-accent" id="saveBtn">Add item</button>
            <button class="btn btn-light hidden" id="cancelBtn">Cancel</button>
          </div>
        </div>
      </aside>

      <main>
        <div id="stats" class="stats"></div>
        <div class="row filters">
          <div id="chips" class="row"></div>
          <select id="catFilter" style="max-width:180px"></select>
          <input id="search" placeholder="Search items" style="max-width:200px" />
          <button class="btn btn-sm btn-light" id="clearConsumed">Remove all consumed</button>
        </div>
        <div id="list"></div>
      </main>
    </div>
  </div>

  <script src="/js/common.js"></script>
  <script src="/js/dashboard.js"></script>
</body>
</html>
```

**`public/js/dashboard.js`** (all the dashboard behaviour)
```js
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
```

---

## STEP 10: Run it locally and test

In the VS Code terminal run:
```
npm run dev
```
You should see:
```
MongoDB connected
Server running on http://localhost:5000
```
Open **http://localhost:5000** in your browser.

**Test checklist:**

1. Sign up and open the dashboard. The banner says your pantry is empty.
2. Add 4 items: **Old Bread** (purchased 5 days ago, expired yesterday), **Milk** (expires tomorrow), **Curd** (expires in 2 days) and **Rice** (expires in 6 months).
3. The banner now shows a **red** expired warning and an **orange** "use within 3 days" warning. Items are grouped as Expired, Expiring soon and Fresh, with coloured left borders.
4. On **Milk** click **Extend +3 days**. Its status changes.
5. Click **Mark consumed** on Old Bread, then use the **Consumed** chip and **Remove all consumed**.
6. Use the **− / +** buttons for quantity. Taking quantity to 0 marks the item consumed.
7. Click **Add to shopping list** on Rice, then click the **Shopping list** chip to filter.
8. Try the category filter and search box. In Atlas, check the `users` and `items` collections.

**If something fails:**

- `Missing script: "dev"` means the `"scripts"` edit in Step 7 was not saved. Fix it and press Ctrl + S.
- `MongoDB connection error: bad auth` means the username or password in `.env` is wrong.
- `ENOTFOUND`, `ECONNREFUSED` or a timeout means Atlas Network Access (0.0.0.0/0) is not set.
- `Cannot find module ...` means a file is missing, in the wrong folder, or named differently. Compare with the structure in Step 6. If it names a package, run `npm install`.
- Changes not showing in the browser: hard refresh with **Ctrl + Shift + R**.

---

## STEP 11: Put the code on GitHub

1. Install **Git** from git-scm.com and create an account at github.com.
2. On GitHub click **New repository**, name it `smart-pantry` and keep it empty.
3. In the VS Code terminal:
```
git init
git add .
git commit -m "Smart Pantry & Grocery Expiry Tracker"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/smart-pantry.git
git push -u origin main
```
Check on GitHub that `.env` and `node_modules` were **not** uploaded.

---

## STEP 12: Deploy on Render (free)

1. Go to **render.com** and sign up with GitHub.
2. Click **New → Web Service** and select your `smart-pantry` repository.
3. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance type:** Free
4. Under **Environment Variables** add:
   - `MONGO_URI` = your Atlas connection string
   - `JWT_SECRET` = your secret text
   - `NODE_ENV` = `production`
5. Click **Deploy**. After a few minutes you get a public link like `https://smart-pantry-xxxx.onrender.com`.

The free plan sleeps when idle, so the first load can take about 50 seconds. Repeat the test checklist on the live link.

---

## What to submit

- The **Render link** (live site)
- The **GitHub repository link**

This covers: working sign up and log in, hashed passwords, a real database, a full CRUD feature, and public deployment.

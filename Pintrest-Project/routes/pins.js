const express = require('express');
const Pin = require('../models/Pin');
const Board = require('../models/Board');
const auth = require('../middleware/auth');

const router = express.Router();
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* ---------- PUBLIC (no login needed) ---------- */

// EXPLORE: all pins from everyone. Optional search: /api/pins?q=cozy
router.get('/', async (req, res) => {
  try {
    const filter = {};
    const q = String(req.query.q || '').trim();
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ title: rx }, { description: rx }];
    }
    const pins = await Pin.find(filter).sort({ createdAt: -1 }).limit(100).populate('user', 'name');
    res.json(pins);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ---------- LOGIN REQUIRED (everything below) ---------- */
router.use(auth);

// MY PINS
router.get('/mine', async (req, res) => {
  try {
    const pins = await Pin.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json(pins);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE
router.post('/', async (req, res) => {
  try {
    const { title, imageUrl, description } = req.body || {};
    if (!title || !imageUrl) return res.status(400).json({ message: 'Title and image URL are required' });
    const pin = await Pin.create({ user: req.userId, title, imageUrl, description });
    res.status(201).json(pin);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE (only your own pin)
router.put('/:id', async (req, res) => {
  try {
    const { title, imageUrl, description } = req.body || {};
    const pin = await Pin.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { title, imageUrl, description },
      { new: true }
    );
    if (!pin) return res.status(404).json({ message: 'Pin not found' });
    res.json(pin);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE (only your own pin) and remove it from every board
router.delete('/:id', async (req, res) => {
  try {
    const pin = await Pin.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!pin) return res.status(404).json({ message: 'Pin not found' });
    await Board.updateMany({}, { $pull: { pins: pin._id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
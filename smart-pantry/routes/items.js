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

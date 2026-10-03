const express = require('express');
const Board = require('../models/Board');
const Pin = require('../models/Pin');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// GET all my boards, with their saved pins
router.get('/', async (req, res) => {
  try {
    const boards = await Board.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .populate({ path: 'pins', populate: { path: 'user', select: 'name' } });
    res.json(boards);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE a board
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim())
      return res.status(400).json({ message: 'Board name is required' });

    const board = await Board.create({ user: req.userId, name });
    res.status(201).json(board);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE a board
router.delete('/:id', async (req, res) => {
  try {
    const board = await Board.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!board) return res.status(404).json({ message: 'Board not found' });
    res.json({ message: 'Board deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// SAVE a pin to a board
router.post('/:id/pins/:pinId', async (req, res) => {
  try {
    const pin = await Pin.findById(req.params.pinId);
    if (!pin) return res.status(404).json({ message: 'Pin not found' });

    const board = await Board.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $addToSet: { pins: pin._id } }, // addToSet avoids duplicates
      { new: true }
    );
    if (!board) return res.status(404).json({ message: 'Board not found' });
    res.json({ message: 'Saved to ' + board.name });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// REMOVE a pin from a board
router.delete('/:id/pins/:pinId', async (req, res) => {
  try {
    const board = await Board.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $pull: { pins: req.params.pinId } },
      { new: true }
    );
    if (!board) return res.status(404).json({ message: 'Board not found' });
    res.json({ message: 'Removed from board' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
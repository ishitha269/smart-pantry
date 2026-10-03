const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    pins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pin' }], // saved pins
  },
  { timestamps: true }
);

module.exports = mongoose.model('Board', boardSchema);
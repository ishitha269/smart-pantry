const mongoose = require('mongoose');

const pinSchema = new mongoose.Schema(
  {
    // user is optional so the sample pins (added automatically) can exist without an owner
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    title: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Pin', pinSchema);
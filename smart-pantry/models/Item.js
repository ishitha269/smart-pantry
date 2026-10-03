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

const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    receiptId: { type: String, required: true }, // e.g., receipt_123456
    date: { type: Date, default: Date.now },
    method: { type: String, enum: ['cash', 'card', 'mobile'], required: true },
    cashier: { type: String, required: true },
    salesman: String,
    total: { type: Number, required: true },
    items: [{
        code: String,
        name: String,
        qty: Number,
        price: Number,
        discount: {
            type: { type: String, enum: ['none', 'percent', 'value'], default: 'none' },
            value: Number
        },
        cost: Number
    }],
    status: { type: String, default: 'finished' }
});

saleSchema.index({ tenantId: 1, date: -1 });

module.exports = mongoose.model('Sale', saleSchema);

const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    receiptId: { type: String, required: true }, // e.g., receipt_123456
    shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },
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
        cost: Number,
        returnedQty: { type: Number, default: 0 } // Track returned quantity per item
    }],
    status: { type: String, default: 'finished' }, // finished, returned, partial_returned
    returns: [{
        date: { type: Date, default: Date.now },
        items: [{
            code: String,
            qty: Number,
            refundAmount: Number
        }],
        totalRefund: Number,
        cashier: String
    }]
});

saleSchema.index({ tenantId: 1, date: -1 });

module.exports = mongoose.model('Sale', saleSchema);

const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    cashier: { type: String, required: true },
    startTime: { type: Date, default: Date.now },
    endTime: Date,
    startCash: { type: Number, required: true },
    endCash: Number, // Expected cash
    actualCash: Number, // Counted cash
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    transactions: [{
        type: { type: String, enum: ['in', 'out'], required: true },
        amount: { type: Number, required: true },
        reason: String,
        time: { type: Date, default: Date.now }
    }]
});

shiftSchema.index({ tenantId: 1, status: 1 });

module.exports = mongoose.model('Shift', shiftSchema);

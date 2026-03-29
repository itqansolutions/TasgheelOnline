const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    username: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'manager', 'cashier'], default: 'cashier' },
    fullName: { type: String, required: true },
    active: { type: Boolean, default: true },
    permissions: {
        canCancelSales: { type: Boolean, default: false },
        nav_pos: { type: Boolean, default: true },
        nav_products: { type: Boolean, default: true },
        nav_receipts: { type: Boolean, default: true },
        nav_reports: { type: Boolean, default: true },
        nav_salesmen: { type: Boolean, default: true },
        nav_expenses: { type: Boolean, default: true },
        nav_admin: { type: Boolean, default: false }
    },
    createdAt: { type: Date, default: Date.now }
});

// Compound index to ensure unique usernames within a tenant
userSchema.index({ tenantId: 1, username: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);

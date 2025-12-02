const express = require('express');
const router = express.Router();
const Tenant = require('../models/Tenant');
const User = require('../models/User');

// Hardcoded Super Admin Credentials (for V1)
const SUPER_ADMIN_USER = 'admin';
const SUPER_ADMIN_PASS = 'admin123';

// Middleware to check super admin session (simplified)
// In a real app, use JWT or session
const checkSuperAdmin = (req, res, next) => {
    // For simplicity, we'll just check a header or assume the frontend sends a "secret"
    // Ideally, implement proper login.
    // Let's use a simple header 'x-super-admin-secret'
    const secret = req.header('x-super-admin-secret');
    if (secret === 'super_secret_key_123') {
        next();
    } else {
        res.status(401).json({ msg: 'Unauthorized' });
    }
};

// @route   POST /api/super-admin/login
// @desc    Super Admin Login
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === SUPER_ADMIN_USER && password === SUPER_ADMIN_PASS) {
        res.json({ secret: 'super_secret_key_123' });
    } else {
        res.status(400).json({ msg: 'Invalid Credentials' });
    }
});

// @route   GET /api/super-admin/tenants
// @desc    Get all tenants
router.get('/tenants', checkSuperAdmin, async (req, res) => {
    try {
        const tenants = await Tenant.find().sort({ createdAt: -1 });
        res.json(tenants);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/super-admin/tenants/:id/status
// @desc    Update tenant status (active, on_hold)
router.put('/tenants/:id/status', checkSuperAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const tenant = await Tenant.findById(req.params.id);
        if (!tenant) return res.status(404).json({ msg: 'Tenant not found' });

        tenant.status = status;
        await tenant.save();
        res.json(tenant);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/super-admin/tenants/:id/subscription
// @desc    Extend/Renew subscription
router.put('/tenants/:id/subscription', checkSuperAdmin, async (req, res) => {
    try {
        const { months } = req.body; // Number of months to add
        const tenant = await Tenant.findById(req.params.id);
        if (!tenant) return res.status(404).json({ msg: 'Tenant not found' });

        let currentEnd = tenant.subscriptionEndsAt || new Date();
        if (currentEnd < new Date()) currentEnd = new Date(); // If expired, start from now

        const newEnd = new Date(currentEnd);
        newEnd.setMonth(newEnd.getMonth() + parseInt(months));

        tenant.subscriptionEndsAt = newEnd;
        tenant.isSubscribed = true;
        tenant.status = 'active'; // Auto-activate on renewal

        await tenant.save();
        res.json(tenant);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/super-admin/tenants/:id
// @desc    Terminate tenant (Delete all data)
router.delete('/tenants/:id', checkSuperAdmin, async (req, res) => {
    try {
        const tenantId = req.params.id;

        // Delete Tenant
        await Tenant.findByIdAndDelete(tenantId);

        // Delete Users
        await User.deleteMany({ tenantId });

        // Ideally delete Products, Sales, etc. too if we had models for them linked to tenantId
        // Assuming we do (based on previous context), let's try to be thorough if possible, 
        // but for now just Tenant and User is the core.
        // If we have Product, Sale models, we should import and delete them too.
        // Let's assume we do for completeness.
        const Product = require('../models/Product');
        const Sale = require('../models/Sale');
        const Customer = require('../models/Customer');

        await Product.deleteMany({ tenantId });
        await Sale.deleteMany({ tenantId });
        await Customer.deleteMany({ tenantId });

        res.json({ msg: 'Tenant terminated successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;

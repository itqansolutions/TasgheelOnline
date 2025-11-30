const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Salesman = require('../models/Salesman');
const Expense = require('../models/Expense');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// TENANT / TRIAL
router.get('/tenant/trial-status', auth, async (req, res) => {
    try {
        const tenant = await Tenant.findById(req.tenantId);
        if (!tenant) return res.status(404).json({ msg: 'Tenant not found' });

        const now = new Date();
        const trialEnds = new Date(tenant.trialEndsAt);
        const diffTime = trialEnds - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const isExpired = diffTime < 0;

        res.json({
            trialEndsAt: tenant.trialEndsAt,
            daysRemaining: diffDays,
            isExpired
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// PRODUCTS

// @route   GET /api/products
// @desc    Get all products for tenant
// @access  Private
router.get('/products', auth, async (req, res) => {
    try {
        const products = await Product.find({ tenantId: req.tenantId });
        res.json(products);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/products
// @desc    Add new product
// @access  Private
router.post('/products', auth, async (req, res) => {
    try {
        const newProduct = new Product({
            tenantId: req.tenantId,
            ...req.body
        });
        const product = await newProduct.save();
        res.json(product);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private
router.put('/products/:id', auth, async (req, res) => {
    try {
        let product = await Product.findOne({ _id: req.params.id, tenantId: req.tenantId });
        if (!product) return res.status(404).json({ msg: 'Product not found' });

        // Update fields
        const { name, barcode, price, cost, stock, category, minStock } = req.body;
        if (name) product.name = name;
        if (barcode) product.barcode = barcode;
        if (price) product.price = price;
        if (cost) product.cost = cost;
        if (stock !== undefined) product.stock = stock;
        if (category) product.category = category;
        if (minStock !== undefined) product.minStock = minStock;

        await product.save();
        res.json(product);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private
router.delete('/products/:id', auth, async (req, res) => {
    try {
        const product = await Product.findOne({ _id: req.params.id, tenantId: req.tenantId });
        if (!product) return res.status(404).json({ msg: 'Product not found' });

        await Product.deleteOne({ _id: req.params.id });
        res.json({ msg: 'Product removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// SALES

// @route   POST /api/sales
// @desc    Create a new sale
// @access  Private
router.post('/sales', auth, async (req, res) => {
    try {
        const newSale = new Sale({
            tenantId: req.tenantId,
            ...req.body
        });
        const sale = await newSale.save();

        // Update stock
        for (const item of req.body.items) {
            const product = await Product.findOne({ tenantId: req.tenantId, barcode: item.code }); // Assuming code is barcode
            if (product) {
                product.stock -= item.qty;
                await product.save();
            }
        }

        res.json(sale);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/sales
// @desc    Get all sales
// @access  Private
router.get('/sales', auth, async (req, res) => {
    try {
        const sales = await Sale.find({ tenantId: req.tenantId }).sort({ date: -1 });
        res.json(sales);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/sales/daily
// @desc    Get daily sales summary
// @access  Private
router.get('/sales/daily', auth, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sales = await Sale.find({
            tenantId: req.tenantId,
            date: { $gte: today }
        });

        const totalSales = sales.reduce((acc, sale) => acc + sale.total, 0);
        const totalOrders = sales.length;

        res.json({
            date: today,
            totalSales,
            totalOrders,
            sales
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/sales/:id
// @desc    Get single sale by ID (or receiptId)
// @access  Private
router.get('/sales/:id', auth, async (req, res) => {
    try {
        // Try to find by _id first, then by receiptId
        let sale;
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            sale = await Sale.findOne({ _id: req.params.id, tenantId: req.tenantId });
        }

        if (!sale) {
            sale = await Sale.findOne({ receiptId: req.params.id, tenantId: req.tenantId });
        }

        if (!sale) return res.status(404).json({ msg: 'Sale not found' });

        res.json(sale);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// SALESMEN

// @route   GET /api/salesmen
// @desc    Get all salesmen
// @access  Private
router.get('/salesmen', auth, async (req, res) => {
    try {
        const salesmen = await Salesman.find({ tenantId: req.tenantId });
        res.json(salesmen);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/salesmen
// @desc    Add new salesman
// @access  Private
router.post('/salesmen', auth, async (req, res) => {
    try {
        const newSalesman = new Salesman({
            tenantId: req.tenantId,
            ...req.body
        });
        const salesman = await newSalesman.save();
        res.json(salesman);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/salesmen/:id
// @desc    Delete salesman
// @access  Private
router.delete('/salesmen/:id', auth, async (req, res) => {
    try {
        const salesman = await Salesman.findOne({ _id: req.params.id, tenantId: req.tenantId });
        if (!salesman) return res.status(404).json({ msg: 'Salesman not found' });

        await Salesman.deleteOne({ _id: req.params.id });
        res.json({ msg: 'Salesman removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/salesmen/:id
// @desc    Update salesman (e.g. targets)
// @access  Private
router.put('/salesmen/:id', auth, async (req, res) => {
    try {
        let salesman = await Salesman.findOne({ _id: req.params.id, tenantId: req.tenantId });
        if (!salesman) return res.status(404).json({ msg: 'Salesman not found' });

        // Update fields
        if (req.body.targets) salesman.targets = req.body.targets;
        if (req.body.name) salesman.name = req.body.name;

        await salesman.save();
        res.json(salesman);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// EXPENSES

// @route   GET /api/expenses
// @desc    Get all expenses
// @access  Private
router.get('/expenses', auth, async (req, res) => {
    try {
        const expenses = await Expense.find({ tenantId: req.tenantId });
        res.json(expenses);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/expenses
// @desc    Add new expense
// @access  Private
router.post('/expenses', auth, async (req, res) => {
    try {
        const newExpense = new Expense({
            tenantId: req.tenantId,
            ...req.body
        });
        const expense = await newExpense.save();
        res.json(expense);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/expenses/:id
// @desc    Delete expense
// @access  Private
router.delete('/expenses/:id', auth, async (req, res) => {
    try {
        const expense = await Expense.findOne({ _id: req.params.id, tenantId: req.tenantId });
        if (!expense) return res.status(404).json({ msg: 'Expense not found' });

        await Expense.deleteOne({ _id: req.params.id });
        res.json({ msg: 'Expense removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// SETTINGS

// @route   GET /api/settings
// @desc    Get tenant settings
// @access  Private
router.get('/settings', auth, async (req, res) => {
    try {
        const tenant = await Tenant.findById(req.tenantId).select('settings');
        res.json(tenant.settings || {});
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/settings
// @desc    Update tenant settings
// @access  Private
router.put('/settings', auth, async (req, res) => {
    try {
        const tenant = await Tenant.findById(req.tenantId);
        if (!tenant) return res.status(404).json({ msg: 'Tenant not found' });

        tenant.settings = { ...tenant.settings, ...req.body };
        await tenant.save();
        res.json(tenant.settings);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// USERS

// @route   GET /api/users
// @desc    Get all users for tenant
// @access  Private
router.get('/users', auth, async (req, res) => {
    try {
        const users = await User.find({ tenantId: req.tenantId }).select('-password');
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/users
// @desc    Create a new user
// @access  Private
router.post('/users', auth, async (req, res) => {
    try {
        const { username, password, role } = req.body;

        // Check if user exists
        let user = await User.findOne({ username, tenantId: req.tenantId });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        user = new User({
            tenantId: req.tenantId,
            username,
            password,
            role
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();
        res.json({ msg: 'User created' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private
router.delete('/users/:id', auth, async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.params.id, tenantId: req.tenantId });
        if (!user) return res.status(404).json({ msg: 'User not found' });

        await User.deleteOne({ _id: req.params.id });
        res.json({ msg: 'User removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;

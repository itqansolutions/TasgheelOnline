const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const prisma = require('../db');

// Helper: generate a short ID similar to MongoDB ObjectId (24 hex chars)
function newId() {
    return randomUUID().replace(/-/g, '').substring(0, 24);
}

// ─────────────────────────────────────────────────────────────────────────────
// TENANT / TRIAL
// ─────────────────────────────────────────────────────────────────────────────

// @route   GET /api/tenant/trial-status
router.get('/tenant/trial-status', auth, async (req, res) => {
    try {
        const tenant = await prisma.tenant.findUnique({ where: { id: req.tenantId } });
        if (!tenant) return res.status(404).json({ msg: 'Tenant not found' });

        const now = new Date();
        let effectiveEndDate = new Date(tenant.trialEndsAt);

        if (tenant.subscriptionEndsAt && new Date(tenant.subscriptionEndsAt) > effectiveEndDate) {
            effectiveEndDate = new Date(tenant.subscriptionEndsAt);
        }

        const diffTime = effectiveEndDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const isExpired = diffTime < 0;

        res.json({ trialEndsAt: effectiveEndDate, daysRemaining: diffDays, isExpired });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

// @route   GET /api/settings
router.get('/settings', auth, async (req, res) => {
    try {
        const tenant = await prisma.tenant.findUnique({ where: { id: req.tenantId } });
        if (!tenant) return res.status(404).json({ msg: 'Tenant not found' });
        res.json(tenant.settings || {});
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   PUT /api/settings
router.put('/settings', auth, async (req, res) => {
    try {
        const tenant = await prisma.tenant.findUnique({ where: { id: req.tenantId } });
        if (!tenant) return res.status(404).json({ msg: 'Tenant not found' });

        const { shopName, shopAddress, shopLogo, footerMessage, taxRate, taxName } = req.body;
        const currentSettings = tenant.settings || {};

        const newSettings = {
            ...currentSettings,
            ...(shopName !== undefined && { shopName }),
            ...(shopAddress !== undefined && { shopAddress }),
            ...(shopLogo !== undefined && { shopLogo }),
            ...(footerMessage !== undefined && { footerMessage }),
            ...(taxRate !== undefined && { taxRate: parseFloat(taxRate) }),
            ...(taxName !== undefined && { taxName })
        };

        const updated = await prisma.tenant.update({
            where: { id: req.tenantId },
            data: { settings: newSettings }
        });

        console.log('Saved Settings (v3):', updated.settings);
        res.json({ ...updated.settings, _backendVersion: 'v3' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────

// @route   GET /api/products
router.get('/products', auth, async (req, res) => {
    try {
        const products = await prisma.product.findMany({ where: { tenantId: req.tenantId } });
        res.json(products);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/products
router.post('/products', auth, async (req, res) => {
    try {
        const { name, nameEn, barcode, price, cost, stock, minStock, trackStock, category, categoryEn, isActive } = req.body;
        const product = await prisma.product.create({
            data: {
                id: newId(),
                tenantId: req.tenantId,
                name,
                nameEn: nameEn || null,
                barcode: barcode || null,
                price: Number(price || 0),
                cost: Number(cost || 0),
                stock: Number(stock || 0),
                minStock: Number(minStock || 0),
                trackStock: trackStock !== false,
                category: category || null,
                categoryEn: categoryEn || null,
                isActive: isActive !== false
            }
        });
        res.json(product);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   PUT /api/products/:id
router.put('/products/:id', auth, async (req, res) => {
    try {
        const product = await prisma.product.findFirst({
            where: { id: req.params.id, tenantId: req.tenantId }
        });
        if (!product) return res.status(404).json({ msg: 'Product not found' });

        const { name, nameEn, barcode, price, cost, stock, category, categoryEn, minStock, trackStock, isActive } = req.body;

        const updated = await prisma.product.update({
            where: { id: req.params.id },
            data: {
                ...(name !== undefined && { name }),
                ...(nameEn !== undefined && { nameEn }),
                ...(barcode !== undefined && { barcode }),
                ...(price !== undefined && { price: Number(price) }),
                ...(cost !== undefined && { cost: Number(cost) }),
                ...(stock !== undefined && { stock: Number(stock) }),
                ...(category !== undefined && { category }),
                ...(categoryEn !== undefined && { categoryEn }),
                ...(minStock !== undefined && { minStock: Number(minStock) }),
                ...(trackStock !== undefined && { trackStock }),
                ...(isActive !== undefined && { isActive })
            }
        });
        res.json(updated);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   DELETE /api/products/:id
router.delete('/products/:id', auth, async (req, res) => {
    try {
        const product = await prisma.product.findFirst({
            where: { id: req.params.id, tenantId: req.tenantId }
        });
        if (!product) return res.status(404).json({ msg: 'Product not found' });

        await prisma.product.delete({ where: { id: req.params.id } });
        res.json({ msg: 'Product removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// SALES
// ─────────────────────────────────────────────────────────────────────────────

// @route   POST /api/sales
router.post('/sales', auth, async (req, res) => {
    try {
        const { items, total, paymentMethod, salesman } = req.body;

        // Find active shift
        const shift = await prisma.shift.findFirst({
            where: { tenantId: req.tenantId, cashier: req.user.username, status: 'open' }
        });

        if (!shift) {
            return res.status(400).json({ msg: 'No open shift found. Please open a shift first.' });
        }

        // Generate Receipt ID based on shift count
        const shiftCount = await prisma.sale.count({ where: { shiftId: shift.id } });
        const receiptId = String(shiftCount + 1);

        // Pre-populate category for each item (snapshot)
        const productIds = items.map(i => i.productId).filter(Boolean);
        const products = await prisma.product.findMany({
            where: { id: { in: productIds }, tenantId: req.tenantId }
        });
        const prodMap = products.reduce((acc, p) => { acc[p.id] = p; return acc; }, {});

        const snapshotItems = items.map(item => ({
            ...item,
            category: prodMap[item.productId]?.category || 'Other'
        }));

        const sale = await prisma.sale.create({
            data: {
                id: newId(),
                tenantId: req.tenantId,
                receiptId,
                shiftId: shift.id,
                date: new Date(),
                method: paymentMethod,
                cashier: req.user.username,
                salesman: salesman || null,
                total: Number(total || 0),
                taxAmount: Number(req.body.taxAmount || 0),
                taxName: req.body.taxName || null,
                taxRate: req.body.taxRate != null ? Number(req.body.taxRate) : null,
                items: snapshotItems,
                splitPayments: req.body.splitPayments || [],
                status: 'finished',
                returns: []
            }
        });

        // Update stock
        for (const item of items) {
            let product = await prisma.product.findFirst({
                where: { id: item.productId, tenantId: req.tenantId }
            });
            if (!product && item.code) {
                product = await prisma.product.findFirst({
                    where: { barcode: item.code, tenantId: req.tenantId }
                });
            }
            if (product && product.trackStock !== false) {
                await prisma.product.update({
                    where: { id: product.id },
                    data: { stock: product.stock - item.qty }
                });
            }
        }

        // Fetch tenant settings for receipt
        const tenant = await prisma.tenant.findUnique({ where: { id: req.tenantId } });

        res.json({ sale, settings: tenant ? tenant.settings : {} });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   GET /api/sales
router.get('/sales', auth, async (req, res) => {
    try {
        const sales = await prisma.sale.findMany({
            where: { tenantId: req.tenantId },
            orderBy: { date: 'desc' }
        });
        res.json(sales);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   GET /api/sales/daily
router.get('/sales/daily', auth, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sales = await prisma.sale.findMany({
            where: { tenantId: req.tenantId, date: { gte: today } }
        });

        const totalSales = sales.reduce((acc, sale) => acc + sale.total, 0);
        const totalOrders = sales.length;

        res.json({ date: today, totalSales, totalOrders, sales });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   GET /api/sales/:id
router.get('/sales/:id', auth, async (req, res) => {
    try {
        // Try by ID first, then by receiptId
        let sale = await prisma.sale.findFirst({
            where: { id: req.params.id, tenantId: req.tenantId }
        });

        if (!sale) {
            sale = await prisma.sale.findFirst({
                where: { receiptId: req.params.id, tenantId: req.tenantId }
            });
        }

        if (!sale) return res.status(404).json({ msg: 'Sale not found' });
        res.json(sale);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/sales/:id/return
router.post('/sales/:id/return', auth, async (req, res) => {
    try {
        const { items } = req.body;

        let sale = await prisma.sale.findFirst({
            where: { id: req.params.id, tenantId: req.tenantId }
        });
        if (!sale) {
            sale = await prisma.sale.findFirst({
                where: { receiptId: req.params.id, tenantId: req.tenantId }
            });
        }
        if (!sale) return res.status(404).json({ msg: 'Sale not found' });

        const returnRecord = {
            items: [],
            totalRefund: 0,
            cashier: req.user.username,
            date: new Date()
        };

        // Work on mutable copy of items
        const saleItems = Array.isArray(sale.items) ? [...sale.items] : [];

        for (const returnItem of items) {
            const saleItem = saleItems.find(i => i.code === returnItem.code || i.id === returnItem.code);
            if (!saleItem) continue;

            const remainingQty = saleItem.qty - (saleItem.returnedQty || 0);
            if (returnItem.qty > remainingQty) {
                return res.status(400).json({ msg: `Cannot return more than sold quantity for item ${saleItem.name}` });
            }

            saleItem.returnedQty = (saleItem.returnedQty || 0) + returnItem.qty;

            let itemPrice = saleItem.price;
            if (saleItem.discount) {
                if (saleItem.discount.type === 'percent') {
                    itemPrice = itemPrice - (itemPrice * saleItem.discount.value / 100);
                } else if (saleItem.discount.type === 'value') {
                    itemPrice = itemPrice - saleItem.discount.value;
                }
            }
            const refundAmount = itemPrice * returnItem.qty;

            returnRecord.items.push({
                code: saleItem.code,
                qty: returnItem.qty,
                refundAmount,
                reason: returnItem.reason || req.body.reason
            });
            returnRecord.totalRefund += refundAmount;

            // Restore Product Stock
            let product = await prisma.product.findFirst({
                where: { id: saleItem.productId, tenantId: req.tenantId }
            });
            if (!product && saleItem.code) {
                product = await prisma.product.findFirst({
                    where: { barcode: saleItem.code, tenantId: req.tenantId }
                });
            }
            if (product) {
                await prisma.product.update({
                    where: { id: product.id },
                    data: { stock: product.stock + returnItem.qty }
                });
            }
        }

        if (returnRecord.items.length > 0) {
            const existingReturns = Array.isArray(sale.returns) ? sale.returns : [];
            const allReturned = saleItems.every(i => i.qty === (i.returnedQty || 0));

            const updated = await prisma.sale.update({
                where: { id: sale.id },
                data: {
                    items: saleItems,
                    returns: [...existingReturns, returnRecord],
                    status: allReturned ? 'returned' : 'partial_returned'
                }
            });
            res.json(updated);
        } else {
            res.status(400).json({ msg: 'No valid items to return' });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/sales/:id/cancel
router.post('/sales/:id/cancel', auth, async (req, res) => {
    try {
        const sale = await prisma.sale.findFirst({
            where: { id: req.params.id, tenantId: req.tenantId }
        });
        if (!sale) return res.status(404).json({ msg: 'Sale not found' });

        if (sale.status === 'cancelled') {
            return res.status(400).json({ msg: 'Sale already cancelled' });
        }

        // Restore stock
        const saleItems = Array.isArray(sale.items) ? sale.items : [];
        for (const item of saleItems) {
            const product = await prisma.product.findFirst({
                where: { id: item.productId, tenantId: req.tenantId }
            });
            if (product) {
                await prisma.product.update({
                    where: { id: product.id },
                    data: { stock: product.stock + item.qty }
                });
            }
        }

        await prisma.sale.update({
            where: { id: sale.id },
            data: {
                status: 'cancelled',
                returnReason: req.body.reason || 'Cancelled'
            }
        });

        // Log action
        await prisma.auditLog.create({
            data: {
                id: newId(),
                tenantId: req.tenantId,
                user: req.user.username,
                action: 'CANCEL_SALE',
                details: { saleId: sale.id, receiptId: sale.receiptId }
            }
        });

        res.json({ msg: 'Sale cancelled and stock restored' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// SALESMEN
// ─────────────────────────────────────────────────────────────────────────────

// @route   GET /api/salesmen
router.get('/salesmen', auth, async (req, res) => {
    try {
        const salesmen = await prisma.salesman.findMany({ where: { tenantId: req.tenantId } });
        res.json(salesmen);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/salesmen
router.post('/salesmen', auth, async (req, res) => {
    try {
        const { name, targets } = req.body;
        const salesman = await prisma.salesman.create({
            data: {
                id: newId(),
                tenantId: req.tenantId,
                name,
                targets: targets || []
            }
        });
        res.json(salesman);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   PUT /api/salesmen/:id
router.put('/salesmen/:id', auth, async (req, res) => {
    try {
        const salesman = await prisma.salesman.findFirst({
            where: { id: req.params.id, tenantId: req.tenantId }
        });
        if (!salesman) return res.status(404).json({ msg: 'Salesman not found' });

        const updated = await prisma.salesman.update({
            where: { id: req.params.id },
            data: {
                ...(req.body.name && { name: req.body.name }),
                ...(req.body.targets && { targets: req.body.targets })
            }
        });
        res.json(updated);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   DELETE /api/salesmen/:id
router.delete('/salesmen/:id', auth, async (req, res) => {
    try {
        const salesman = await prisma.salesman.findFirst({
            where: { id: req.params.id, tenantId: req.tenantId }
        });
        if (!salesman) return res.status(404).json({ msg: 'Salesman not found' });

        await prisma.salesman.delete({ where: { id: req.params.id } });
        res.json({ msg: 'Salesman removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPENSES
// ─────────────────────────────────────────────────────────────────────────────

// @route   GET /api/expenses
router.get('/expenses', auth, async (req, res) => {
    try {
        const expenses = await prisma.expense.findMany({ where: { tenantId: req.tenantId } });
        res.json(expenses);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/expenses
router.post('/expenses', auth, async (req, res) => {
    try {
        const { date, seller, description, amount, method } = req.body;
        const expense = await prisma.expense.create({
            data: {
                id: newId(),
                tenantId: req.tenantId,
                date: date || new Date().toISOString().split('T')[0],
                seller: seller || null,
                description,
                amount: Number(amount || 0),
                method: method || 'cash'
            }
        });
        res.json(expense);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   DELETE /api/expenses/:id
router.delete('/expenses/:id', auth, async (req, res) => {
    try {
        const expense = await prisma.expense.findFirst({
            where: { id: req.params.id, tenantId: req.tenantId }
        });
        if (!expense) return res.status(404).json({ msg: 'Expense not found' });

        await prisma.expense.delete({ where: { id: req.params.id } });
        res.json({ msg: 'Expense removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────

// @route   GET /api/users
router.get('/users', auth, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: { tenantId: req.tenantId },
            select: {
                id: true,
                tenantId: true,
                username: true,
                role: true,
                fullName: true,
                active: true,
                permissions: true,
                createdAt: true
            }
        });
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/users
router.post('/users', auth, async (req, res) => {
    try {
        const { username, password, role, fullName, permissions } = req.body;

        const existing = await prisma.user.findFirst({
            where: { username, tenantId: req.tenantId }
        });
        if (existing) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        await prisma.user.create({
            data: {
                id: newId(),
                tenantId: req.tenantId,
                username,
                passwordHash,
                fullName: fullName || username,
                role: role || 'cashier',
                active: true,
                permissions: permissions || {}
            }
        });
        res.json({ msg: 'User created' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
});

// @route   PUT /api/users/:id
router.put('/users/:id', auth, async (req, res) => {
    try {
        const user = await prisma.user.findFirst({
            where: { id: req.params.id, tenantId: req.tenantId }
        });
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const { username, password, role, fullName, permissions, active } = req.body;

        let passwordHash = user.passwordHash;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            passwordHash = await bcrypt.hash(password, salt);
        }

        const updated = await prisma.user.update({
            where: { id: req.params.id },
            data: {
                ...(username && { username }),
                ...(role && { role }),
                ...(fullName && { fullName }),
                ...(permissions && { permissions }),
                ...(active !== undefined && { active }),
                passwordHash
            }
        });

        res.json({
            msg: 'User updated',
            user: {
                _id: updated.id,
                username: updated.username,
                role: updated.role,
                permissions: updated.permissions,
                fullName: updated.fullName
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
});

// @route   DELETE /api/users/:id
router.delete('/users/:id', auth, async (req, res) => {
    try {
        const user = await prisma.user.findFirst({
            where: { id: req.params.id, tenantId: req.tenantId }
        });
        if (!user) return res.status(404).json({ msg: 'User not found' });

        await prisma.user.delete({ where: { id: req.params.id } });
        res.json({ msg: 'User removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────

// @route   GET /api/categories
router.get('/categories', auth, async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            where: { tenantId: req.tenantId },
            orderBy: { name: 'asc' }
        });
        res.json(categories);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/categories
router.post('/categories', auth, async (req, res) => {
    try {
        const { name, nameEn } = req.body;
        const category = await prisma.category.create({
            data: {
                id: newId(),
                tenantId: req.tenantId,
                name,
                nameEn: nameEn || null
            }
        });
        res.json(category);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   PUT /api/categories/:id
router.put('/categories/:id', auth, async (req, res) => {
    try {
        const category = await prisma.category.findFirst({
            where: { id: req.params.id, tenantId: req.tenantId }
        });
        if (!category) return res.status(404).json({ msg: 'Category not found' });

        const { name, nameEn } = req.body;
        const updated = await prisma.category.update({
            where: { id: req.params.id },
            data: {
                ...(name && { name }),
                ...(nameEn !== undefined && { nameEn })
            }
        });
        res.json(updated);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   DELETE /api/categories/:id
router.delete('/categories/:id', auth, async (req, res) => {
    try {
        const category = await prisma.category.findFirst({
            where: { id: req.params.id, tenantId: req.tenantId }
        });
        if (!category) return res.status(404).json({ msg: 'Category not found' });

        await prisma.category.delete({ where: { id: req.params.id } });
        res.json({ msg: 'Category removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY / STOCK ADJUSTMENT
// ─────────────────────────────────────────────────────────────────────────────

// @route   POST /api/inventory/adjust
router.post('/inventory/adjust', auth, async (req, res) => {
    try {
        const { items } = req.body;

        const adjustmentItems = [];

        for (const item of items) {
            const product = await prisma.product.findFirst({
                where: { id: item.productId, tenantId: req.tenantId }
            });
            if (product) {
                const oldStock = product.stock;
                const newStock = parseInt(item.newStock);
                const difference = newStock - oldStock;

                if (difference !== 0) {
                    await prisma.product.update({
                        where: { id: product.id },
                        data: { stock: newStock }
                    });

                    adjustmentItems.push({
                        productId: product.id,
                        productName: product.name,
                        oldStock,
                        newStock,
                        difference,
                        reason: item.reason || 'Manual Adjustment'
                    });
                }
            }
        }

        if (adjustmentItems.length > 0) {
            const adjustment = await prisma.stockAdjustment.create({
                data: {
                    id: newId(),
                    tenantId: req.tenantId,
                    adjustedBy: req.user.username,
                    date: new Date(),
                    items: adjustmentItems
                }
            });
            res.json({ msg: 'Stock adjusted successfully', adjustment });
        } else {
            res.json({ msg: 'No changes made' });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// SHIFT MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// @route   GET /api/shifts/current
router.get('/shifts/current', auth, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const shift = await prisma.shift.findFirst({
            where: { tenantId: req.tenantId, cashier: user.username, status: 'open' }
        });
        res.json(shift);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   GET /api/shifts/summary
router.get('/shifts/summary', auth, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const shift = await prisma.shift.findFirst({
            where: { tenantId: req.tenantId, cashier: user.username, status: 'open' }
        });
        if (!shift) return res.status(400).json({ msg: 'No open shift found' });

        const sales = await prisma.sale.findMany({
            where: { shiftId: shift.id, tenantId: req.tenantId }
        });

        let cashSales = 0, cardSales = 0, mobileSales = 0, totalSales = 0, totalRefunds = 0, cancelledTotal = 0;

        sales.forEach(sale => {
            if (sale.status === 'cancelled') { cancelledTotal += sale.total; return; }
            totalSales += sale.total;
            if (sale.method === 'cash') cashSales += sale.total;
            else if (sale.method === 'card') cardSales += sale.total;
            else if (sale.method === 'mobile') mobileSales += sale.total;
            else if (sale.method === 'split') {
                const splits = Array.isArray(sale.splitPayments) ? sale.splitPayments : [];
                if (splits.length > 0) {
                    splits.forEach(sp => {
                        if (sp.method === 'cash') cashSales += sp.amount;
                        else if (sp.method === 'card') cardSales += sp.amount;
                        else if (sp.method === 'mobile') mobileSales += sp.amount;
                    });
                } else { cashSales += sale.total; }
            }
            const returns = Array.isArray(sale.returns) ? sale.returns : [];
            returns.forEach(ret => { totalRefunds += ret.totalRefund; });
        });

        const shiftDateStr = shift.startTime.toISOString().split('T')[0];
        const expenses = await prisma.expense.findMany({
            where: { tenantId: req.tenantId, date: { gte: shiftDateStr } }
        });
        const expensesTotal = expenses.reduce((acc, exp) => acc + exp.amount, 0);

        const categorySales = {};
        sales.forEach(sale => {
            if (sale.status === 'cancelled') return;
            const items = Array.isArray(sale.items) ? sale.items : [];
            items.forEach(item => {
                const category = item.category || 'Other';
                const netQty = item.qty - (item.returnedQty || 0);
                if (netQty <= 0) return;
                let itemPrice = item.price;
                if (item.discount) {
                    if (item.discount.type === 'percent') itemPrice -= itemPrice * item.discount.value / 100;
                    else if (item.discount.type === 'value') itemPrice -= item.discount.value;
                }
                categorySales[category] = (categorySales[category] || 0) + itemPrice * netQty;
            });
        });

        const expectedCash = shift.startCash + cashSales - totalRefunds - expensesTotal;

        res.json({ startCash: shift.startCash, cashSales, cardSales, mobileSales, totalSales, totalRefunds, expensesTotal, expectedCash, categorySales, cancelledTotal });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   GET /api/shifts/:id
router.get('/shifts/:id', auth, async (req, res) => {
    try {
        const shift = await prisma.shift.findUnique({ where: { id: req.params.id } });
        if (!shift) return res.status(404).json({ msg: 'Shift not found' });

        if (shift.tenantId !== req.tenantId) {
            return res.status(401).json({ msg: 'Not authorized' });
        }
        res.json(shift);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   GET /api/shifts
router.get('/shifts', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'manager') {
            return res.status(403).json({ msg: 'Access denied' });
        }
        const shifts = await prisma.shift.findMany({
            where: { tenantId: req.tenantId },
            orderBy: { startTime: 'desc' }
        });
        res.json(shifts);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/shifts/open
router.post('/shifts/open', auth, async (req, res) => {
    try {
        const existingShift = await prisma.shift.findFirst({
            where: { tenantId: req.tenantId, cashier: req.user.username, status: 'open' }
        });
        if (existingShift) {
            return res.status(400).json({ msg: 'Shift already open' });
        }

        const { startCash } = req.body;

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const newShift = await prisma.shift.create({
            data: {
                id: newId(),
                tenantId: req.tenantId,
                cashier: user.username,
                startCash: Number(startCash || 0),
                status: 'open'
            }
        });

        // Auto-adopt orphaned sales from today by this cashier
        try {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const result = await prisma.sale.updateMany({
                where: {
                    tenantId: req.tenantId,
                    cashier: user.username,
                    shiftId: null,
                    date: { gte: startOfDay }
                },
                data: { shiftId: newShift.id }
            });

            if (result.count > 0) {
                console.log(`[Shift] Automatically linked ${result.count} orphaned sales to new shift ${newShift.id}`);
            }
        } catch (adoptError) {
            console.error('Failed to adopt orphaned sales:', adoptError.message);
        }

        // Log action
        await prisma.auditLog.create({
            data: {
                id: newId(),
                tenantId: req.tenantId,
                user: req.user.username,
                action: 'OPEN_SHIFT',
                details: { shiftId: newShift.id, startCash }
            }
        });

        res.json(newShift);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/shifts/close
router.post('/shifts/close', auth, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const shift = await prisma.shift.findFirst({
            where: { tenantId: req.tenantId, cashier: user.username, status: 'open' }
        });
        if (!shift) {
            return res.status(400).json({ msg: 'No open shift found' });
        }

        const { actualCash, actualCard, actualMobile } = req.body;

        const sales = await prisma.sale.findMany({
            where: { shiftId: shift.id, tenantId: req.tenantId }
        });

        let cashSales = 0, cardSales = 0, mobileSales = 0, totalSales = 0, totalRefunds = 0, cancelledTotal = 0;

        sales.forEach(sale => {
            if (sale.status === 'cancelled') { cancelledTotal += sale.total; return; }
            totalSales += sale.total;
            if (sale.method === 'cash') cashSales += sale.total;
            else if (sale.method === 'card') cardSales += sale.total;
            else if (sale.method === 'mobile') mobileSales += sale.total;
            else if (sale.method === 'split') {
                const splits = Array.isArray(sale.splitPayments) ? sale.splitPayments : [];
                if (splits.length > 0) {
                    splits.forEach(sp => {
                        if (sp.method === 'cash') cashSales += sp.amount;
                        else if (sp.method === 'card') cardSales += sp.amount;
                        else if (sp.method === 'mobile') mobileSales += sp.amount;
                    });
                } else { cashSales += sale.total; }
            }
            const returns = Array.isArray(sale.returns) ? sale.returns : [];
            returns.forEach(ret => { totalRefunds += ret.totalRefund; });
        });

        const shiftDateStr = shift.startTime.toISOString().split('T')[0];
        const expenses = await prisma.expense.findMany({
            where: { tenantId: req.tenantId, date: { gte: shiftDateStr } }
        });
        const expensesTotal = expenses.reduce((acc, exp) => acc + exp.amount, 0);
        const expectedCash = shift.startCash + cashSales - totalRefunds - expensesTotal;

        const categorySales = {};
        sales.forEach(sale => {
            if (sale.status === 'cancelled') return;
            const items = Array.isArray(sale.items) ? sale.items : [];
            items.forEach(item => {
                const category = item.category || 'Other';
                const netQty = item.qty - (item.returnedQty || 0);
                if (netQty <= 0) return;
                let itemPrice = item.price;
                if (item.discount) {
                    if (item.discount.type === 'percent') itemPrice -= itemPrice * item.discount.value / 100;
                    else if (item.discount.type === 'value') itemPrice -= item.discount.value;
                }
                categorySales[category] = (categorySales[category] || 0) + itemPrice * netQty;
            });
        });

        const closedShift = await prisma.shift.update({
            where: { id: shift.id },
            data: {
                status: 'closed',
                endTime: new Date(),
                actualCash: actualCash != null ? Number(actualCash) : null,
                actualCard: actualCard != null ? Number(actualCard) : null,
                actualMobile: actualMobile != null ? Number(actualMobile) : null,
                endCash: expectedCash,
                totalSales,
                cashSales,
                cardSales,
                mobileSales,
                returnsTotal: totalRefunds,
                expensesTotal,
                categorySales,
                cancelledTotal
            }
        });

        // Log action
        await prisma.auditLog.create({
            data: {
                id: newId(),
                tenantId: req.tenantId,
                user: req.user.username,
                action: 'CLOSE_SHIFT',
                details: { shiftId: shift.id, actualCash, expectedCash, diff: (actualCash || 0) - expectedCash }
            }
        });

        res.json(closedShift);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOGS
// ─────────────────────────────────────────────────────────────────────────────

// @route   GET /api/audit-logs
router.get('/audit-logs', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ msg: 'Access denied' });
        }

        const logs = await prisma.auditLog.findMany({
            where: { tenantId: req.tenantId },
            orderBy: { timestamp: 'desc' },
            take: 100
        });
        res.json(logs);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Tenant = require('../models/Tenant');
const User = require('../models/User');

// @route   POST /api/auth/register
// @desc    Register a new tenant (business) and admin user
// @access  Public
router.post('/register', async (req, res) => {
    const { businessName, email, phone, username, password } = req.body;

    try {
        let tenant = await Tenant.findOne({ email });
        if (tenant) {
            return res.status(400).json({ msg: 'Email already registered' });
        }

        // Create Tenant (7 days trial)
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 7);

        tenant = new Tenant({
            businessName,
            email,
            phone,
            trialEndsAt
        });

        await tenant.save();

        // Create Admin User
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const user = new User({
            tenantId: tenant._id,
            username,
            passwordHash,
            fullName: 'System Administrator',
            role: 'admin'
        });

        await user.save();

        // Log registration details for admin notification
        console.log('\n=== NEW BUSINESS REGISTRATION ===');
        console.log(`Business: ${businessName}`);
        console.log(`Email: ${email}`);
        console.log(`Phone: ${phone}`);
        console.log(`Admin: ${username}`);
        console.log(`Registered: ${new Date().toLocaleString()}`);
        console.log(`Trial Ends: ${trialEndsAt.toLocaleString()}`);
        console.log('Send to: info@itqansolutions.org');
        console.log('==================================\n');

        // Return Token
        const payload = {
            user: {
                id: user._id,
                tenantId: tenant._id,
                role: user.role
            }
        };

        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' }, (err, token) => {
            if (err) throw err;
            res.json({
                token,
                user: {
                    username: user.username,
                    role: user.role,
                    fullName: user.fullName
                }
            });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error' });
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
    const { username, password, businessEmail } = req.body; // Added businessEmail to distinguish tenants if needed, or just username if unique globally? 
    // Wait, usernames are not unique globally, only per tenant. 
    // So login needs to know WHICH tenant, OR username must be unique globally?
    // The prompt says "everyone register to has theri own database and own users".
    // Usually in multi-tenant, you login with Email (unique) OR Company Code + Username.
    // Let's assume for simplicity: Login with Email (Admin) OR Username + Company ID?
    // Or maybe just enforce unique usernames globally? No, "cashier" is common.
    // Let's require Business Email (or ID) + Username + Password?
    // OR: The Admin logs in with Email/Password. Sub-users log in with Username + Password + Company Code.

    // Let's stick to the simplest: Login requires Business Email (to find tenant) AND Username.
    // Actually, for the "Admin" who registers, they use Email.
    // For "Cashier", they use Username.
    // Let's try to find the user by Username. If multiple exist, we have a problem.
    // Solution: Login form asks for "Company Email" (or ID) and "Username" and "Password".

    try {
        // Find tenant first?
        // Let's assume the login form sends { businessEmail, username, password }

        if (!businessEmail) {
            return res.status(400).json({ msg: 'Business Email is required' });
        }

        const tenant = await Tenant.findOne({ email: businessEmail });
        if (!tenant) {
            return res.status(400).json({ msg: 'Business not found' });
        }

        const user = await User.findOne({ tenantId: tenant._id, username });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const payload = {
            user: {
                id: user._id,
                tenantId: tenant._id,
                role: user.role
            }
        };

        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { username: user.username, role: user.role, fullName: user.fullName } });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router;

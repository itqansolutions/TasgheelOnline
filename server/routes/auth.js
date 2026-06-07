const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const prisma = require('../db');

// @route   POST /api/auth/register
// @desc    Register a new tenant (business) and admin user
// @access  Public
router.post('/register', async (req, res) => {
    const { businessName, email, phone, username, password } = req.body;

    try {
        // Check if email already registered
        const existingTenant = await prisma.tenant.findUnique({ where: { email } });
        if (existingTenant) {
            return res.status(400).json({ msg: 'Email already registered' });
        }

        // Create Tenant (7 days trial)
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 7);

        const tenant = await prisma.tenant.create({
            data: {
                id: randomUUID().replace(/-/g, '').substring(0, 24), // 24-char hex-like ID
                businessName,
                email,
                phone,
                trialEndsAt,
                isSubscribed: false,
                status: 'active',
                subscriptionPlan: 'free_trial',
                settings: {}
            }
        });

        // Create Admin User
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const user = await prisma.user.create({
            data: {
                id: randomUUID().replace(/-/g, '').substring(0, 24),
                tenantId: tenant.id,
                username,
                passwordHash,
                fullName: 'System Administrator',
                role: 'admin',
                active: true,
                permissions: {
                    canCancelSales: true,
                    nav_pos: true,
                    nav_products: true,
                    nav_receipts: true,
                    nav_reports: true,
                    nav_salesmen: true,
                    nav_expenses: true,
                    nav_admin: true
                }
            }
        });

        // Send Email Notification
        try {
            const nodemailer = require('nodemailer');
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: 'info@itqansolutions.org',
                subject: `New Business Registration: ${businessName}`,
                text: `
=== NEW BUSINESS REGISTRATION ===
Business: ${businessName}
Email: ${email}
Phone: ${phone}
Admin: ${username}
Registered: ${new Date().toLocaleString()}
Trial Ends: ${trialEndsAt.toLocaleString()}
==================================
                `
            };

            await transporter.sendMail(mailOptions);
            console.log('Registration email sent to info@itqansolutions.org');
        } catch (emailError) {
            console.error('Failed to send email:', emailError);
            // Don't block registration if email fails
        }

        // Return JWT Token
        const payload = {
            user: {
                id: user.id,
                tenantId: tenant.id,
                role: user.role,
                username: user.username
            }
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.json({
            token,
            user: {
                _id: user.id,
                username: user.username,
                role: user.role,
                fullName: user.fullName,
                permissions: user.permissions
            }
        });

    } catch (err) {
        console.error('Registration Error:', err.message);
        res.status(500).json({ msg: 'Server error' });
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
    const { username, password, businessEmail } = req.body;

    try {
        if (!businessEmail) {
            return res.status(400).json({ msg: 'Business Email is required' });
        }

        const tenant = await prisma.tenant.findUnique({ where: { email: businessEmail } });
        if (!tenant) {
            return res.status(400).json({ msg: 'Business not found' });
        }

        // Check Tenant Status
        if (tenant.status === 'on_hold') {
            return res.status(403).json({ msg: 'Account is Temporarily On Hold. Contact Support.' });
        }
        if (tenant.status === 'suspended') {
            return res.status(403).json({ msg: 'Account Suspended.' });
        }

        const user = await prisma.user.findFirst({
            where: { tenantId: tenant.id, username }
        });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        if (!user.active) {
            return res.status(403).json({ msg: 'User account is disabled.' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const payload = {
            user: {
                id: user.id,
                tenantId: tenant.id,
                role: user.role,
                username: user.username
            }
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({
            token,
            user: {
                _id: user.id,
                username: user.username,
                role: user.role,
                fullName: user.fullName,
                permissions: user.permissions
            }
        });

    } catch (err) {
        console.error('Login Error:', err.message);
        res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router;

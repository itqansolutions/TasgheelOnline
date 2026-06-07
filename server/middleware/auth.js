const jwt = require('jsonwebtoken');
const prisma = require('../db');

module.exports = async function (req, res, next) {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        req.tenantId = decoded.user.tenantId;

        // Check subscription/trial status
        const tenant = await prisma.tenant.findUnique({ where: { id: req.tenantId } });
        if (!tenant) return res.status(401).json({ msg: 'Tenant not found' });

        if (tenant.status === 'on_hold') {
            return res.status(403).json({ msg: 'Account is Temporarily On Hold. Contact Support.' });
        }
        if (tenant.status === 'suspended') {
            return res.status(403).json({ msg: 'Account Suspended.' });
        }

        const now = new Date();
        if (!tenant.isSubscribed && now > tenant.trialEndsAt) {
            console.warn(`Trial expired for tenant ${tenant.id}. Trial ended ${tenant.trialEndsAt}`);
            return res.status(403).json({ msg: 'Trial expired. Please subscribe.', code: 'TRIAL_EXPIRED' });
        }

        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

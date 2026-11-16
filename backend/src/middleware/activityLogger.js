const ActivityLog = require('../models/ActivityLog');
const describe = require('./activityDescription');
module.exports = (req, res, next) => {
    if (['/api/activities', '/api/health'].some(path => req.originalUrl.startsWith(path))) return next();
    res.on('finish', () => {
        if (!req.user) return;
        const path = req.originalUrl.split('?')[0];
        const success = res.statusCode < 400;
        if (success && req.activityLogged) return;
        if (success && (/^\/api\/auth\/(login|logout|change-password|verify-otp)$/.test(path) || /^\/api\/payslips\/(generate|employee\/)/.test(path) || /^\/api\/tax-settings/.test(path) && req.method !== 'GET')) return;
        if (req.method === 'GET' && (path.endsWith('/profile-picture') || path.endsWith('/logo') || path === '/api/auth/me')) return;
        const description = describe(req);
        ActivityLog.create({ userId: req.user.id, action: description.action,
            details: `${success ? 'Completed' : `Not completed (HTTP ${res.statusCode})`}. ${description.details}`, ipAddress: req.ip });
    });
    next();
};

const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.authenticate = async (req, res, next) => {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
    try {
        const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user || !user.is_active || Number(decoded.version ?? -1) !== Number(user.token_version || 0)) {
            return res.status(401).json({ error: 'Session expired. Please sign in again.' });
        }
        req.user = { id: user.id, username: user.username, role: user.role };
        next();
    } catch (error) {
        if (['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name)) return res.status(401).json({ error: 'Invalid or expired token' });
        next(error);
    }
};
exports.authorize = (...roles) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
};

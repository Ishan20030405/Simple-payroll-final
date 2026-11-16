function createLoginLimiter({ now = Date.now, maxEntries = 10000 } = {}) {
    const buckets = new Map();
    return (req, res, next) => {
        const time = now();
        for (const [key, entry] of buckets) if (entry.until <= time) buckets.delete(key);
        const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : '';
        const stage = req.path || req.url?.split('?')[0] || 'authentication';
        const limits = [[`ip:${req.ip}`, 100], [`account:${stage}:${username}`, 10]];
        const deny = () => res.status(429).json({ message: 'Too many authentication attempts. Try again in 15 minutes.' });
        for (const [key, maximum] of limits) {
            const entry = buckets.get(key);
            if (entry && entry.count >= maximum) return deny();
            if (!entry && buckets.size >= maxEntries) return deny();
        }
        for (const [key] of limits) {
            const entry = buckets.get(key) || { count: 0, until: time + 15 * 60 * 1000 };
            entry.count++;
            buckets.set(key, entry);
        }
        next();
    };
}
module.exports = createLoginLimiter();
module.exports.createLoginLimiter = createLoginLimiter;

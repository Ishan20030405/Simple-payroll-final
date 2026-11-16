const db = require('../config/db');

// Buffer JSON responses until all writes have committed. Error responses roll back.
module.exports = handler => async (req, res, next) => {
    let status = 200;
    let body;
    const buffered = {
        status(code) { status = code; return this; },
        json(value) { body = value; return this; }
    };
    try {
        await db.transaction(async () => {
            await handler(req, buffered, error => { throw error || new Error('Unexpected route continuation'); });
            if (status >= 400) throw Object.assign(new Error('Request rejected'), { response: true });
            if (req.user?.role === 'HR' && ['POST','PUT','PATCH','DELETE'].includes(req.method)) {
                // Audit failures must roll back the HR change as well.
                const description = require('./activityDescription')(req);
                await db.execute('INSERT INTO activity_logs (user_id,action,details,ip_address) VALUES (?,?,?,?)',
                    [req.user.id,`HR ${description.action}`,`Completed. ${description.details}`,req.ip || null]);
            }
        });
        if (req.user?.role === 'HR') req.activityLogged = true;
        return res.status(status).json(body);
    } catch (error) {
        if (error.response) return res.status(status).json(body);
        next(error);
    }
};

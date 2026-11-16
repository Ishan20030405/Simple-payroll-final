const { AsyncLocalStorage } = require('node:async_hooks');

module.exports = function transactionalPool(pool) {
    const context = new AsyncLocalStorage();
    const api = {
        async transaction(work) {
            if (context.getStore()?.connection) return work();
            const connection = await pool.getConnection();
            const store = { connection };
            try {
                await connection.beginTransaction();
                return await context.run(store, async () => {
                    const result = await work();
                    await connection.commit();
                    return result;
                });
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                store.connection = null;
                connection.release();
            }
        }
    };
    return new Proxy(pool, {
        get(target, key) {
            if (key === 'transaction') return api.transaction;
            if (key === 'execute' || key === 'query') return (...args) => (context.getStore()?.connection || target)[key](...args);
            const value = target[key];
            return typeof value === 'function' ? value.bind(target) : value;
        }
    });
};

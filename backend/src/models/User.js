// backend/src/models/User.js
const db = require('../config/db');
const bcrypt = require('bcrypt');

class User {
    // Find user by username
    static async findByUsername(username) {
        if (!username) return null;
        const query = 'SELECT * FROM users WHERE username = ?';
        const [rows] = await db.execute(query, [username]);
        return rows[0] || null;
    }

    // Find user by ID
    static async findById(id) {
        if (!id) return null;
        const query = 'SELECT * FROM users WHERE id = ?';
        const [rows] = await db.execute(query, [id]);
        return rows[0] || null;
    }

    // Create user
    static async create(data) {
        const { username, password, role = 'EMPLOYEE', is_active = true } = data;

        if (!username) {
            throw new Error('Username is required');
        }
        if (!password) {
            throw new Error('Password is required');
        }

        if (!['ADMIN','HR','EMPLOYEE'].includes(role)) throw Object.assign(new Error('Choose ADMIN, HR or EMPLOYEE role'), { status: 400 });
        if (String(password).length < 8) throw Object.assign(new Error('Password must be at least 8 characters'), { status: 400 });
        const passwordStr = String(password);
        if (passwordStr.length === 0) {
            throw new Error('Password cannot be empty');
        }

        const hashedPassword = await bcrypt.hash(passwordStr, 10);

        const query = `
            INSERT INTO users (username, password_hash, role, is_active)
            VALUES (?, ?, ?, ?)
        `;
        const [result] = await db.execute(query, [
            username,
            hashedPassword,
            role || 'EMPLOYEE',
            is_active ? 1 : 0
        ]);
        return result.insertId;
    }

    // Activate user
    static async activate(id) {
        if (!id) return false;
        const query = 'UPDATE users SET is_active = 1, token_version = token_version + 1, otp_code = NULL, otp_expires_at = NULL, updated_at = NOW() WHERE id = ?';
        const [result] = await db.execute(query, [id]);
        return result.affectedRows > 0;
    }

    // Deactivate user
    static async deactivate(id) {
        if (!id) return false;
        const query = 'UPDATE users SET is_active = 0, token_version = token_version + 1, otp_code = NULL, otp_expires_at = NULL, updated_at = NOW() WHERE id = ?';
        const [result] = await db.execute(query, [id]);
        return result.affectedRows > 0;
    }

    // ✅ FIXED: Delete user - handles foreign key constraints
    static async delete(id) {
        if (!id) return false;
        try {
            // First check if user exists
            const user = await this.findById(id);
            if (!user) return false;

            // Try to delete the user
            const query = 'DELETE FROM users WHERE id = ?';
            const [result] = await db.execute(query, [id]);
            return result.affectedRows > 0;
        } catch (error) {
            // If foreign key constraint fails, try to handle it
            console.error('Error deleting user:', error.message);
            
            // If there's a foreign key constraint, try to update the employee first
            if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
                // Update employee to remove user_id reference
                await db.execute('UPDATE employees SET user_id = NULL WHERE user_id = ?', [id]);
                // Then try deleting again
                const query = 'DELETE FROM users WHERE id = ?';
                const [result] = await db.execute(query, [id]);
                return result.affectedRows > 0;
            }
            throw error;
        }
    }

    // Update user
    static async update(id, data) {
        if (!id) return false;

        const fields = [];
        const values = [];

        if (data.password) {
            const passwordStr = String(data.password);
            if (passwordStr.length < 8) throw Object.assign(new Error('Password must be at least 8 characters'), { status: 400 });
            if (passwordStr.length > 0) {
                const hashedPassword = await bcrypt.hash(passwordStr, 10);
                fields.push('password_hash = ?');
                values.push(hashedPassword);
            }
        }
        if (data.username !== undefined) { fields.push('username = ?'); values.push(data.username); }
        if (data.role !== undefined) {
            if (!['ADMIN','HR','EMPLOYEE'].includes(data.role)) throw Object.assign(new Error('Choose ADMIN, HR or EMPLOYEE role'), { status: 400 });
            fields.push('role = ?');
            values.push(data.role);
        }
        if (data.is_active !== undefined) {
            fields.push('is_active = ?');
            values.push(data.is_active ? 1 : 0);
        }

        if (fields.length === 0) {
            return true;
        }

        values.push(id);
        const query = `UPDATE users SET ${fields.join(', ')}, token_version = token_version + 1, otp_code = NULL, otp_expires_at = NULL, updated_at = NOW() WHERE id = ?`;
        const [result] = await db.execute(query, values);
        return result.affectedRows > 0;
    }

    // Verify password
    static async verifyPassword(username, password) {
        if (!username || !password) return false;
        const user = await this.findByUsername(username);
        if (!user) return false;
        return await bcrypt.compare(password, user.password_hash);
    }
}

module.exports = User;
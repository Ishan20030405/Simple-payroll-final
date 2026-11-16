const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const User = require('../models/User');
const { transporter } = require('../config/mailer');

// Domain separation prevents reset links from being accepted as login tokens.
const resetKey = () => crypto.createHmac('sha256', process.env.JWT_SECRET).update('password-reset-v1').digest();
const invalid = res => res.status(400).json({ message: 'This reset link is invalid or expired. Request a new link.' });

exports.forgotPassword = async (req, res) => {
  const started = Date.now();
  if (typeof req.body.username !== 'string' || !req.body.username.trim()) {
    return res.status(400).json({ message: 'Enter your username.' });
  }
  try {
    const user = await User.findByUsername(req.body.username.trim());
    if (user?.is_active) {
      const [employees] = await db.execute('SELECT email FROM employees WHERE user_id = ?', [user.id]);
      if (employees[0]?.email) {
        const base = new URL(process.env.FRONTEND_URL || 'http://localhost:3000');
        if (!['http:', 'https:'].includes(base.protocol)) throw new Error('Invalid FRONTEND_URL');
        const token = jwt.sign({ userId: user.id, version: Number(user.token_version || 0) }, resetKey(), {
          algorithm: 'HS256', audience: 'password-reset', expiresIn: '15m', jwtid: crypto.randomBytes(24).toString('hex')
        });
        const link = new URL('/reset-password', base);
        link.hash = new URLSearchParams({ token }).toString();
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: employees[0].email,
          subject: 'Reset your Payroll System password',
          text: `Use this link to reset your password within 15 minutes:\n\n${link.href}\n\nIf you did not request this, ignore this email. Your password has not changed.`
        });
      }
    }
  } catch (error) {
    // Do not expose account existence or delivery details to an anonymous caller.
    console.error('Password recovery request failed');
  }
  await new Promise(resolve => setTimeout(resolve, Math.max(0, 1000 - (Date.now() - started))));
  return res.json({ message: 'If this username has an active account with a linked email, a reset link will be sent. Check your inbox and spam folder. If it does not arrive, contact your administrator.' });
};

exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  if (typeof newPassword !== 'string' || newPassword.length < 8 || Buffer.byteLength(newPassword, 'utf8') > 72) {
    return res.status(400).json({ message: 'Use at least 8 characters and no more than 72 bytes for your password.' });
  }
  let decoded;
  try {
    if (typeof token !== 'string') return invalid(res);
    decoded = jwt.verify(token, resetKey(), { algorithms: ['HS256'], audience: 'password-reset' });
  } catch { return invalid(res); }
  // The route transaction and row lock make link consumption single-use.
  const [rows] = await db.execute('SELECT id, is_active, token_version FROM users WHERE id = ? FOR UPDATE', [decoded.userId]);
  const user = rows[0];
  if (!user?.is_active || Number(user.token_version || 0) !== decoded.version) return invalid(res);
  if (!await User.update(user.id, { password: newPassword })) return invalid(res);
  return res.json({ message: 'Your password has been reset. Sign in with your new password.' });
};

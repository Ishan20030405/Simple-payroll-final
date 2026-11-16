import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ShieldCheck, KeyRound, Mail, CheckCircle2, LockKeyhole, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { api } from '../contexts/AuthContext';
import './LoginPage.css';
import './PasswordRecoveryPage.css';

export default function PasswordRecoveryPage({ reset = false }) {
  const [token] = useState(() => {
    if (!reset) return '';
    const value = new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
    return value;
  });
  useEffect(() => {
    if (reset) window.history.replaceState(null, '', window.location.pathname);
  }, [reset]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (!reset && !username.trim()) { setError('Enter your username.'); return; }
    if (reset && password !== confirm) { setError('Passwords do not match.'); return; }
    if (reset && new TextEncoder().encode(password).length > 72) {
      setError('Your password is too long. Use no more than 72 bytes.'); return;
    }
    setBusy(true);
    try {
      const response = await api.post(reset ? '/auth/reset-password' : '/auth/forgot-password',
        reset ? { token, newPassword: password } : { username: username.trim() });
      setMessage(response.data.message);
      setPassword(''); setConfirm(''); setDone(true);
    } catch (failure) {
      setError(failure.response?.data?.message || 'Unable to complete your request. Please try again.');
    } finally { setBusy(false); }
  }

  return <div className="recovery-page"><div className="recovery-shell">
    <aside className="recovery-story">
      <div className="recovery-brand"><span><ShieldCheck size={22} /></span> Payroll<span className="recovery-brand-dot">.</span></div>
      <div className="recovery-story-content">
        <span className="recovery-eyebrow">ACCOUNT RECOVERY</span>
        <h2>A fresh start.<br /><em>A secure return.</em></h2>
        <p>Get back to your workspace with a few simple steps. We’ll help you take it from here.</p>
        <div className="recovery-art" aria-hidden="true"><div className="recovery-orbit" /><div className="recovery-lock"><LockKeyhole size={46} strokeWidth={1.3} /></div><span className="recovery-art-check"><CheckCircle2 size={22} /></span></div>
      </div>
      <div className="recovery-story-footer"><ShieldCheck size={16} /> Your account. Protected.</div>
    </aside>
    <section className="recovery-card" aria-labelledby="recovery-heading">
    <Link className="recovery-back" to="/login"><ArrowLeft size={16} /> Back to sign in</Link>
    <div className={`recovery-symbol ${done ? 'is-done' : ''}`}>{done ? <CheckCircle2 size={26} /> : reset ? <KeyRound size={26} /> : <Mail size={26} />}</div>
    <div className="recovery-header">
      <span className="recovery-eyebrow">{done ? 'NEXT STEP' : reset ? 'CHOOSE YOUR PASSWORD' : 'LET’S GET YOU BACK IN'}</span>
      <h1 id="recovery-heading">{done ? reset ? 'You’re all set.' : 'Check your inbox.' : reset ? 'Set a new password.' : 'Forgot password?'}</h1>
      <p>{done ? reset ? 'Your next sign-in starts with your new password.' : 'Your next step is just an email away.' : reset ? 'Make it memorable for you. Hard to guess for anyone else.' : 'It happens. Enter your username and we’ll send a recovery link to your registered email.'}</p>
    </div>
    {message && <p className="recovery-notice" role="status">{message}</p>}
    {error && <p role="alert" className="recovery-error">{error}</p>}
    {reset && !token ? <p className="recovery-error" role="alert">This reset link is missing. <Link to="/forgot-password">Request a new link</Link>.</p> : !done && <form onSubmit={submit} aria-busy={busy}>
      {reset ? <>
        <label htmlFor="reset-new-password">New Password</label>
        <div className="recovery-password"><input id="reset-new-password" type={showPassword ? 'text' : 'password'} placeholder="Create a strong password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} /><button type="button" aria-label={showPassword ? 'Hide passwords' : 'Show passwords'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
        <label htmlFor="reset-confirm-password">Confirm Password</label>
        <input id="reset-confirm-password" type={showPassword ? 'text' : 'password'} placeholder="Enter your new password again" autoComplete="new-password" minLength={8} required value={confirm} onChange={e => setConfirm(e.target.value)} />
        <p className="recovery-hint"><ShieldCheck size={15} /> At least 8 characters. Sign in again after resetting.</p>
      </> : <>
        <label htmlFor="recovery-username">Username</label>
        <input id="recovery-username" placeholder="Enter your username" autoComplete="username" required value={username} onChange={e => setUsername(e.target.value)} />
        <p className="recovery-hint">Use the same username you sign in with.</p>
      </>}
      <button className="recovery-submit" disabled={busy}>{busy ? <><LoaderCircle className="recovery-spinner" size={18} /> Please wait...</> : <>{reset ? 'Reset password' : 'Send reset link'}<ArrowRight size={18} /></>}</button>
    </form>}
    {reset && !done && <p className="recovery-secondary"><Link to="/forgot-password">Request a new reset link</Link></p>}
    {!reset && done && <button type="button" className="recovery-submit" onClick={() => { setDone(false); setMessage(''); }}>Try again or resend<ArrowRight size={18} /></button>}
    {reset && done && <Link className="recovery-submit" to="/login">Continue to sign in<ArrowRight size={18} /></Link>}
    <div className="recovery-footnote"><LockKeyhole size={15} /><span>{reset ? 'Your new password stays private and encrypted.' : 'Recovery links expire in 15 minutes.'}</span></div>
  </section></div><p className="recovery-page-footer">Payroll System <span>•</span> Secure account recovery</p></div>;
}

// src/pages/LoginPage.jsx
import React from 'react';
import LoginForm from '../components/LoginForm';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';
import './PasswordRecoveryPage.css';
import './PremiumLogin.css';
import { ShieldCheck, LockKeyhole, Users, BarChart3, ArrowUpRight } from 'lucide-react';

const LoginPage = () => {
  const { authError } = useAuth();
  return (
    <div className="recovery-page premium-login">
      <div className="recovery-shell">
        <aside className="recovery-story">
          <div className="recovery-brand"><span><ShieldCheck size={22} /></span>Payroll<span className="recovery-brand-dot">.</span></div>
          <div className="recovery-story-content">
            <span className="recovery-eyebrow">YOUR PEOPLE. YOUR WORKSPACE.</span>
            <h2>Good work<br />starts with <em>people.</em></h2>
            <p>A little less paperwork. A little more possibility. Your team’s day starts here.</p>
            <div className="login-workspace-preview" aria-hidden="true">
              <div className="login-preview-heading"><span>Everything, connected.</span><ArrowUpRight size={17} /></div>
              <div className="login-preview-row"><span className="login-preview-icon"><Users size={19} /></span><div><strong>Your people</strong><small>One connected team</small></div><span className="login-preview-dot" /></div>
              <div className="login-preview-row"><span className="login-preview-icon"><BarChart3 size={19} /></span><div><strong>Your payroll</strong><small>Clarity in every detail</small></div><span className="login-preview-dot" /></div>
              <div className="login-preview-footer"><ShieldCheck size={14} /> A workspace you can count on</div>
            </div>
          </div>
          <div className="recovery-story-footer"><ShieldCheck size={16} /> Built around your working day.</div>
        </aside>
      <div className="recovery-card login-form-panel">
        <div className="recovery-symbol"><LockKeyhole size={26} /></div>
        <div className="login-header">
          <span className="recovery-eyebrow">YOUR WORKSPACE AWAITS</span>
          <h1>Welcome back.</h1>
          <p>Sign in to pick up where you left off.</p>
        </div>
        {authError && <p className="recovery-notice" role="status">{authError}</p>}
        <LoginForm />
        <div className="recovery-footnote"><ShieldCheck size={15} /> Protected with two-step verification</div>
      </div>
      </div>
      <p className="recovery-page-footer">Payroll System <span>•</span> Your people, in good hands.</p>
    </div>
  );
};

export default LoginPage;

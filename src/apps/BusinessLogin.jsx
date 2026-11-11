import { useState } from 'react';
import logo from '../assets/AquaBest logo.png';
import { DEMO_BUSINESS_ACCOUNTS } from '../services/demoBusinessAuth.js';
import './businessLogin.css';

// Presentation only. Authentication still uses the existing frontend demo adapter.
export default function BusinessLogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [error, setError] = useState('');
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);

  const submit = (event) => {
    event.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Enter your username and password to continue.');
      return;
    }
    if (!onLogin(username, password)) {
      setError('Incorrect username or password. Check your details and try again.');
    }
  };

  return (
    <div className="business-auth">
      <div className="business-auth-layout">
        <section className="business-auth-intro" aria-label="AquaBest business portal">
          <div className="business-auth-brand">
            <img src={logo} alt="AquaBest" />
            <span>BUSINESS OPERATIONS</span>
          </div>
          <div className="business-auth-intro-copy">
            <p className="business-auth-kicker">YOUR WORKSPACE, SIMPLIFIED</p>
            <h1>One station.<br />One connected <em>team.</em></h1>
            <p className="business-auth-description">Manage orders, coordinate refills, track deliveries, and keep daily operations running smoothly—all from one place.</p>
            <div className="business-auth-benefits" aria-label="Workspace features">
              <span>Role-based workspaces</span>
              <span>Daily operations at a glance</span>
              <span>Designed for your team</span>
            </div>
          </div>
          <p className="business-auth-intro-footer">AquaBest Management System <span aria-hidden="true">·</span> Internal workspace</p>
        </section>
        <main className="business-auth-right">
          <div className="business-auth-mobile-brand"><img src={logo} alt="AquaBest" /><span>BUSINESS OPERATIONS</span></div>
          <div className="business-auth-card">
            {recovering ? (
              <>
                <div className="business-auth-heading">
                  <span className="business-auth-eyebrow">ACCOUNT ASSISTANCE</span>
                  <h2>Forgot your password?</h2>
                  <p>Account access is managed by the AquaBest administrator.</p>
                </div>
                <div className="business-auth-help">
                  <strong>How to regain access</strong>
                  <p>Contact your Owner / Admin to request an account reset. Online password recovery is unavailable in this temporary demo.</p>
                </div>
                <button type="button" className="business-auth-button" onClick={() => { setRecovering(false); setError(''); }}>Back to sign in</button>
              </>
            ) : (
              <>
                <div className="business-auth-heading">
                  <span className="business-auth-eyebrow">WELCOME BACK</span>
                  <h2>Sign in to your workspace</h2>
                  <p>Enter your employee credentials to continue.</p>
                </div>
                <form noValidate onSubmit={submit}>
                  <label htmlFor="business-username">Username</label>
                  <div className="business-auth-input">
                    <input id="business-username" type="text" autoComplete="username" placeholder="Enter your username" value={username} onChange={e => { setUsername(e.target.value); setError(''); }} required />
                  </div>
                  <div className="business-auth-password-label">
                    <label htmlFor="business-password">Password</label>
                    <button type="button" className="business-auth-text-button" onClick={() => { setRecovering(true); setError(''); }}>Forgot password?</button>
                  </div>
                  <div className="business-auth-input business-auth-password-input">
                    <input id="business-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} required />
                    <button type="button" className="business-auth-eye" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(v => !v)}>{showPassword ? 'Hide' : 'Show'}</button>
                  </div>
                  {error && <p className="business-auth-error" role="alert">{error}</p>}
                  <button className="business-auth-button" type="submit">Sign in</button>
                </form>
              </>
            )}
            <div className="business-auth-demo">
              <strong>Temporary demo login</strong>
              <p>Frontend preview only. These accounts do not authenticate with the real backend or protect business data.</p>
              {!recovering && (
                <>
                  <button type="button" className="business-auth-demo-toggle" aria-expanded={showDemoAccounts} onClick={() => setShowDemoAccounts(v => !v)}>
                    {showDemoAccounts ? 'Hide demo accounts' : 'View demo accounts'}
                  </button>
                  {showDemoAccounts && (
                    <div className="business-auth-demo-accounts">
                      {DEMO_BUSINESS_ACCOUNTS.map(a => (
                        <button key={a.username} type="button" onClick={() => { setUsername(a.username); setPassword(a.password); setError(''); }}>
                          <span>{a.label}</span><code>{a.username} / {a.password}</code>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="business-auth-bottom">For AquaBest personnel <span aria-hidden="true">·</span> <a href={import.meta.env.BASE_URL}>Customer website</a></div>
        </main>
      </div>
    </div>
  );
}

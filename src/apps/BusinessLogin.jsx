import { useState } from 'react';
import { FiArrowRight, FiArrowLeft, FiEye, FiEyeOff, FiLock, FiUser, FiShield, FiHelpCircle, FiCheckCircle } from 'react-icons/fi';
import logo from '../assets/AquaBest logo.png';
import { DEMO_BUSINESS_ACCOUNTS } from '../services/demoBusinessAuth.js';
import './businessLogin.css';

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

  return <div className="business-auth">
    <div className="business-auth-layout">
      <section className="business-auth-intro" aria-label="AquaBest business portal">
        <div className="business-auth-mark"><img src={logo} alt="AquaBest" /><span>BUSINESS OPERATIONS</span></div>
        <div className="business-auth-intro-copy">
          <div className="business-auth-kicker"><span className="business-auth-pulse"/> ONE CONNECTED WORKSPACE</div>
          <h1>Everything your station needs, <em>in one place.</em></h1>
          <p>Stay on top of orders, refills, deliveries, and daily operations from your dedicated AquaBest workspace.</p>
          <div className="business-auth-benefits"><span><FiCheckCircle/> Role-specific dashboards</span><span><FiCheckCircle/> Easy daily task management</span><span><FiCheckCircle/> Works on mobile and desktop</span></div>
        </div>
        <div className="business-auth-intro-footer">AquaBest Management System <span>•</span> Internal workspace</div>
      </section>
      <main className="business-auth-right">
        <div className="business-auth-mobile-brand"><img src={logo} alt="AquaBest" /><span>Business Portal</span></div>
        <div className="business-auth-card">
          <div className="business-auth-icon">{recovering ? <FiHelpCircle/> : <FiShield/>}</div>
          {recovering ? <>
            <div className="business-auth-heading"><span className="business-auth-eyebrow">ACCOUNT ASSISTANCE</span><h2>Forgot your password?</h2><p>Your account is managed by the AquaBest administrator.</p></div>
            <div className="business-auth-help"><strong>How to regain access</strong><p>Contact your Owner / Admin and ask them to reset your employee credentials. Online password recovery is unavailable in this temporary demonstration.</p><p><strong>Demo only:</strong> The test usernames and passwords are listed below on the sign-in page.</p></div>
            <button type="button" className="business-auth-button" onClick={() => { setRecovering(false); setError(''); }}><FiArrowLeft/> Back to sign in</button>
          </> : <>
            <div className="business-auth-heading"><span className="business-auth-eyebrow">WELCOME BACK</span><h2>Sign in to your workspace</h2><p>Enter your employee credentials to continue.</p></div>
            <form noValidate onSubmit={submit}>
              <label htmlFor="business-username">Username</label>
              <div className="business-auth-input"><FiUser aria-hidden="true"/><input id="business-username" type="text" autoComplete="username" placeholder="Enter your username" value={username} onChange={e => { setUsername(e.target.value); setError(''); }} required /></div>
              <div className="business-auth-password-label"><label htmlFor="business-password">Password</label><button type="button" className="business-auth-text-button" onClick={() => { setRecovering(true); setError(''); }}>Forgot password?</button></div>
              <div className="business-auth-input"><FiLock aria-hidden="true"/><input id="business-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} required /><button type="button" className="business-auth-eye" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(v => !v)}>{showPassword ? <FiEyeOff/> : <FiEye/>}</button></div>
              {error && <p className="business-auth-error" role="alert">{error}</p>}
              <button className="business-auth-button" type="submit">Sign in <FiArrowRight/></button>
            </form>
          </>}
          <div className="business-auth-demo">
            <div className="business-auth-demo-title"><span>DEMO ACCESS ONLY</span><span className="business-auth-demo-dot"/></div>
            <p>This temporary frontend login does not connect to the real backend and does not protect production data.</p>
            {!recovering && <><button type="button" className="business-auth-demo-toggle" aria-expanded={showDemoAccounts} onClick={() => setShowDemoAccounts(v => !v)}>{showDemoAccounts ? 'Hide demo accounts' : 'View demo accounts'}</button>
            {showDemoAccounts && <div className="business-auth-demo-accounts">{DEMO_BUSINESS_ACCOUNTS.map(a => <button key={a.username} type="button" onClick={() => { setUsername(a.username); setPassword(a.password); setError(''); }}><span>{a.label}</span><code>{a.username} / {a.password}</code></button>)}</div>}</>}
          </div>
        </div>
        <div className="business-auth-bottom">For authorized AquaBest personnel <span>·</span> <a href={import.meta.env.BASE_URL}>Customer website</a></div>
      </main>
    </div>
  </div>;
}

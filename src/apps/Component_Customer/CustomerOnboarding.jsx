import { useState } from 'react';
import { FiArrowLeft, FiArrowRight, FiCheckCircle, FiLock, FiMapPin, FiPhone, FiShield, FiUser } from 'react-icons/fi';
import logo from '../../assets/AquaBest logo.png';
import deliveryModel from '../../assets/Model_Imgs/DeliverModel.png';

const defaultProfile = { fullName: '', address: { street: '', barangay: '', city: 'Quezon City', landmark: '' } };
const validPhone = (value) => /^09\d{9}$/.test(value.replace(/\s/g, ''));
export default function CustomerOnboarding({ onComplete, sampleCustomer }) {
  const [stage, setStage] = useState('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(defaultProfile);
  const setAddress = (key, value) => setProfile(p => ({ ...p, address: { ...p.address, [key]: value } }));
  const knownCustomer = sampleCustomer && phone.replace(/\s/g, '') === sampleCustomer.phone;
  const verify = (event) => {
    event.preventDefault();
    // UI prototype only. DO NOT use this code for production authentication.
    if (code !== '111111') { setError('For local UI testing, enter 111111. No SMS is sent.'); return; }
    setError('');
    if (knownCustomer) onComplete(sampleCustomer);
    else setStage('profile');
  };
  const save = (event) => {
    event.preventDefault();
    if (!profile.fullName.trim() || !profile.address.street.trim() || !profile.address.barangay.trim()) return;
    onComplete({ id: 'local-preview', phone: phone.replace(/\s/g, ''), fullName: profile.fullName.trim(), address: { ...profile.address } });
  };
  return (
    <main className={`onboarding-shell ${stage === "phone" ? "phone-entry-screen" : ""}`}>
      <div className="onboarding-top"><img src={logo} alt="AquaBest" /></div>
      {stage !== 'phone' && <button type="button" className="onboarding-back" onClick={() => { setStage(stage === 'otp' ? 'phone' : 'otp'); setError(''); }}><FiArrowLeft /> Back</button>}
      
      {stage === 'phone' && <section className="onboarding-step welcome-stage">
        <h1>Welcome to AquaBest!</h1><p>Enter your mobile number to get started with your water orders.</p>
        <div className="onboarding-photo"><img src={deliveryModel} alt="AquaBest delivery staff helping a customer with a water container" /></div>
        <form onSubmit={(event)=> { event.preventDefault(); setStage('otp'); setError(''); }} className="onboarding-form welcome-phone-form">
          <label htmlFor="start-phone">Mobile number</label>
          <div className="field-with-icon"><FiPhone /><input id="start-phone" autoComplete="tel" type="tel" inputMode="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="0917 123 4567" required /></div>
          <small>Use an 11-digit Philippine number beginning with 09.</small>
          <button type="submit" className="btn order-primary" disabled={!validPhone(phone)}>Continue <FiArrowRight /></button>
        </form>
      </section>}
      {stage==='otp' && <section className="onboarding-step otp-stage">
        <div className="onboarding-symbol"><FiShield size={32}/></div><h1>Enter the 6-digit code</h1>
        <p>Verification code for <strong>{phone}</strong></p>
        <form className="onboarding-form" onSubmit={verify}>
          <label htmlFor="otp-code">Verification code</label>
          <input id="otp-code" className="otp-input" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" required value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} placeholder="••••••" />
          <small>Local preview code: <strong>111111</strong> — SMS verification is not active yet.</small>
          {error && <p className="onboarding-error" role="alert">{error}</p>}
          <button type="submit" className="btn order-primary" disabled={code.length!==6}>Verify & Continue <FiArrowRight /></button>
        </form>
      </section>}
      {stage==='profile' && <section className="onboarding-step">
        <div className="onboarding-verified"><FiCheckCircle /> Number checked for this prototype</div>
        <h1>Complete your details</h1><p>We'll prefill these next time you order water.</p>
        <form onSubmit={save} className="onboarding-form">
          <label htmlFor="join-name"><FiUser/> Full name</label><input id="join-name" className="form-control" autoComplete="name" value={profile.fullName} onChange={e=>setProfile(p=>({...p,fullName:e.target.value}))} required maxLength={80} placeholder="Full name" />
          <h2><FiMapPin /> Delivery address</h2>
          <label htmlFor="join-street">House / Unit / Street</label><input id="join-street" className="form-control" autoComplete="address-line1" value={profile.address.street} onChange={e=>setAddress('street',e.target.value)} required placeholder="House no., street and subdivision" />
          <label htmlFor="join-barangay">Barangay</label><input id="join-barangay" className="form-control" value={profile.address.barangay} onChange={e=>setAddress('barangay',e.target.value)} required placeholder="Barangay" />
          <label htmlFor="join-landmark">Landmark (optional)</label><input id="join-landmark" className="form-control" value={profile.address.landmark} onChange={e=>setAddress('landmark',e.target.value)} placeholder="Nearby landmark" />
          <button className="btn order-primary" type="submit">Save & Continue <FiArrowRight /></button>
        </form>
      </section>}
      <p className="onboarding-footer"><FiLock /> Prototype only — no real OTP, account, or order is created.</p>
    </main>
  );
}

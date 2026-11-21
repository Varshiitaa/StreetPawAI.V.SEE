import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  User, 
  Sparkles,
  Building2,
  AlertCircle,
  CheckCircle2,
  Phone
} from 'lucide-react';

export default function AuthPage({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('citizen'); // 'citizen' | 'govt_official' | 'ngo_staff'
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [orgName, setOrgName] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Real backend submission for login or signup
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (isLogin) {
        // Real Backend Login API
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username_or_email: email || username,
            password: password
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || 'Invalid username/email or password.');
        }

        // Store auth token
        if (data.access_token) {
          localStorage.setItem('streetpaw_token', data.access_token);
        }

        // Forward authenticated user with explicit name and identity
        onLoginSuccess({
          ...data.user,
          name: data.user.full_name || data.user.username,
          role: (data.user.role === 'govt_official' || data.user.role === 'ngo_staff') ? 'ngo' : 'citizen'
        });

      } else {
        // Real Backend Signup API
        const cleanUser = username || email.split('@')[0] || `user_${Date.now()}`;
        const targetRole = role === 'citizen' ? 'citizen' : (role === 'govt_official' ? 'govt_official' : 'ngo_staff');

        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email,
            username: cleanUser,
            password: password,
            full_name: fullName || cleanUser,
            phone: phone || null,
            role: targetRole,
            organisation_name: orgName || (role !== 'citizen' ? 'BBMP Stray Animal Welfare Unit' : null),
            organisation_type: role === 'govt_official' ? 'GOVT' : 'NGO',
            city: 'Bengaluru',
            state: 'Karnataka'
          })
        });

        const data = await res.json();
        if (!res.ok) {
          let errText = 'Registration failed. Check inputs.';
          if (typeof data.detail === 'string') {
            errText = data.detail;
          } else if (Array.isArray(data.detail)) {
            errText = data.detail.map(d => `${d.loc ? d.loc.slice(-1)[0] : 'field'}: ${d.msg}`).join('; ');
          } else if (data.detail && typeof data.detail === 'object') {
            errText = JSON.stringify(data.detail);
          }
          throw new Error(errText);
        }

        if (data.access_token) {
          localStorage.setItem('streetpaw_token', data.access_token);
        }

        alert("Account created successfully!");
        onLoginSuccess({
          ...data.user,
          name: data.user.full_name || data.user.username,
          role: (data.user.role === 'govt_official' || data.user.role === 'ngo_staff') ? 'ngo' : 'citizen'
        });
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (selectedRole) => {
    setErrorMsg('');
    if (selectedRole === 'ngo') {
      setRole('govt_official');
      setEmail('gov@streetpaw.ai');
      setUsername('gov_officer');
      setPassword('password123');
      setFullName('Municipal Welfare Officer');
    } else {
      setRole('citizen');
      setEmail('citizen@streetpaw.ai');
      setUsername('citizen_user');
      setPassword('password123');
      setFullName('Community Caregiver');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      background: 'radial-gradient(circle at 50% 20%, #1a0808 0%, #0d0404 40%, #07090e 100%)'
    }}>
      <div className="cyber-card" style={{
        width: '100%',
        maxWidth: '460px',
        padding: '36px 30px',
        borderColor: 'rgba(239, 68, 68, 0.25)',
        boxShadow: '0 0 35px rgba(239, 68, 68, 0.15)'
      }}>
        
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(239, 68, 68, 0.12)',
            padding: '5px 14px',
            borderRadius: '9999px',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            fontSize: '11px',
            fontWeight: 700,
            marginBottom: '12px'
          }}>
            <Sparkles size={12} color="#ef4444" />
            STREETPAW SECURE PORTAL
          </div>

          <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#fff', marginBottom: '4px' }}>
            StreetPaw<span style={{ color: '#ef4444' }}>.AI</span>
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {isLogin ? 'Sign in to access your assigned welfare portal' : 'Create an account to join the animal welfare network'}
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px'
          }}>
            <AlertCircle size={15} color="#ef4444" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: SELECT YOUR ACCOUNT TYPE (CITIZEN OR GOVT/NGO) */}
        <div style={{ marginBottom: '18px' }}>
          <label style={{ fontSize: '11px', color: '#f87171', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
            SELECT YOUR ACCESS ROLE:
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            background: '#0a0404',
            padding: '5px',
            borderRadius: '10px',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            <button
              type="button"
              onClick={() => setRole('citizen')}
              style={{
                padding: '10px 0',
                borderRadius: '8px',
                border: 'none',
                background: role === 'citizen' ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : 'transparent',
                color: '#fff',
                fontWeight: 700,
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                boxShadow: role === 'citizen' ? '0 0 14px rgba(239, 68, 68, 0.5)' : 'none'
              }}
            >
              <User size={15} />
              Citizen
            </button>

            <button
              type="button"
              onClick={() => setRole('govt_official')}
              style={{
                padding: '10px 0',
                borderRadius: '8px',
                border: 'none',
                background: role !== 'citizen' ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : 'transparent',
                color: '#fff',
                fontWeight: 700,
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                boxShadow: role !== 'citizen' ? '0 0 14px rgba(239, 68, 68, 0.5)' : 'none'
              }}
            >
              <Building2 size={15} />
              Govt / NGO
            </button>
          </div>
        </div>

        {/* Quick Demo Credentials fill buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
          <button 
            type="button"
            onClick={() => handleDemoFill('citizen')}
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#fca5a5',
              fontSize: '11px',
              padding: '5px 12px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Fill Demo Citizen
          </button>
          <button 
            type="button"
            onClick={() => handleDemoFill('ngo')}
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#fca5a5',
              fontSize: '11px',
              padding: '5px 12px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Fill Demo Govt/NGO
          </button>
        </div>

        {/* Main Sign in / Sign Up Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {!isLogin && (
            <div>
              <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                {role !== 'citizen' ? 'Official / Organization Name' : 'Full Name'}
              </label>
              <input 
                type="text" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                placeholder={role !== 'citizen' ? 'e.g. BBMP Animal Welfare Division' : 'e.g. Caregiver Name'}
                required
                style={{
                  width: '100%',
                  background: '#090d16',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
              {isLogin ? 'Email Address or Username' : 'Email Address'}
            </label>
            <input 
              type={isLogin ? "text" : "email"} 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder={isLogin ? "caregiver@streetpaw.ai or username" : "caregiver@gmail.com"}
              required
              style={{
                width: '100%',
                background: '#090d16',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '10px 12px',
                color: '#fff',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          {!isLogin && (
            <div>
              <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                Choose Username
              </label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="e.g. caregiver_99"
                required
                style={{
                  width: '100%',
                  background: '#090d16',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                background: '#090d16',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '10px 12px',
                color: '#fff',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            style={{
              width: '100%', 
              justifyContent: 'center', 
              marginTop: '6px', 
              padding: '12px 0',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 800,
              fontSize: '13px',
              color: '#fff',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #991b1b 100%)',
              boxShadow: '0 4px 16px rgba(239, 68, 68, 0.45)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {loading ? 'Authenticating with Central DB...' : (isLogin 
              ? (role !== 'citizen' ? 'Access Govt / NGO Portal →' : 'Access Citizen Portal →') 
              : 'Create Account & Enter Platform →')}
          </button>
        </form>

        {/* Toggle sign in / sign up */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: 'var(--text-dim)' }}>
          {isLogin ? (
            <span>New user? <button onClick={() => { setIsLogin(false); setErrorMsg(''); }} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontWeight: 700 }}>Create an account</button></span>
          ) : (
            <span>Already have an account? <button onClick={() => { setIsLogin(true); setErrorMsg(''); }} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontWeight: 700 }}>Sign In</button></span>
          )}
        </div>
      </div>
    </div>
  );
}

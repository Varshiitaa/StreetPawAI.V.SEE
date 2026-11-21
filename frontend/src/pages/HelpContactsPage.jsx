import React, { useState, useEffect } from 'react';
import { 
  PhoneCall, 
  ShieldCheck, 
  Heart, 
  Building2, 
  Scale, 
  Search, 
  Copy, 
  Check, 
  ExternalLink, 
  MessageCircle, 
  AlertCircle, 
  Plus, 
  MapPin, 
  RefreshCw, 
  CheckCircle2 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function HelpContactsPage() {
  const { user, token } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [copiedId, setCopiedId] = useState(null);

  // Suggest Contact Modal
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  const [suggestForm, setSuggestForm] = useState({
    name: '',
    type: 'Helpline',
    phone: '',
    email: '',
    website: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    services: 'Emergency Rescue',
    hours: '24/7 Emergency'
  });
  const [suggestSuccess, setSuggestSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, [selectedService, selectedCity, searchQuery]);

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      let url = '/api/contacts?';
      if (searchQuery) url += `q=${encodeURIComponent(searchQuery)}&`;
      if (selectedService !== 'all') url += `service=${encodeURIComponent(selectedService)}&`;
      if (selectedCity !== 'all') url += `city=${encodeURIComponent(selectedCity)}&`;

      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setContacts(data);
      }
    } catch (e) {
      console.error('Error fetching contacts:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyDetails = (id, textToCopy) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSuggestSubmit = async (e) => {
    e.preventDefault();
    const curToken = token || localStorage.getItem('streetpaw_token') || localStorage.getItem('ngo_token');
    if (!curToken) return alert('Please login to suggest a contact.');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/contacts/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${curToken}`
        },
        body: JSON.stringify({
          ...suggestForm,
          services: suggestForm.services.split(',').map(s => s.trim())
        })
      });
      if (res.ok) {
        setSuggestSuccess(true);
        setTimeout(() => {
          setSuggestSuccess(false);
          setIsSuggestModalOpen(false);
          fetchContacts();
        }, 1500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const emergencyContacts = contacts.filter(c => c.is_24x7);

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1440px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              ● CENTRAL VETERINARY & RESCUE DIRECTORY
            </span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
            Emergency Helplines & Verified NGO Directory
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Direct ambulance dispatch, 24/7 veterinary trauma hospitals, municipal stray cells, and legal protection helplines.
          </p>
        </div>

        <button 
          onClick={() => setIsSuggestModalOpen(true)}
          className="btn-emerald"
          style={{ padding: '9px 16px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={15} />
          Suggest a Contact
        </button>
      </div>

      {/* 24/7 Emergency Amber/Rose Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(15, 23, 42, 0.95) 100%)',
        border: '1px solid rgba(239, 68, 68, 0.35)',
        borderRadius: '14px',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: 800, fontSize: '14px' }}>
          <AlertCircle size={20} />
          <span>24/7 EMERGENCY AMBULANCE & RESCUE DISPATCH</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
          {emergencyContacts.slice(0, 3).map((ec) => (
            <div key={ec.id} style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '10px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '10px'
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>{ec.name}</div>
                <div style={{ fontSize: '12px', color: '#fca5a5', marginTop: '2px' }}>📍 {ec.city} • 24/7 Emergency Helpline</div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <a 
                  href={`tel:${ec.phone}`} 
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: '#10b981',
                    color: '#fff',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '12px'
                  }}
                >
                  <PhoneCall size={14} /> Call {ec.phone}
                </a>
                <a 
                  href={`https://wa.me/${ec.phone?.replace(/[^0-9]/g, '')}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    background: '#25D366',
                    color: '#fff',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '12px'
                  }}
                >
                  <MessageCircle size={14} /> WhatsApp
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="cyber-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['all', 'Emergency Rescue', 'Veterinary Ambulance', 'Cruelty Reporting', 'ABC Sterilization'].map((srv) => (
            <button
              key={srv}
              type="button"
              onClick={() => setSelectedService(srv)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                border: selectedService === srv ? '1px solid var(--accent-emerald)' : '1px solid var(--border-color)',
                background: selectedService === srv ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                color: selectedService === srv ? 'var(--accent-emerald)' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              {srv === 'all' ? 'All Services' : srv}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search organisation name, phone, or neighborhood..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: '#090d16',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '9px 12px 9px 36px',
                color: '#fff',
                fontSize: '13px'
              }}
            />
          </div>

          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            style={{
              background: '#090d16',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '9px 16px',
              color: '#fff',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Cities</option>
            <option value="Bengaluru">Bengaluru</option>
            <option value="Chennai">Chennai</option>
            <option value="New Delhi">New Delhi</option>
            <option value="Mumbai">Mumbai</option>
          </select>
        </div>
      </div>

      {/* Main Contacts Card Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          Loading helpline directory from central database...
        </div>
      ) : contacts.length === 0 ? (
        <div className="cyber-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No helpline entries match the selected filters.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '18px' }}>
          {contacts.map((c) => {
            const isCopied = copiedId === c.id;
            const fullCopyText = `${c.name}\nPhone: ${c.phone}\nEmail: ${c.email || 'N/A'}\nCity: ${c.city}`;

            return (
              <div 
                key={c.id} 
                className="cyber-card" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between', 
                  gap: '14px',
                  padding: '20px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: 'var(--accent-emerald)',
                      border: '1px solid rgba(16, 185, 129, 0.3)'
                    }}>
                      ✓ VERIFIED HELPLINE
                    </span>
                    {c.is_24x7 && (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.3)'
                      }}>
                        24/7 EMERGENCY
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
                    {c.name}
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={13} color="var(--primary-coral)" /> {c.city}, {c.state} • <strong style={{ color: '#cbd5e1' }}>{c.type}</strong>
                  </div>

                  {c.services && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '12px' }}>
                      {(Array.isArray(c.services) ? c.services : [c.services]).map((s, idx) => (
                        <span 
                          key={idx}
                          style={{
                            fontSize: '10px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border-color)',
                            color: '#94a3b8',
                            padding: '2px 7px',
                            borderRadius: '4px'
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: '12px', fontSize: '11.5px', color: 'var(--text-dim)' }}>
                    ⏰ Operating Hours: <strong style={{ color: '#fff' }}>{c.hours || '24 Hours / 7 Days'}</strong>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <a
                    href={`tel:${c.phone}`}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: 'var(--accent-emerald)',
                      textDecoration: 'none',
                      fontSize: '11.5px',
                      fontWeight: 700
                    }}
                  >
                    <PhoneCall size={13} /> Call
                  </a>

                  <a
                    href={`https://wa.me/${c.phone?.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: 'rgba(37, 211, 102, 0.15)',
                      border: '1px solid rgba(37, 211, 102, 0.3)',
                      color: '#25D366',
                      textDecoration: 'none',
                      fontSize: '11.5px',
                      fontWeight: 700
                    }}
                  >
                    <MessageCircle size={13} /> WhatsApp
                  </a>

                  {c.website && (
                    <a
                      href={c.website}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: 'rgba(59, 130, 246, 0.15)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        color: '#60a5fa',
                        textDecoration: 'none',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}

                  <button
                    onClick={() => handleCopyDetails(c.id, fullCopyText)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: isCopied ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-color)',
                      color: isCopied ? 'var(--accent-emerald)' : '#fff',
                      fontSize: '11.5px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Copy details"
                  >
                    {isCopied ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Suggest Contact Modal */}
      {isSuggestModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="cyber-card" style={{ maxWidth: '440px', width: '100%', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '14px' }}>
              Suggest Verified Animal Welfare Contact
            </h3>
            {suggestSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--accent-emerald)', fontWeight: 700 }}>
                ✓ Thank you! Suggestion submitted for verification.
              </div>
            ) : (
              <form onSubmit={handleSuggestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Organisation / Clinic Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SARVAM Animal Care"
                    value={suggestForm.name}
                    onChange={e => setSuggestForm({ ...suggestForm, name: e.target.value })}
                    style={{ width: '100%', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '13px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Phone Number</label>
                    <input
                      type="text"
                      required
                      placeholder="+91 98450 XXXXX"
                      value={suggestForm.phone}
                      onChange={e => setSuggestForm({ ...suggestForm, phone: e.target.value })}
                      style={{ width: '100%', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>City</label>
                    <input
                      type="text"
                      required
                      value={suggestForm.city}
                      onChange={e => setSuggestForm({ ...suggestForm, city: e.target.value })}
                      style={{ width: '100%', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '13px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Services (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="Emergency Ambulance, Sterilization, X-Ray"
                    value={suggestForm.services}
                    onChange={e => setSuggestForm({ ...suggestForm, services: e.target.value })}
                    style={{ width: '100%', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '13px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setIsSuggestModalOpen(false)}
                    style={{ flex: 1, padding: '9px', background: 'transparent', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-emerald"
                    style={{ flex: 1, padding: '9px', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Contact'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

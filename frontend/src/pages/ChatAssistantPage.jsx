import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Phone, 
  AlertTriangle, 
  HelpCircle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Sparkles,
  ChevronRight,
  ExternalLink,
  Search,
  Shield,
  Building2,
  Stethoscope,
  X
} from 'lucide-react';

export default function ChatAssistantPage({ onOpenSos, onOpenMap }) {
  const [messages, setMessages] = useState([
    {
      sender: 'pawly',
      text: "Hello! I am Pawly, your StreetPaw AI Animal Welfare Copilot. If you spot an animal in distress, click any triage protocol below or ask me first-aid, medical, and legal questions.",
      category: 'Welcome'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [guidedQuestions, setGuidedQuestions] = useState([]);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search & Filter state for Emergency Contacts Directory
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'GOVERNMENT' | 'NGO' | 'HOSPITAL'
  const [only24x7, setOnly24x7] = useState(false);

  useEffect(() => {
    // Fetch guided distress questions
    fetch('/api/chat/guided-questions')
      .then(res => res.json())
      .then(data => {
        if (data.questions) setGuidedQuestions(data.questions);
      })
      .catch(err => console.log(err));

    fetchContacts();
  }, []);

  const fetchContacts = (q = '', type = '', is24 = null) => {
    let url = '/api/chat/emergency-contacts?';
    const params = [];
    if (q) params.push(`q=${encodeURIComponent(q)}`);
    if (type && type !== 'ALL') {
      if (type === 'GOVERNMENT') params.push(`type=Government`);
      else if (type === 'NGO') params.push(`type=NGO`);
      else if (type === 'HOSPITAL') params.push(`type=Vet Hospital`);
    }
    if (is24 !== null && is24) params.push(`is_24x7=true`);

    url += params.join('&');

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.contacts) setEmergencyContacts(data.contacts);
      })
      .catch(err => console.log(err));
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    fetchContacts(searchQuery, filterType, only24x7);
  };

  const handleFilterChange = (type) => {
    setFilterType(type);
    fetchContacts(searchQuery, type, only24x7);
  };

  const handleToggle24x7 = () => {
    const nextVal = !only24x7;
    setOnly24x7(nextVal);
    fetchContacts(searchQuery, filterType, nextVal);
  };

  const handleSelectGuidedQuestion = (q) => {
    const userMsg = { sender: 'user', text: q.question };
    const botMsg = { 
      sender: 'pawly', 
      text: q.steps.join('\n\n'), 
      category: q.category, 
      isGuided: true 
    };
    setMessages(prev => [...prev, userMsg, botMsg]);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText })
      });
      const data = await res.json();
      setMessages(prev => [
        ...prev, 
        { 
          sender: 'pawly', 
          text: data.reply || "I am connected to the welfare network. If this is a critical medical emergency, please trigger the SOS button immediately.", 
          category: data.category 
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev, 
        { 
          sender: 'pawly', 
          text: "I encountered a network issue. For immediate animal emergencies, please reach out directly to the emergency contacts listed on the right.", 
          category: 'Error' 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              ● 24/7 FIELD TRIAGE ASSISTANT & EMERGENCY RESCUE HELPLINES
            </span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
            Pawly AI Copilot & Emergency Directory
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Instant guidance for animals in distress, first-aid protocols, and live verified NGO & Government telephone helplines.
          </p>
        </div>

        <button 
          onClick={onOpenSos}
          className="badge-sos"
          style={{ padding: '10px 18px', fontSize: '12.5px', cursor: 'pointer' }}
        >
          <AlertTriangle size={15} />
          REPORT DISTRESS SOS
        </button>
      </div>

      {/* Main Grid: Guided Chat (Left) & Emergency Contacts (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '22px' }}>
        
        {/* Left Column: Interactive Chat & Guided Distress Steps */}
        <div className="cyber-card" style={{ display: 'flex', flexDirection: 'column', minHeight: '620px', height: 'auto', padding: '18px' }}>
          
          {/* Guided Questions Header */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={13} color="var(--accent-emerald)" />
              PREDEFINED DISTRESS QUESTIONS (CLICK TO PROCEED):
            </div>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
              {guidedQuestions.map((q) => (
                <button
                  key={q.id}
                  onClick={() => handleSelectGuidedQuestion(q)}
                  style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    color: '#a7f3d0',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-emerald)';
                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.35)';
                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                  }}
                >
                  <span>{q.category}</span>
                  <ChevronRight size={12} color="var(--accent-emerald)" />
                </button>
              ))}
            </div>
          </div>

          {/* Chat Messages Body */}
          <div style={{
            flex: 1,
            minHeight: '380px',
            maxHeight: '520px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            paddingRight: '6px',
            marginBottom: '14px'
          }}>
            {messages.map((m, idx) => (
              <div 
                key={idx}
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '88%',
                  background: m.sender === 'user' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#081119',
                  color: '#fff',
                  border: m.sender === 'user' ? 'none' : '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  fontSize: '12.5px',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-line',
                  boxShadow: m.sender === 'user' ? '0 4px 14px rgba(16, 185, 129, 0.25)' : 'none'
                }}
              >
                {m.category && m.sender === 'pawly' && (
                  <div style={{
                    fontSize: '10px',
                    color: 'var(--accent-emerald)',
                    fontWeight: 700,
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    ● {m.category}
                  </div>
                )}
                {m.text}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', color: 'var(--text-dim)', fontSize: '11px', fontStyle: 'italic' }}>
                Pawly is consulting first-aid protocols...
              </div>
            )}
          </div>

          {/* Chat Input Bar */}
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text"
              placeholder="Ask how to handle an animal emergency, medication, or food..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              style={{
                flex: 1,
                background: '#070f17',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#fff',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              className="btn-primary"
              style={{ padding: '0 18px', fontSize: '13px' }}
            >
              <Send size={15} />
            </button>
          </form>
        </div>

        {/* Right Column: Searchable NGO & Govt Emergency Directory */}
        <div className="cyber-card" style={{ display: 'flex', flexDirection: 'column', minHeight: '620px', height: 'auto', padding: '20px' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Phone size={17} color="var(--accent-emerald)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Emergency Helplines Directory</h3>
            </div>
            <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', padding: '3px 10px', borderRadius: '4px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {emergencyContacts.length} HELPLINES
            </span>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Search verified NGO and Government contacts for immediate rescue dispatch, ambulances, trauma, and cruelty reporting.
          </p>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input 
                type="text"
                placeholder="Search NGO, Govt, city, or service (e.g. BBMP, CARE, Ambulance, Dog Bite)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  fetchContacts(e.target.value, filterType, only24x7);
                }}
                style={{
                  width: '100%',
                  background: '#070f17',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '9px 12px 9px 34px',
                  color: '#fff',
                  fontSize: '12.5px',
                  outline: 'none'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    fetchContacts('', filterType, only24x7);
                  }}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '10px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer'
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </form>

          {/* Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {[
              { id: 'ALL', label: 'All Contacts', icon: null },
              { id: 'GOVERNMENT', label: 'Government', icon: Building2 },
              { id: 'NGO', label: 'NGOs', icon: Shield },
              { id: 'HOSPITAL', label: 'Vet Hospitals', icon: Stethoscope },
            ].map(f => {
              const IconComp = f.icon;
              const isActive = filterType === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => handleFilterChange(f.id)}
                  style={{
                    background: isActive ? 'var(--accent-emerald)' : 'rgba(255, 255, 255, 0.05)',
                    color: isActive ? '#fff' : '#d1d5db',
                    border: isActive ? '1px solid var(--accent-emerald)' : '1px solid var(--border-color)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s'
                  }}
                >
                  {IconComp && <IconComp size={11} />}
                  <span>{f.label}</span>
                </button>
              );
            })}

            <button
              onClick={handleToggle24x7}
              style={{
                background: only24x7 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                color: only24x7 ? '#34d399' : '#9ca3af',
                border: only24x7 ? '1px solid #10b981' : '1px solid var(--border-color)',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                marginLeft: 'auto'
              }}
            >
              <Clock size={11} />
              <span>24/7 Only</span>
            </button>
          </div>

          {/* Search Results List */}
          <div style={{ flex: 1, minHeight: '380px', maxHeight: '520px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
            {emergencyContacts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-dim)', fontSize: '13px' }}>
                No emergency contacts found matching "{searchQuery}". Try searching for another city, "Govt", or "NGO".
              </div>
            ) : (
              emergencyContacts.map((c) => (
                <div 
                  key={c.id}
                  style={{
                    background: '#070f17',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    transition: 'border-color 0.15s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-emerald)'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.2)'}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <span style={{
                        fontSize: '9.5px',
                        padding: '1px 6px',
                        borderRadius: '3px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: c.type?.toLowerCase().includes('govt') ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                        color: c.type?.toLowerCase().includes('govt') ? '#93c5fd' : '#a7f3d0'
                      }}>
                        {c.type}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <MapPin size={10} /> {c.city || 'Bengaluru'}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '3px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {c.name}
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '5px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {Array.isArray(c.services) ? c.services.join(' • ') : (c.services || 'Rescue & Trauma Care')}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '10px',
                        color: c.is_24x7 ? '#34d399' : '#f59e0b',
                        background: c.is_24x7 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontWeight: 700
                      }}>
                        {c.is_24x7 ? '● 24/7 Service' : `● ${c.hours || 'Day Hours'}`}
                      </span>

                      {c.phone && (
                        <span style={{ fontSize: '11px', color: '#fff', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                          {c.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  <a 
                    href={`tel:${c.phone}`}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#fff',
                      borderRadius: '8px',
                      padding: '9px 13px',
                      textDecoration: 'none',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxShadow: '0 2px 10px rgba(16, 185, 129, 0.35)',
                      flexShrink: 0
                    }}
                  >
                    <Phone size={13} />
                    Call
                  </a>
                </div>
              ))
            )}
          </div>

          {/* Quick Notice */}
          <div style={{
            marginTop: '12px',
            padding: '10px 12px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            fontSize: '11px',
            color: '#a7f3d0',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
            <span>Emergency calls connect directly to municipal and NGO field ambulances.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

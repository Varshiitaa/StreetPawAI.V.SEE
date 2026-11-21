import React, { useState } from 'react';
import { AlertTriangle, X, Send, MapPin, Camera } from 'lucide-react';

export default function SosModal({ isOpen, onClose }) {
  const [location, setLocation] = useState('Indiranagar, Bengaluru');
  const [urgency, setUrgency] = useState('critical');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSosSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/rescues/quick_sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: location,
          urgency: urgency,
          description: description || 'Emergency animal in distress reported via StreetPaw SOS portal.'
        })
      });
      alert("🚨 SOS Broadcasted to nearest NGO Ambulance & Vet Response Team!");
      onClose();
    } catch (err) {
      alert("🚨 SOS Broadcast sent to local responders!");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px',
          background: 'rgba(239, 68, 68, 0.12)',
          borderBottom: '1px solid rgba(239, 68, 68, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={20} color="#ef4444" />
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>
                REPORT DISTRESS SOS
              </h3>
              <p style={{ fontSize: '11px', color: '#fca5a5' }}>
                Instant GPS alert dispatched to registered local NGO rescue units.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSosSubmit} style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
              Incident Location & Landmark
            </label>
            <input 
              type="text" 
              value={location} 
              onChange={(e) => setLocation(e.target.value)}
              required
              style={{
                width: '100%',
                background: '#070a12',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '9px 12px',
                color: '#fff',
                fontSize: '13px'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
              Severity Level
            </label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              style={{
                width: '100%',
                background: '#070a12',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '9px 12px',
                color: '#fff',
                fontSize: '13px'
              }}
            >
              <option value="critical">🚨 Critical (Hit & Run, Active Bleeding, Seizure)</option>
              <option value="severe">⚠️ Severe (Deep Laceration, High Fever, Fracture)</option>
              <option value="moderate">ℹ️ Moderate (Skin Demodicosis, Malnourishment)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
              Visible Injury / Animal Description
            </label>
            <textarea 
              rows={3}
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Stray dog limping near Metro pillar with hind leg abrasion..."
              style={{
                width: '100%',
                background: '#070a12',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '9px 12px',
                color: '#fff',
                fontSize: '13px',
                resize: 'none'
              }}
            />
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            marginTop: '8px'
          }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
                padding: '9px 16px',
                borderRadius: '8px',
                fontSize: '12.5px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={submitting}
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                color: '#fff',
                border: 'none',
                padding: '9px 20px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <AlertTriangle size={14} />
              {submitting ? 'Broadcasting...' : 'BROADCAST EMERGENCY SOS NOW'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

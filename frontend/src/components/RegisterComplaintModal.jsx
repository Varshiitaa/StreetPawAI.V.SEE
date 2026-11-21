import React, { useState } from 'react';
import { 
  AlertTriangle, 
  X, 
  Send, 
  MapPin, 
  Camera, 
  Clock, 
  Tag, 
  FileText, 
  CheckCircle2, 
  Copy,
  ExternalLink
} from 'lucide-react';

export default function RegisterComplaintModal({ isOpen, onClose, onComplaintCreated, currentUser }) {
  const [issueType, setIssueType] = useState('Severe Injury / Hit & Run');
  const [urgency, setUrgency] = useState('CRITICAL');
  const [address, setAddress] = useState('Indiranagar, 100ft Road, Bengaluru');
  const [city, setCity] = useState('Bengaluru');
  const [description, setDescription] = useState('');
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdTicket, setCreatedTicket] = useState(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = React.useRef(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('streetpaw_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let finalPhoto = photoUrl;
      if (selectedPhotoFile) {
        const uploadData = new FormData();
        uploadData.append('file', selectedPhotoFile);
        try {
          const upRes = await fetch('/api/upload', {
            method: 'POST',
            body: uploadData
          });
          if (upRes.ok) {
            const upJson = await upRes.json();
            finalPhoto = upJson.url;
          }
        } catch (upErr) {
          console.error("Photo upload failed:", upErr);
        }
      }

      if (!finalPhoto) {
        finalPhoto = '/dogs_dataset/Copy of An_Indian_Pariah_Dog.jpg';
      }

      const res = await fetch('/api/complaints/', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          issue_type: issueType,
          urgency: urgency,
          address: address,
          city: city,
          description: description || `Distress report for ${issueType} at ${address}`,
          photo: finalPhoto,
          reporter_name: currentUser?.full_name || currentUser?.username || 'Verified Citizen'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to submit complaint');

      setCreatedTicket(data);
      if (onComplaintCreated) {
        onComplaintCreated(data);
      }
    } catch (err) {
      alert("Error submitting complaint: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyTicket = (ticketId) => {
    navigator.clipboard.writeText(ticketId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleResetAndClose = () => {
    setCreatedTicket(null);
    setDescription('');
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ borderColor: 'rgba(239, 68, 68, 0.45)', maxWidth: '540px' }}>
        
        {/* Header */}
        <div style={{
          padding: '18px 22px',
          background: 'rgba(239, 68, 68, 0.12)',
          borderBottom: '1px solid rgba(239, 68, 68, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(239, 68, 68, 0.4)'
            }}>
              <AlertTriangle size={18} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
                Register Animal Distress Complaint
              </h3>
              <p style={{ fontSize: '11px', color: '#fca5a5' }}>
                Generates a tracking ticket visible to Government, NGOs, and your Citizen dashboard.
              </p>
            </div>
          </div>
          <button 
            onClick={handleResetAndClose}
            style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Success Confirmation Stage */}
        {createdTicket ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <CheckCircle2 size={30} color="#10b981" />
            </div>

            <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>
              Complaint Registered Successfully!
            </h4>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Your distress report has been broadcast to NGO rescue squads and Municipal dispatchers.
            </p>

            <div style={{
              background: '#0d0404',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Tracking Ticket ID
                </span>
                <span style={{
                  fontSize: '10px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: 'var(--accent-red)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 700
                }}>
                  ● LIVE ON NGO RADAR
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '20px', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                  {createdTicket.public_id || createdTicket.ticket_id}
                </span>
                <button
                  onClick={() => handleCopyTicket(createdTicket.public_id || createdTicket.ticket_id)}
                  style={{
                    background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                    color: copied ? '#34d399' : '#fff',
                    border: '1px solid var(--border-color)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Copy size={13} />
                  {copied ? 'Copied!' : 'Copy Ticket'}
                </button>
              </div>

              <div style={{ marginTop: '12px', fontSize: '11.5px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                <div><strong>Issue:</strong> {createdTicket.complaint?.issue_type}</div>
                <div><strong>Location:</strong> {createdTicket.complaint?.address}</div>
                <div><strong>Urgency:</strong> {createdTicket.complaint?.urgency}</div>
              </div>
            </div>

            <button
              onClick={handleResetAndClose}
              className="btn-primary"
              style={{ width: '100%', padding: '10px', fontSize: '13px' }}
            >
              View in "My Complaints"
            </button>
          </div>
        ) : (
          /* Form Stage */
          <form onSubmit={handleSubmit} style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Issue Type */}
            <div>
              <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                Category of Distress / Issue *
              </label>
              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0d0404',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  color: '#fff',
                  fontSize: '13px'
                }}
              >
                <option value="Severe Injury / Hit & Run">🚨 Severe Injury / Hit & Run Road Collision</option>
                <option value="Severe Skin Mange / Demodicosis">🐾 Severe Skin Mange, Fur Loss & Open Wounds</option>
                <option value="Aggressive / Suspected Rabies">⚠️ Aggressive Behavior / Suspected Rabies</option>
                <option value="Abandoned Puppies / Kittens">🍼 Abandoned Newborn Puppies / Kittens</option>
                <option value="Illegal Animal Relocation / Cruelty">⚖️ Animal Cruelty / Illegal Relocation</option>
                <option value="ABC Sterilisation Required">✂️ Unsterilised Stray (ABC Request)</option>
              </select>
            </div>

            {/* Urgency */}
            <div>
              <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                Urgency Priority *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[
                  { id: 'CRITICAL', label: 'CRITICAL (Immediate Ambulance)', color: '#ef4444' },
                  { id: 'HIGH', label: 'HIGH (Within 4 Hours)', color: '#f97316' },
                  { id: 'MODERATE', label: 'MODERATE (Routine Triage)', color: '#eab308' }
                ].map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setUrgency(u.id)}
                    style={{
                      background: urgency === u.id ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      border: urgency === u.id ? `1px solid ${u.color}` : '1px solid var(--border-color)',
                      color: urgency === u.id ? '#fff' : 'var(--text-muted)',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    {u.id}
                  </button>
                ))}
              </div>
            </div>

            {/* Location & Landmark */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                  Incident Address / Exact Landmark *
                </label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={14} color="var(--text-dim)" style={{ position: 'absolute', left: '10px', top: '12px' }} />
                  <input 
                    type="text" 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    placeholder="e.g. Near Metro Pillar 124, 100ft Road"
                    style={{
                      width: '100%',
                      background: '#0d0404',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '9px 12px 9px 30px',
                      color: '#fff',
                      fontSize: '12.5px'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                  City *
                </label>
                <input 
                  type="text" 
                  value={city} 
                  onChange={(e) => setCity(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: '#0d0404',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    color: '#fff',
                    fontSize: '12.5px'
                  }}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                Detailed Observation / Animal Condition
              </label>
              <textarea 
                rows={3}
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe visible injuries, behavioral signs, collar or ear notch marks, and exact spot where the animal is resting..."
                style={{
                  width: '100%',
                  background: '#0d0404',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  color: '#fff',
                  fontSize: '12.5px',
                  resize: 'none'
                }}
              />
            </div>

            {/* Photo Evidence Upload (Optional) */}
            <div>
              <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '5px', fontWeight: 600 }}>
                Photo Evidence (Optional — Upload Image or Provide URL)
              </label>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={(e) => {
                  const f = e.target.files[0];
                  if (f) {
                    setSelectedPhotoFile(f);
                    setPhotoPreview(URL.createObjectURL(f));
                  }
                }} 
                accept="image/*" 
                style={{ display: 'none' }} 
              />
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {photoPreview ? (
                  <div style={{ position: 'relative', width: '56px', height: '56px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ef4444' }}>
                    <img src={photoPreview} alt="Evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => { setSelectedPhotoFile(null); setPhotoPreview(null); }}
                      style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px dashed rgba(239, 68, 68, 0.4)',
                      color: '#fca5a5',
                      borderRadius: '8px',
                      padding: '9px 14px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <Camera size={14} color="#ef4444" />
                    Upload Image
                  </button>
                )}
                <input 
                  type="text"
                  placeholder="Or paste photo URL (optional)"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  style={{
                    flex: 1,
                    background: '#0d0404',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    color: '#fff',
                    fontSize: '12.5px'
                  }}
                />
              </div>
            </div>

            {/* Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '6px'
            }}>
              <button 
                type="button" 
                onClick={handleResetAndClose}
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
                disabled={loading}
                className="btn-primary"
                style={{
                  padding: '9px 20px',
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Send size={14} />
                {loading ? 'Submitting...' : 'SUBMIT COMPLAINT TICKET'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

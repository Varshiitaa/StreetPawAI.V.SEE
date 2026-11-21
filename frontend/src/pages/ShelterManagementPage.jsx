import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Input } from '@streetpaw/ui';
import { Home, Heart, ShieldCheck, Activity, Users, Plus, CheckCircle, RefreshCw, AlertTriangle, Building, Bed } from 'lucide-react';

export function ShelterManagementPage() {
  const [wards, setWards] = useState([
    {
      id: 1,
      name: 'Quarantine Ward A (Infectious)',
      condition: 'Demodicosis & Canine Dermatitis Patients',
      capacity: 12,
      occupied: 10,
      status: 'Critical Attention',
      caretaker: 'Dr. Ramesh (Vet Officer)',
      notes: 'Undergoing anti-parasitic and topical medication regimen.'
    },
    {
      id: 2,
      name: 'Post-Op Surgical Recovery Unit',
      condition: 'Sterilized & Accident Trauma Rescues',
      capacity: 15,
      occupied: 7,
      status: 'Stable',
      caretaker: 'Sister Kavitha',
      notes: 'ABC (Animal Birth Control) post-operative monitoring.'
    },
    {
      id: 3,
      name: 'Adoption Readiness Kennel',
      condition: 'Vaccinated & Socialized Friendly Dogs',
      capacity: 20,
      occupied: 8,
      status: 'Open for Public Adoption',
      caretaker: 'Priya (Community Lead)',
      notes: 'All 8 dogs are dewormed, Rabies & DHPPi vaccinated.'
    },
    {
      id: 4,
      name: 'Puppy & Senior Dog Nursery',
      condition: 'High-Care Foster Enclosure',
      capacity: 10,
      occupied: 4,
      status: 'Protected',
      caretaker: 'Anand (Kennel Assistant)',
      notes: 'Nutritional puppy formula & gentle senior care.'
    }
  ]);

  const [selectedWard, setSelectedWard] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWard, setNewWard] = useState({
    name: '',
    condition: '',
    capacity: 10,
    occupied: 0,
    caretaker: ''
  });

  const handleUpdateOccupancy = (wardId, delta) => {
    setWards(prev => prev.map(w => {
      if (w.id === wardId) {
        const nextOcc = Math.max(0, Math.min(w.capacity, w.occupied + delta));
        return { ...w, occupied: nextOcc };
      }
      return w;
    }));
  };

  const handleAddWard = (e) => {
    e.preventDefault();
    if (!newWard.name) return;
    const item = {
      id: Date.now(),
      ...newWard,
      status: 'Active',
      notes: 'Newly designated shelter block'
    };
    setWards(prev => [...prev, item]);
    setShowAddModal(false);
    setNewWard({ name: '', condition: '', capacity: 10, occupied: 0, caretaker: '' });
  };

  const totalCapacity = wards.reduce((acc, w) => acc + Number(w.capacity), 0);
  const totalOccupied = wards.reduce((acc, w) => acc + Number(w.occupied), 0);
  const totalAvailable = totalCapacity - totalOccupied;

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              ● LIVE SHELTER & BED ALLOCATION ENGINE
            </span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
            Shelter Occupancy & Kennel Management
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Real-time shelter capacity, quarantine ward isolation, surgical recovery beds, and adoption readiness tracking.
          </p>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-emerald"
          style={{ padding: '9px 16px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={15} />
          Add Facility / Ward
        </button>
      </div>

      {/* Aggregate Metrics Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="cyber-card" style={{ padding: '16px 20px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 700 }}>TOTAL CAPACITY</div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#fff', marginTop: '4px' }}>{totalCapacity} Beds</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Across {wards.length} Wards</div>
        </div>

        <div className="cyber-card" style={{ padding: '16px 20px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 700 }}>CURRENT OCCUPANCY</div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#f87171', marginTop: '4px' }}>{totalOccupied} Dogs</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {((totalOccupied / (totalCapacity || 1)) * 100).toFixed(0)}% Utilized
          </div>
        </div>

        <div className="cyber-card" style={{ padding: '16px 20px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 700 }}>VACANT BEDS AVAILABLE</div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#60a5fa', marginTop: '4px' }}>{totalAvailable} Beds</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Ready for emergency intake</div>
        </div>
      </div>

      {/* Ward Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {wards.map((ward) => {
          const pct = Math.round((ward.occupied / ward.capacity) * 100);
          const isFull = ward.occupied >= ward.capacity;
          return (
            <div key={ward.id} className="cyber-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>{ward.name}</h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{ward.condition}</div>
                </div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: isFull ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  color: isFull ? '#f87171' : 'var(--accent-emerald)',
                  border: isFull ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)'
                }}>
                  {isFull ? 'WARD FULL' : `${ward.capacity - ward.occupied} VACANT`}
                </span>
              </div>

              {/* Progress bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '6px', color: 'var(--text-dim)' }}>
                  <span>Bed Utilization</span>
                  <span style={{ fontWeight: 700, color: '#fff' }}>{ward.occupied} / {ward.capacity} ({pct}%)</span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: pct > 85 ? '#ef4444' : (pct > 60 ? '#f59e0b' : '#10b981'),
                    transition: 'width 0.3s'
                  }} />
                </div>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-dim)', background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: '8px' }}>
                <div>👤 <strong>Assigned Lead:</strong> {ward.caretaker}</div>
                <div style={{ marginTop: '4px', color: 'var(--text-muted)' }}>📋 {ward.notes}</div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                <button
                  onClick={() => handleUpdateOccupancy(ward.id, -1)}
                  disabled={ward.occupied <= 0}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#fff',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: ward.occupied <= 0 ? 'not-allowed' : 'pointer',
                    opacity: ward.occupied <= 0 ? 0.4 : 1
                  }}
                >
                  - Discharge / Adopt
                </button>
                <button
                  onClick={() => handleUpdateOccupancy(ward.id, 1)}
                  disabled={ward.occupied >= ward.capacity}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: 'var(--accent-emerald)',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: ward.occupied >= ward.capacity ? 'not-allowed' : 'pointer',
                    opacity: ward.occupied >= ward.capacity ? 0.4 : 1
                  }}
                >
                  + Admit Animal
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Ward Modal */}
      {showAddModal && (
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
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>
              Add Shelter Facility / Ward
            </h3>
            <form onSubmit={handleAddWard} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Facility / Ward Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ward C - Orthopedic Isolation"
                  value={newWard.name}
                  onChange={e => setNewWard({ ...newWard, name: e.target.value })}
                  style={{ width: '100%', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Specialization / Condition</label>
                <input
                  type="text"
                  placeholder="e.g. Fractures & Spinal Trauma Recovery"
                  value={newWard.condition}
                  onChange={e => setNewWard({ ...newWard, condition: e.target.value })}
                  style={{ width: '100%', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Bed Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={newWard.capacity}
                    onChange={e => setNewWard({ ...newWard, capacity: Number(e.target.value) })}
                    style={{ width: '100%', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Current Occupancy</label>
                  <input
                    type="number"
                    min="0"
                    max={newWard.capacity}
                    value={newWard.occupied}
                    onChange={e => setNewWard({ ...newWard, occupied: Number(e.target.value) })}
                    style={{ width: '100%', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Attending Vet / Caretaker</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Satish"
                  value={newWard.caretaker}
                  onChange={e => setNewWard({ ...newWard, caretaker: e.target.value })}
                  style={{ width: '100%', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-emerald"
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Save Ward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

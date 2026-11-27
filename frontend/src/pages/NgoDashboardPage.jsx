import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Activity, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Plus, 
  Filter, 
  Search,
  Download,
  Check,
  Upload,
  Camera,
  X,
  FileCheck
} from 'lucide-react';

export default function NgoDashboardPage() {
  const [complaints, setComplaints] = useState([]);
  const [dogs, setDogs] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('database'); // 'database' | 'complaints' | 'analytics'
  const [editingDog, setEditingDog] = useState(null);
  const [editPhotoFile, setEditPhotoFile] = useState(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const editFileInputRef = React.useRef(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDogData, setNewDogData] = useState({
    animal_id: '',
    name: '',
    breed: 'Indian Pariah / Indie',
    customBreed: '',
    location: 'Bengaluru Urban Grid',
    status: 'healthy',
    sterilised: 'yes'
  });
  const [addPhotoFile, setAddPhotoFile] = useState(null);
  const [addPhotoPreview, setAddPhotoPreview] = useState(null);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const addFileInputRef = React.useRef(null);

  useEffect(() => {
    fetchSharedData();
  }, []);

  const fetchSharedData = async () => {
    setLoading(true);
    try {
      // Parallel fast fetching for instantaneous loading
      const [resDogs, resComplaints, resAnalytics] = await Promise.all([
        fetch('/api/dogs/?limit=200').catch(() => null),
        fetch('/api/complaints/').catch(() => null),
        fetch('/api/analytics/charts').catch(() => null)
      ]);

      if (resDogs && resDogs.ok) {
        const dData = await resDogs.json();
        setDogs(dData.items || dData.dogs || []);
      }

      if (resComplaints && resComplaints.ok) {
        const cData = await resComplaints.json();
        setComplaints(cData || []);
      }

      if (resAnalytics && resAnalytics.ok) {
        const aData = await resAnalytics.json();
        setAnalyticsData(aData);
      }
    } catch (err) {
      console.error("Shared DB Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Group multiple complaints for same dog / location to avoid redundancy
  const groupedComplaints = complaints.reduce((acc, c) => {
    const key = c.dog_id ? `dog-${c.dog_id}` : (c.address || 'General').toLowerCase().trim();
    if (!acc[key]) {
      acc[key] = {
        primary: c,
        count: 1,
        reports: [c]
      };
    } else {
      acc[key].count += 1;
      acc[key].reports.push(c);

    }
    return acc;
  }, {});

  // Update complaint status (Dispatch, Approve, Resolve, Cancel)
  const handleUpdateComplaintStatus = async (publicId, newStatus) => {
    try {
      const res = await fetch(`/api/complaints/${publicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchSharedData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete complaint ticket
  const handleDeleteComplaint = async (publicId) => {
    if (!window.confirm(`Are you sure you want to delete complaint ticket ${publicId}?`)) return;
    try {
      const res = await fetch(`/api/complaints/${publicId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert(`Complaint ${publicId} deleted successfully.`);
        fetchSharedData();
      } else {
        alert('Could not delete complaint.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete dog record (Admin/NGO action)
  const handleDeleteDog = async (dogIdentifier) => {
    if (!window.confirm(`Are you sure you want to delete dog record: ${dogIdentifier}?`)) return;
    try {
      const token = localStorage.getItem('streetpaw_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/dogs/${encodeURIComponent(dogIdentifier)}`, { 
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        setDogs(prev => prev.filter(d => d.animal_id !== dogIdentifier && d.public_code !== dogIdentifier && d.id !== dogIdentifier));
        alert(`Dog record ${dogIdentifier} deleted.`);
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(`Failed to delete dog: ${errJson.detail || 'Access denied'}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting dog: " + err.message);
    }
  };

  // Save Edit Dog with full fields (Name, Breed, Disease, Location, Status, Sterilised, Vaccinated, Photo)
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingDog) return;
    setEditSubmitting(true);
    try {
      let finalPhotoUrl = editingDog.image_url || editingDog.primary_photo || editingDog.photo_url;

      if (editPhotoFile) {
        const uploadData = new FormData();
        uploadData.append('file', editPhotoFile);
        try {
          const upRes = await fetch('/api/upload', {
            method: 'POST',
            body: uploadData
          });
          if (upRes.ok) {
            const upJson = await upRes.json();
            finalPhotoUrl = upJson.url;
          }
        } catch (upErr) {
          console.error("Photo upload failed:", upErr);
        }
      }

      const id = editingDog.id || editingDog.animal_id || editingDog.public_code;
      const token = localStorage.getItem('streetpaw_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/dogs/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify({
          name: editingDog.name,
          breed: editingDog.breed,
          location: editingDog.location,
          status: editingDog.status,
          health_status: editingDog.status,
          disease_name: editingDog.disease_name,
          health: editingDog.disease_name,
          sterilised: editingDog.sterilised,
          vaccinated: editingDog.vaccinated === true || editingDog.vaccinated === 'true' || editingDog.vaccinated === 'yes',
          image_url: finalPhotoUrl,
          primary_photo: finalPhotoUrl,
          image: finalPhotoUrl
        })
      });

      if (res.ok) {
        alert("Animal record updated successfully!");
        setEditingDog(null);
        setEditPhotoFile(null);
        setEditPhotoPreview(null);
        fetchSharedData();
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(`Failed to update record: ${errJson.detail || res.statusText || 'Error'}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error updating record: " + err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  // Add new animal directly
  const handleAddNewDog = async (e) => {
    e.preventDefault();
    setAddSubmitting(true);
    try {
      let finalPhotoUrl = null;
      if (addPhotoFile) {
        try {
          const formData = new FormData();
          formData.append('file', addPhotoFile);
          const upRes = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          });
          if (upRes.ok) {
            const upJson = await upRes.json();
            finalPhotoUrl = upJson.url;
          }
        } catch (upErr) {
          console.error("Photo upload failed:", upErr);
        }
      }

      const finalBreed = newDogData.breed === 'Other' ? (newDogData.customBreed || 'Unknown Breed') : newDogData.breed;

      const token = localStorage.getItem('streetpaw_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/dogs/', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          animal_id: newDogData.animal_id,
          name: newDogData.name || 'Community Dog',
          breed: finalBreed,
          location: newDogData.location || 'Bengaluru',
          status: newDogData.status || 'healthy',
          sterilised: newDogData.sterilised || 'yes',
          image_url: finalPhotoUrl,
          primary_photo: finalPhotoUrl,
          public_code: newDogData.animal_id || `PAW-${Math.floor(1000 + Math.random() * 9000)}`
        })
      });
      if (res.ok) {
        alert("New dog successfully added to Central Database!");
        setShowAddModal(false);
        setNewDogData({
          animal_id: '',
          name: '',
          breed: 'Indian Pariah / Indie',
          customBreed: '',
          location: 'Bengaluru Urban Grid',
          status: 'healthy',
          sterilised: 'yes'
        });
        setAddPhotoFile(null);
        setAddPhotoPreview(null);
        fetchSharedData();
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(`Failed to add dog: ${errJson.detail || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error adding dog: " + err.message);
    } finally {
      setAddSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* Title Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: '#60a5fa', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              ● CENTRALIZED GOVERNMENT & NGO WELFARE DESK • BBMP DATABASE V6.2
            </span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
            Govt & NGO Animal Welfare Portal
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Manage the central shared SQLite database, approve citizen distress complaints, eliminate duplicate reports, and track citywide analytics.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn-emerald"
            style={{ padding: '9px 16px', fontSize: '12.5px' }}
          >
            <Plus size={14} />
            Add Animal Record
          </button>
          <button 
            onClick={fetchSharedData}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              color: '#fff',
              padding: '9px 14px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Sync Database
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '22px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('database')}
          style={{
            background: activeTab === 'database' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            border: activeTab === 'database' ? '1px solid #3b82f6' : '1px solid transparent',
            color: activeTab === 'database' ? '#60a5fa' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '13px',
            padding: '7px 16px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Central Animal Database ({dogs.length})
        </button>
        <button
          onClick={() => setActiveTab('complaints')}
          style={{
            background: activeTab === 'complaints' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
            border: activeTab === 'complaints' ? '1px solid #ef4444' : '1px solid transparent',
            color: activeTab === 'complaints' ? '#f87171' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '13px',
            padding: '7px 16px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Distress Complaints & Approvals ({Object.keys(groupedComplaints).length})
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          style={{
            background: activeTab === 'analytics' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
            border: activeTab === 'analytics' ? '1px solid var(--accent-emerald)' : '1px solid transparent',
            color: activeTab === 'analytics' ? 'var(--accent-emerald)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '13px',
            padding: '7px 16px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Shared Analytics Overview
        </button>
      </div>

      {/* Prominent High-Visibility Loading State */}
      {loading ? (
        <div style={{
          padding: '80px 20px',
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '16px',
          border: '1px dashed var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)'
          }}>
            <RefreshCw size={28} className="animate-spin" color="var(--accent-emerald)" />
          </div>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
              Loading NGO Portal Records...
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              Connecting to Bengaluru Urban Stray Grid and fetching live canine records.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* TAB 1: CENTRAL ANIMAL DATABASE (EDIT, DELETE, ADD, APPROVE) */}
          {activeTab === 'database' && (
        <div className="cyber-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
              All Active Registered Canines in SQLite Database ({dogs.length} Records)
            </span>
            <span style={{ fontSize: '11px', color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
              Shared Live with Citizen Interface
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#090d16', color: 'var(--text-dim)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '12px 18px' }}>Animal ID / Tag</th>
                  <th style={{ padding: '12px 18px' }}>Name</th>
                  <th style={{ padding: '12px 18px' }}>Breed Taxonomy</th>
                  <th style={{ padding: '12px 18px' }}>Location</th>
                  <th style={{ padding: '12px 18px' }}>Health Status</th>
                  <th style={{ padding: '12px 18px' }}>ABC Sterilisation</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dogs.map((dog) => {
                  const aid = dog.animal_id || dog.public_code || `PAW-${dog.id}`;
                  return (
                    <tr key={dog.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 18px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                        {aid}
                      </td>
                      <td style={{ padding: '12px 18px', color: '#fff', fontWeight: 600 }}>
                        {dog.name || 'Unnamed Stray'}
                      </td>
                      <td style={{ padding: '12px 18px', color: 'var(--text-muted)' }}>
                        {dog.breed || 'Indian Pariah'}
                      </td>
                      <td style={{ padding: '12px 18px', color: 'var(--text-muted)' }}>
                        {dog.location || 'Bengaluru'}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span style={{
                          fontSize: '10.5px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#34d399',
                          fontWeight: 600
                        }}>
                          {dog.health_status || dog.status || 'Healthy'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px', color: 'var(--text-dim)' }}>
                        {dog.sterilised === 'yes' ? '✓ Ear-Notched' : 'Pending'}
                      </td>
                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            onClick={() => {
                              setEditingDog(dog);
                              setEditPhotoFile(null);
                              setEditPhotoPreview(dog.image_url || dog.primary_photo || dog.photo_url || null);
                            }}
                            style={{
                              background: 'rgba(59, 130, 246, 0.15)',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              color: '#60a5fa',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px'
                            }}
                          >
                            <Edit3 size={12} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteDog(dog.id)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#f87171',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px'
                            }}
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DISTRESS COMPLAINTS & APPROVALS (REDUNDANCY ELIMINATION) */}
      {activeTab === 'complaints' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            padding: '12px 16px',
            borderRadius: '10px',
            fontSize: '12px',
            color: '#fca5a5'
          }}>
            ℹ️ Redundant distress signals from multiple citizens for the same dog/area have been consolidated into unified response tickets.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            {Object.values(groupedComplaints).map((group, idx) => {
              const c = group.primary;
              return (
                <div key={idx} className="cyber-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#f97316' }}>
                      {c.public_id || `CMP-00${c.id}`}
                    </span>
                    <span style={{
                      fontSize: '10.5px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#f87171',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 700
                    }}>
                      {group.count > 1 ? `${group.count} Citizen Reports Consolidated` : 'Direct Citizen Report'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>
                    {c.issue_type || 'Animal Distress Signal'}
                  </h3>

                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {c.description || 'Stray dog reported in distress requiring medical inspection.'}
                  </p>

                  <div style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>
                    📍 Location: <strong style={{ color: '#fff' }}>{c.address || c.city || 'Bengaluru'}</strong>
                  </div>

                  {/* Status & NGO Action Buttons: Dispatch, Approve, Resolve, Cancel, Delete */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Current Status: <strong style={{ color: '#fff', textTransform: 'uppercase' }}>{c.status}</strong></span>
                    </div>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleUpdateComplaintStatus(c.public_id, 'acknowledged')}
                        style={{
                          background: 'rgba(245, 158, 11, 0.15)',
                          border: '1px solid #f59e0b',
                          color: '#fbbf24',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                        title="Approve ticket"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleUpdateComplaintStatus(c.public_id, 'team_dispatched')}
                        style={{
                          background: 'rgba(59, 130, 246, 0.15)',
                          border: '1px solid #3b82f6',
                          color: '#60a5fa',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                        title="Dispatch rescue ambulance"
                      >
                        Dispatch
                      </button>
                      <button
                        onClick={() => handleUpdateComplaintStatus(c.public_id, 'resolved')}
                        style={{
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid var(--accent-emerald)',
                          color: '#34d399',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                        title="Resolve complaint"
                      >
                        Resolve ✓
                      </button>
                      <button
                        onClick={() => handleUpdateComplaintStatus(c.public_id, 'cancelled')}
                        style={{
                          background: 'rgba(107, 114, 128, 0.15)',
                          border: '1px solid #6b7280',
                          color: '#9ca3af',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                        title="Cancel complaint"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDeleteComplaint(c.public_id)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid #ef4444',
                          color: '#f87171',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          marginLeft: 'auto'
                        }}
                        title="Delete complaint record permanently"
                      >
                        Delete ✕
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: DATA SCIENCE ANALYTICS BOARD FOR NGO & GOVT */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          
          {/* DS Header Strip */}
          <div style={{
            background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.15) 0%, rgba(56, 189, 248, 0.15) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            padding: '16px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                ● CANINE DEMOGRAPHICS & EPIDEMIOLOGY DATA SCIENCE BENCHMARK
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                Municipal Welfare & Field Incident Intelligence Board
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', padding: '5px 12px', borderRadius: '20px', color: '#fff' }}>
                Dataset: <strong>{dogs.length} Real Canines</strong>
              </span>
              <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', padding: '5px 12px', borderRadius: '20px', color: 'var(--accent-emerald)' }}>
                Sample Confidence: <strong>98.5%</strong>
              </span>
            </div>
          </div>

          {/* Top 4 KPI Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '18px' }}>
            <div className="cyber-card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Population Sample Size
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#fff' }}>{dogs.length}</div>
              <div style={{ fontSize: '11px', color: 'var(--accent-emerald)', marginTop: '4px' }}>
                ✓ Mapped in Central SQLite Engine
              </div>
            </div>

            <div className="cyber-card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Canine Breeds Classified
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#38bdf8' }}>
                {analyticsData?.breed_distribution?.length || 9}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                EfficientNet-B3 Deep Feature Vectors
              </div>
            </div>

            <div className="cyber-card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Clinical Pathologies Detected
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#f87171' }}>
                {dogs.filter(d => d.disease_name && !d.disease_name.toLowerCase().includes('normal')).length}
              </div>
              <div style={{ fontSize: '11px', color: '#fca5a5', marginTop: '4px' }}>
                Demodicosis & Dermatitis Cases
              </div>
            </div>

            <div className="cyber-card" style={{ padding: '18px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Field SOS Distress Tickets
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#f59e0b' }}>
                {complaints.length}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                Active Municipal Complaints
              </div>
            </div>
          </div>

          {/* VISUAL 1: Interactive Breed Distribution Histogram Bar Chart */}
          <div className="cyber-card" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>
                  Breed Prevalence Distribution Histogram (AI Classification)
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Relative frequency of stray canine breeds identified across Bangalore field images:
                </p>
              </div>
              <span style={{ fontSize: '11px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '3px 10px', borderRadius: '4px', fontWeight: 700 }}>
                N = {dogs.length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {analyticsData?.breed_distribution?.map((item, idx) => {
                const maxCount = analyticsData.breed_distribution[0]?.count || 1;
                const percentage = Math.round((item.count / dogs.length) * 100);
                const barWidth = Math.round((item.count / maxCount) * 100);

                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '150px', fontSize: '12px', color: '#e5e7eb', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.breed}
                    </div>

                    <div style={{ flex: 1, background: 'rgba(255, 255, 255, 0.05)', height: '24px', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
                      <div 
                        style={{
                          height: '100%',
                          width: `${barWidth}%`,
                          background: idx === 0 ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)' : 'linear-gradient(90deg, #38bdf8 0%, #0284c7 100%)',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          paddingLeft: '10px',
                          transition: 'width 0.6s ease'
                        }}
                      >
                        {barWidth > 15 && (
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#000' }}>
                            {item.count} ({percentage}%)
                          </span>
                        )}
                      </div>
                      {barWidth <= 15 && (
                        <span style={{ position: 'absolute', left: `${barWidth + 2}%`, top: '4px', fontSize: '11px', fontWeight: 700, color: '#fff' }}>
                          {item.count} ({percentage}%)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* VISUAL 2 & 3 (Side-by-Side): Disease Prevalence Chart & Geographic Hotspots */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
            
            {/* Area vs Disease Analysis Bar Matrix */}
            <div className="cyber-card" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>
                  Epidemiological Disease Hotspots by Sector
                </h3>
                <span style={{ fontSize: '10.5px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  Clinical Risk Vector
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Areas exhibiting highest clustering of Demodicosis and Dermatitis requiring municipal veterinary intervention:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {analyticsData?.area_disease_hotspots?.slice(0, 7).map((item, idx) => (
                  <div 
                    key={idx}
                    style={{
                      background: '#070f17',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>
                        {item.location}
                      </div>
                      <div style={{ fontSize: '11px', color: '#f87171' }}>
                        Condition: {item.disease}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11.5px',
                      background: 'rgba(239, 68, 68, 0.2)',
                      color: '#fca5a5',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {item.cases} {item.cases === 1 ? 'Case' : 'Cases'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Disease Severity Ratio Visual Gauges */}
            <div className="cyber-card" style={{ padding: '22px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
                Clinical Health Ratio
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Distribution between healthy community dogs vs pathological condition cases:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {analyticsData?.disease_distribution?.map((d, idx) => {
                  const pct = Math.round((d.count / dogs.length) * 100);
                  const isHealthy = d.disease.toLowerCase().includes('normal') || d.disease.toLowerCase().includes('healthy');
                  return (
                    <div key={idx} style={{ background: '#070f17', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: isHealthy ? '#a7f3d0' : '#fca5a5' }}>
                          {d.disease}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>
                          {d.count} ({pct}%)
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: isHealthy ? '#10b981' : (d.disease.includes('Demodicosis') ? '#ef4444' : '#f97316'), borderRadius: '4px' }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* VISUAL 4: Geographic Population Density Across Monitored Sectors */}
          <div className="cyber-card" style={{ padding: '22px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
              Canine Population Density & Geo-Spatial Mapping
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Census breakdown of verified canines monitored across primary Bangalore sectors:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
              {analyticsData?.location_distribution?.slice(0, 9).map((loc, idx) => {
                const pct = Math.round((loc.count / dogs.length) * 100);
                return (
                  <div key={idx} style={{ background: '#070f17', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                      {loc.location}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Density Share</span>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
                        {loc.count} dogs ({pct}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}
        </>
      )}

      {/* MODAL: EDIT DOG RECORD */}
      {editingDog && (
        <div className="modal-overlay" onClick={() => setEditingDog(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>
                  Edit Animal Record: {editingDog.animal_id || editingDog.public_code || `PAW-${editingDog.id}`}
                </h3>
                <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  Update identity, clinical disease diagnosis, sterilization, vaccination, and photo.
                </p>
              </div>
              <button onClick={() => setEditingDog(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '13px' }}>
              
              {/* Picture Upload & Preview */}
              <div>
                <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Animal Picture
                </label>
                <input 
                  type="file" 
                  ref={editFileInputRef} 
                  onChange={(e) => {
                    const f = e.target.files[0];
                    if (f) {
                      setEditPhotoFile(f);
                      setEditPhotoPreview(URL.createObjectURL(f));
                    }
                  }} 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                />
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <div style={{
                    position: 'relative',
                    width: '80px',
                    height: '80px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    background: '#060910',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {editPhotoPreview ? (
                      <img 
                        src={editPhotoPreview} 
                        alt="Dog" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>No Image</span>
                    )}
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      style={{
                        background: 'rgba(59, 130, 246, 0.15)',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        color: '#93c5fd',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Upload size={13} />
                      {editPhotoPreview ? 'Change Dog Picture' : 'Upload Dog Picture'}
                    </button>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      PNG, JPG, or WEBP canine profile photo
                    </div>
                  </div>
                </div>
              </div>

              {/* Name & Breed */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Animal Name</label>
                  <input 
                    type="text" 
                    value={editingDog.name || ''} 
                    onChange={(e) => setEditingDog({ ...editingDog, name: e.target.value })}
                    style={{ width: '100%', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px', color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Breed Taxonomy</label>
                  <input 
                    type="text" 
                    value={editingDog.breed || ''} 
                    onChange={(e) => setEditingDog({ ...editingDog, breed: e.target.value })}
                    style={{ width: '100%', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px', color: '#fff' }}
                  />
                </div>
              </div>

              {/* Disease & Health Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Disease / Clinical Diagnosis</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Demodicosis, Dermatitis, Normal"
                    value={editingDog.disease_name || editingDog.health || ''} 
                    onChange={(e) => setEditingDog({ ...editingDog, disease_name: e.target.value, health: e.target.value })}
                    style={{ width: '100%', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px', color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Care Status</label>
                  <select 
                    value={editingDog.status || 'healthy'} 
                    onChange={(e) => setEditingDog({ ...editingDog, status: e.target.value })}
                    style={{ width: '100%', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px', color: '#fff' }}
                  >
                    <option value="healthy">Healthy / Active Care</option>
                    <option value="active_care">Active Care</option>
                    <option value="under_treatment">Under Treatment</option>
                    <option value="under_observation">Under Observation</option>
                    <option value="rescue_clinic">Rescue Clinic</option>
                    <option value="needs_sterilization">Needs Sterilization</option>
                  </select>
                </div>
              </div>

              {/* Location */}
              <div>
                <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Location / Municipal Ward</label>
                <input 
                  type="text" 
                  value={editingDog.location || ''} 
                  onChange={(e) => setEditingDog({ ...editingDog, location: e.target.value })}
                  style={{ width: '100%', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px', color: '#fff' }}
                />
              </div>

              {/* Sterilised & Vaccinated Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>ABC Sterilisation</label>
                  <select 
                    value={editingDog.sterilised || 'yes'} 
                    onChange={(e) => setEditingDog({ ...editingDog, sterilised: e.target.value })}
                    style={{ width: '100%', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px', color: '#fff' }}
                  >
                    <option value="yes">Yes (Ear-Notched)</option>
                    <option value="no">No (Pending ABC)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Vaccination Status</label>
                  <select 
                    value={editingDog.vaccinated ? 'yes' : 'no'} 
                    onChange={(e) => setEditingDog({ ...editingDog, vaccinated: e.target.value === 'yes' })}
                    style={{ width: '100%', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px', color: '#fff' }}
                  >
                    <option value="yes">✓ Vaccinated (Rabies / DHPPi)</option>
                    <option value="no">Unvaccinated / Due</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button type="button" onClick={() => setEditingDog(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={editSubmitting} className="btn-emerald" style={{ padding: '8px 18px' }}>
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

{/* MODAL: ADD ANIMAL DIRECTLY */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>
                Add New Animal to Central Database
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddNewDog} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Animal ID / Microchip Tag</label>
                <input 
                  type="text" 
                  value={newDogData.animal_id} 
                  onChange={(e) => setNewDogData({ ...newDogData, animal_id: e.target.value })}
                  placeholder="e.g. PAW-BLR-0412"
                  required
                  style={{ width: '100%', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px', color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Dog Name</label>
                <input 
                  type="text" 
                  value={newDogData.name} 
                  onChange={(e) => setNewDogData({ ...newDogData, name: e.target.value })}
                  placeholder="e.g. Kaalu, Tommy"
                  style={{ width: '100%', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Breed</label>
                <select 
                  value={newDogData.breed} 
                  onChange={(e) => setNewDogData({ ...newDogData, breed: e.target.value })}
                  style={{ width: '100%', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px', color: '#fff' }}
                >
                  <option value="Indian Pariah / Indie">Indian Pariah / Indie</option>
                  <option value="Labrador Retriever">Labrador Retriever</option>
                  <option value="German Shepherd">German Shepherd</option>
                  <option value="Golden Retriever">Golden Retriever</option>
                  <option value="Beagle">Beagle</option>
                  <option value="Pug">Pug</option>
                  <option value="Rottweiler">Rottweiler</option>
                  <option value="Doberman">Doberman</option>
                  <option value="Shih-Tzu">Shih-Tzu</option>
                  <option value="Pomeranian">Pomeranian</option>
                  <option value="Other">Other (Specify manually)</option>
                </select>

                {newDogData.breed === 'Other' && (
                  <input 
                    type="text" 
                    value={newDogData.customBreed || ''} 
                    onChange={(e) => setNewDogData({ ...newDogData, customBreed: e.target.value })}
                    placeholder="Type custom breed name..."
                    required
                    style={{ width: '100%', marginTop: '8px', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px', color: '#fff' }}
                  />
                )}
              </div>

              <div>
                <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Location / Ward</label>
                <input 
                  type="text" 
                  value={newDogData.location} 
                  onChange={(e) => setNewDogData({ ...newDogData, location: e.target.value })}
                  placeholder="e.g. Koramangala 4th Block"
                  style={{ width: '100%', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                  Photo (Optional)
                </label>
                <input 
                  type="file" 
                  ref={addFileInputRef}
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files[0];
                    if (f) {
                      setAddPhotoFile(f);
                      setAddPhotoPreview(URL.createObjectURL(f));
                    }
                  }}
                  style={{ display: 'none' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button 
                    type="button"
                    onClick={() => addFileInputRef.current && addFileInputRef.current.click()}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px dashed var(--border-color)',
                      color: '#cbd5e1',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Upload size={14} />
                    {addPhotoFile ? 'Change Photo' : 'Upload Dog Image (Optional)'}
                  </button>
                  {addPhotoPreview && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img 
                        src={addPhotoPreview} 
                        alt="Preview" 
                        style={{ width: '38px', height: '38px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--accent-emerald)' }} 
                      />
                      <button 
                        type="button" 
                        onClick={() => { setAddPhotoFile(null); setAddPhotoPreview(null); }}
                        style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '11px', cursor: 'pointer' }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={addSubmitting} className="btn-emerald" style={{ padding: '8px 18px', opacity: addSubmitting ? 0.7 : 1 }}>
                  {addSubmitting ? 'Saving...' : 'Add to Database ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

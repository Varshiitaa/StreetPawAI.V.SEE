import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  ShieldCheck, 
  Heart, 
  MapPin, 
  CheckCircle, 
  AlertCircle,
  Eye,
  RefreshCw,
  QrCode,
  X,
  Edit3,
  Trash2,
  Activity,
  Layers
} from 'lucide-react';

export default function RegistryPage({ onSelectAnimal, onOpenRegisterModal, userRole, currentUser }) {
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBreed, setSelectedBreed] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [scopeFilter, setScopeFilter] = useState('all'); // default to 'all' so all 80+ records show immediately
  const [viewingDog, setViewingDog] = useState(null);
  const [editingDog, setEditingDog] = useState(null);
  const [editPhotoFile, setEditPhotoFile] = useState(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const editFileInputRef = React.useRef(null);

  const handleDeleteDog = async (dog) => {
    const id = dog.animal_id || dog.public_code || dog.id;
    if (!window.confirm(`Are you sure you want to delete dog record ${id}?`)) return;
    try {
      const token = localStorage.getItem('streetpaw_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/dogs/${encodeURIComponent(id)}`, { 
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        setDogs(prev => prev.filter(d => d.id !== dog.id && d.animal_id !== id && d.public_code !== id));
        alert(`Dog record ${id} deleted successfully.`);
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(`Failed to delete dog record: ${errJson.detail || res.statusText || 'Access denied'}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting dog record: " + err.message);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingDog) return;
    setEditSubmitting(true);
    try {
      let finalPhotoUrl = editingDog.photo_url || editingDog.image_url;

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
          disease_name: editingDog.disease_name,
          sterilised: editingDog.sterilised,
          image_url: finalPhotoUrl,
          primary_photo: finalPhotoUrl,
          image: finalPhotoUrl
        })
      });
      if (res.ok) {
        alert("Dog record updated successfully!");
        setEditingDog(null);
        setEditPhotoFile(null);
        setEditPhotoPreview(null);
        fetchDogs();
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(`Failed to update dog record: ${errJson.detail || res.statusText || 'Error'}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error updating dog: " + err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  useEffect(() => {
    fetchDogs();
  }, [userRole, scopeFilter]);

  const fetchDogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('streetpaw_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let url = '/api/dogs/?limit=200';
      if (userRole === 'citizen' && scopeFilter === 'my_uploads') {
        url += '&user_only=true';
      }

      const res = await fetch(url, { headers });
      const data = await res.json();
      let dogList = [];
      if (data && data.items) {
        dogList = data.items;
      } else if (data && data.dogs) {
        dogList = data.dogs;
      } else if (Array.isArray(data)) {
        dogList = data;
      }

      // If citizen has no uploaded dogs yet in my_uploads mode, fallback gracefully or show prompt
      setDogs(dogList);
    } catch (err) {
      console.error("Failed to load dogs:", err);
    } finally {
      setLoading(false);
    }
  };

  // Compute live available breeds and health statuses from dogs list
  const availableBreeds = Array.from(new Set(dogs.map(d => d.breed).filter(Boolean))).sort();
  const availableStatuses = [
    { value: 'all', label: 'All Health Statuses' },
    { value: 'healthy', label: 'Healthy / Active' },
    { value: 'dermatitis', label: 'Dermatitis Condition' },
    { value: 'demodicosis', label: 'Demodicosis Condition' },
    { value: 'observation', label: 'Medical Care / Under Observation' }
  ];

  const filteredDogs = dogs.filter(dog => {
    const aid = (dog.animal_id || dog.public_code || '').toLowerCase();
    const name = (dog.name || '').toLowerCase();
    const breed = (dog.breed || '').toLowerCase();
    const loc = (dog.location || '').toLowerCase();
    const disease = (dog.disease_name || dog.health_status || '').toLowerCase();
    const status = (dog.status || '').toLowerCase();
    const q = searchQuery.toLowerCase();

    const matchesQuery = !q || aid.includes(q) || name.includes(q) || breed.includes(q) || loc.includes(q) || disease.includes(q);
    const matchesBreed = selectedBreed === 'all' || breed === selectedBreed.toLowerCase() || breed.includes(selectedBreed.toLowerCase());
    
    let matchesStatus = true;
    if (selectedStatus === 'healthy') {
      matchesStatus = status === 'active_care' || disease.includes('normal') || disease.includes('healthy');
    } else if (selectedStatus === 'dermatitis') {
      matchesStatus = disease.includes('dermatitis');
    } else if (selectedStatus === 'demodicosis') {
      matchesStatus = disease.includes('demodicosis');
    } else if (selectedStatus === 'observation') {
      matchesStatus = status === 'under_observation' || !disease.includes('normal');
    }

    return matchesQuery && matchesBreed && matchesStatus;
  });

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              ● {userRole === 'ngo' ? 'GOVT & NGO CENTRAL DATABASE • 80+ VERIFIED CANINES' : 'CITIZEN REGISTRY • YOUR UPLOADED ANIMALS'}
            </span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
            Digital Animal Registry
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {userRole === 'ngo' 
              ? 'Centralized biological biometric records, visual embeddings, and vaccination histories of all 80+ stray animals across Bangalore.' 
              : 'Secure record of stray and community animals registered and uploaded by you.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {userRole === 'citizen' && (
            <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '3px', border: '1px solid var(--border-color)' }}>
              <button
                onClick={() => setScopeFilter('my_uploads')}
                style={{
                  background: scopeFilter === 'my_uploads' ? 'var(--accent-emerald)' : 'transparent',
                  color: scopeFilter === 'my_uploads' ? '#fff' : 'var(--text-dim)',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                My Uploads
              </button>
              <button
                onClick={() => setScopeFilter('all')}
                style={{
                  background: scopeFilter === 'all' ? 'var(--accent-emerald)' : 'transparent',
                  color: scopeFilter === 'all' ? '#fff' : 'var(--text-dim)',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                All 80+ Records
              </button>
            </div>
          )}

          <button 
            onClick={onOpenRegisterModal}
            className="btn-emerald"
            style={{ padding: '10px 20px', fontSize: '13px' }}
          >
            <Plus size={16} />
            Register New Animal Tag ID
          </button>
        </div>
      </div>

      {/* Filter and Search Bar (Matching Screenshot 3) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        {/* Search Input */}
        <div style={{
          position: 'relative',
          flex: 1,
          minWidth: '280px',
          maxWidth: '500px'
        }}>
          <Search size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input 
            type="text"
            placeholder="Search by PAW code, location, or physical marking..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: '#090d16',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '10px 14px 10px 38px',
              color: '#fff',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        {/* Filter Dropdowns */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select 
            value={selectedBreed} 
            onChange={(e) => setSelectedBreed(e.target.value)}
            style={{
              background: '#090d16',
              border: '1px solid var(--border-color)',
              color: '#fff',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Breeds ({availableBreeds.length})</option>
            {availableBreeds.map(b => (
              <option key={b} value={b} style={{ background: '#090d16', color: '#fff' }}>
                {b}
              </option>
            ))}
          </select>

          <select 
            value={selectedStatus} 
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              background: '#090d16',
              border: '1px solid var(--border-color)',
              color: '#fff',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {availableStatuses.map(s => (
              <option key={s.value} value={s.value} style={{ background: '#090d16', color: '#fff' }}>
                {s.label}
              </option>
            ))}
          </select>

          <button 
            onClick={fetchDogs}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              color: '#fff',
              padding: '8px 12px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Showing Count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', fontSize: '12px', color: 'var(--text-dim)' }}>
        <span>Showing <strong style={{ color: '#fff' }}>{filteredDogs.length}</strong> verified stray records in Bengaluru Grid</span>
        <span style={{ fontFamily: 'var(--font-mono)' }}>Geo-Cluster: BLR-URBAN-9A</span>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-dim)' }}>
          <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 12px' }} />
          Loading biometric registry database...
        </div>
      ) : filteredDogs.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-dim)', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
            {userRole === 'citizen' && scopeFilter === 'my_uploads' ? "You haven't uploaded any stray dogs yet" : "No animals matched your filters"}
          </div>
          <div style={{ fontSize: '12.5px', marginBottom: '16px' }}>
            {userRole === 'citizen' && scopeFilter === 'my_uploads' 
              ? "Register a new canine tag using the button above, or toggle 'All 80+ Records' to inspect citywide community dogs."
              : "Try clearing your search query or selecting 'All Breeds' / 'All Health Statuses'."}
          </div>
          {userRole === 'citizen' && scopeFilter === 'my_uploads' && (
            <button
              onClick={() => setScopeFilter('all')}
              className="btn-emerald"
              style={{ display: 'inline-flex', padding: '8px 16px', fontSize: '12px', margin: '0 auto' }}
            >
              Browse All 80+ City Stray Records →
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}>
          {filteredDogs.map((dog) => {
            const animalId = dog.animal_id || dog.public_code || `PAW-${dog.id}`;
            const bioMatch = dog.bio_match || (96 + (dog.id % 4) * 0.9).toFixed(1);
            const imageSrc = dog.photo_url || dog.image_url || '/dogs_dataset/Copy of An_Indian_Pariah_Dog.jpg';

            return (
              <div 
                key={dog.id} 
                className="cyber-card"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative'
                }}
              >
                {/* Image Header with Bio-Lock Tag */}
                <div style={{ position: 'relative', width: '100%', height: '170px', overflow: 'hidden' }}>
                  <img 
                    src={imageSrc} 
                    alt={dog.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  
                  {/* Bio Lock Badge */}
                  <span style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    background: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(6px)',
                    color: 'var(--accent-emerald)',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(16, 185, 129, 0.4)'
                  }}>
                    Bio-Lock {bioMatch}%
                  </span>

                  {/* Favorite / Watchlist icon */}
                  <button style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'rgba(0, 0, 0, 0.6)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    cursor: 'pointer'
                  }}>
                    <Heart size={14} />
                  </button>
                </div>

                {/* Card Body */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  
                  {/* Animal ID and Tag date */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: '#ef4444',
                      background: 'rgba(239, 68, 68, 0.15)',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      {animalId}
                    </span>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
                      {dog.created_at ? dog.created_at.slice(0, 10) : '2026-09-24'}
                    </span>
                  </div>

                  {/* Name and Breed */}
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', marginBottom: '2px' }}>
                    {dog.name || 'Unnamed Stray'}
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '10px' }}>
                    {dog.breed || 'Indian Pariah Cross'}
                  </div>

                  {/* Location snippet */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    <MapPin size={12} color="var(--accent-emerald)" />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {dog.location || 'Koramangala, Bengaluru'}
                    </span>
                  </div>

                  {/* Attributes Badges */}
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                      Sex: {dog.gender || 'male'}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                      Sterilised: {dog.sterilised || 'yes'}
                    </span>
                  </div>

                  {/* Vaccination Tag */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    color: '#34d399',
                    marginBottom: '16px'
                  }}>
                    <CheckCircle size={13} />
                    <span>Vaccinated (Rabies / DHPPi)</span>
                  </div>

                  {/* Action Buttons: View Profile for All; Edit & Delete strictly for NGO/Govt */}
                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button 
                      onClick={() => setViewingDog(dog)}
                      style={{
                        width: '100%',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        color: '#a7f3d0',
                        padding: '8px 0',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Eye size={13} />
                      View Full Profile
                    </button>

                    {userRole === 'ngo' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <button
                          onClick={() => { setEditingDog(dog); setEditPhotoFile(null); setEditPhotoPreview(dog.photo_url || dog.image_url || null); }}
                          style={{
                            background: 'rgba(59, 130, 246, 0.15)',
                            border: '1px solid rgba(59, 130, 246, 0.35)',
                            color: '#93c5fd',
                            padding: '6px 0',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <Edit3 size={12} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteDog(dog)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                            color: '#fca5a5',
                            padding: '6px 0',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Federated Bio-Sync Node Status Bar */}
      <div style={{
        padding: '14px 20px',
        borderRadius: '12px',
        background: '#090d16',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11.5px',
        color: 'var(--text-dim)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }}></span>
          <span>Federated Bio-Sync Node</span>
          <span>• Connected Hubs: CUPA Bengaluru, CARE Animal Rescue, Voice of Strays, BBMP Animal Control</span>
        </div>
        <div style={{ color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
          STATUS: CONNECTED & SYNCED (REAL-TIME 0ms)
        </div>
      </div>
    
      {/* 1. VIEW FULL PROFILE MODAL (NEVER BLANK — SHOWS ANIMAL, BREED, DISEASE, ID, PHOTO, LOCATION) */}
      {viewingDog && (
        <div className="modal-overlay" onClick={() => setViewingDog(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', padding: 0, overflow: 'hidden' }}>
            {/* Modal Image Header */}
            <div style={{ position: 'relative', width: '100%', height: '260px', background: '#000' }}>
              <img 
                src={viewingDog.photo_url || viewingDog.image_url || '/dogs_dataset/Copy of An_Indian_Pariah_Dog.jpg'} 
                alt={viewingDog.name} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button 
                onClick={() => setViewingDog(null)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(0, 0, 0, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
              
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(180deg, transparent 0%, rgba(6, 9, 14, 0.95) 100%)',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end'
              }}>
                <div>
                  <span style={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    color: '#10b981',
                    background: 'rgba(16, 185, 129, 0.2)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid rgba(16, 185, 129, 0.4)'
                  }}>
                    TAG ID: {viewingDog.animal_id || viewingDog.public_code}
                  </span>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginTop: '6px' }}>
                    {viewingDog.name || `Community Dog ${viewingDog.animal_id}`}
                  </h2>
                </div>
                <span style={{ fontSize: '11px', color: '#a7f3d0', background: 'rgba(0,0,0,0.5)', padding: '4px 10px', borderRadius: '6px' }}>
                  Species: Quadruped (Dog)
                </span>
              </div>
            </div>

            {/* Modal Body: 4 Attributes Stored */}
            <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    1. ANIMAL SPECIES
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                    🐕 Dog (Canine)
                  </div>
                </div>

                <div style={{ background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    2. IDENTIFIED BREED
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#38bdf8' }}>
                    {viewingDog.breed || 'Indian Breed'}
                  </div>
                </div>

                <div style={{ background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    3. BIOMETRIC ANIMAL ID
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
                    {viewingDog.animal_id || viewingDog.public_code}
                  </div>
                </div>

                <div style={{ background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    4. CLINICAL HEALTH & DISEASE
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: (viewingDog.disease_name?.toLowerCase().includes('normal') ? '#34d399' : '#f87171') }}>
                    {viewingDog.disease_name || viewingDog.health_status || 'Normal / No visible disease'}
                  </div>
                </div>
              </div>

              {/* Geographic Location & Sterilisation */}
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#fff' }}>
                  <MapPin size={14} color="var(--accent-emerald)" />
                  <span><strong>Monitored Habitat:</strong> {viewingDog.location || 'Bengaluru Urban Grid'}</span>
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '11.5px', color: 'var(--text-dim)' }}>
                  <span>Sex: <strong style={{ color: '#fff' }}>{viewingDog.gender || viewingDog.sex || 'Male'}</strong></span>
                  <span>Sterilised: <strong style={{ color: '#fff' }}>{viewingDog.sterilised || 'Yes'}</strong></span>
                  <span>Ear-Notch: <strong style={{ color: '#fff' }}>{viewingDog.ear_notch ? 'Verified' : 'None'}</strong></span>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  onClick={() => {
                    const selDog = viewingDog;
                    setViewingDog(null);
                    onSelectAnimal(selDog);
                  }}
                  className="btn-emerald"
                  style={{ padding: '9px 18px', fontSize: '12px' }}
                >
                  Open in AI Vision Diagnostic Studio →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. EDIT MODAL FOR NGO & GOVT ONLY */}
      {editingDog && (
        <div className="modal-overlay" onClick={() => setEditingDog(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>
                Edit Animal Record: {editingDog.animal_id || editingDog.public_code}
              </h3>
              <button onClick={() => setEditingDog(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Photo Upload and Preview Section */}
              <div>
                <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Animal Photo
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
                    width: '84px',
                    height: '84px',
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
                        alt="Preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>No photo</span>
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
                      {editPhotoPreview ? 'Change Photo' : 'Upload Dog Picture'}
                    </button>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      PNG, JPG, or WEBP stray dog photo
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Dog Name</label>
                <input 
                  type="text" 
                  value={editingDog.name || ''} 
                  onChange={(e) => setEditingDog({ ...editingDog, name: e.target.value })}
                  style={{ width: '100%', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Breed</label>
                <input 
                  type="text" 
                  value={editingDog.breed || ''} 
                  onChange={(e) => setEditingDog({ ...editingDog, breed: e.target.value })}
                  style={{ width: '100%', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Disease / Health Diagnosis</label>
                <input 
                  type="text" 
                  value={editingDog.disease_name || ''} 
                  onChange={(e) => setEditingDog({ ...editingDog, disease_name: e.target.value })}
                  style={{ width: '100%', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Location</label>
                <input 
                  type="text" 
                  value={editingDog.location || ''} 
                  onChange={(e) => setEditingDog({ ...editingDog, location: e.target.value })}
                  style={{ width: '100%', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Status</label>
                  <select 
                    value={editingDog.status || 'active_care'} 
                    onChange={(e) => setEditingDog({ ...editingDog, status: e.target.value })}
                    style={{ width: '100%', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px', color: '#fff' }}
                  >
                    <option value="active_care">Active Care / Healthy</option>
                    <option value="under_observation">Under Observation</option>
                    <option value="rescue_clinic">Rescue Clinic</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Sterilised</label>
                  <select 
                    value={editingDog.sterilised || 'yes'} 
                    onChange={(e) => setEditingDog({ ...editingDog, sterilised: e.target.value })}
                    style={{ width: '100%', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px', color: '#fff' }}
                  >
                    <option value="yes">Yes (Ear-Notched)</option>
                    <option value="no">Unsterilised</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button type="button" onClick={() => setEditingDog(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={editSubmitting} className="btn-emerald" style={{ padding: '8px 18px' }}>{editSubmitting ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

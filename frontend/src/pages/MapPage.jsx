import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../map-pins.css';
import { 
  MapPin, 
  Layers, 
  AlertTriangle, 
  ShieldCheck, 
  Compass, 
  Navigation, 
  Clock, 
  CheckCircle2, 
  Crosshair,
  Maximize2,
  ThumbsUp,
  RefreshCw,
  Search,
  Filter,
  Plus
} from 'lucide-react';

// Fix default Leaflet icon paths in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// City Preset coordinates
const CITIES = [
  { name: 'Bengaluru, Karnataka', lat: 12.9716, lng: 77.5946 },
  { name: 'Mumbai, Maharashtra', lat: 19.0760, lng: 72.8777 },
  { name: 'Delhi NCR', lat: 28.6139, lng: 77.2090 },
  { name: 'Chennai, Tamil Nadu', lat: 13.0827, lng: 80.2707 },
  { name: 'Hyderabad, Telangana', lat: 17.3850, lng: 78.4867 }
];

export default function MapPage({ onPinNewSighting, userRole }) {
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'dog' | 'emergency' | 'ngo' | 'shg'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState(CITIES[0]);
  const [pins, setPins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPin, setSelectedPin] = useState(null);
  const [timeline, setTimeline] = useState([]);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerGroupRef = useRef(null);

  // 1. Fetch Dynamic GPS Pins directly from backend database
  const fetchPins = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/dogs/pins?status=all');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setPins(data);
          if (data.length > 0 && !selectedPin) {
            setSelectedPin(data[0]);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching live pins:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPins();
  }, []);

  // 2. Initialize Leaflet Map Engine
  useEffect(() => {
    if (mapContainerRef.current && !mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [selectedCity.lat, selectedCity.lng],
        zoom: 12,
        minZoom: 5,
        maxZoom: 18,
        zoomControl: false
      });

      L.control.zoom({ position: 'topright' }).addTo(map);

      // OpenStreetMap Tiles with dark futuristic styling
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      const markerGroup = L.layerGroup().addTo(map);
      markerGroupRef.current = markerGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerGroupRef.current = null;
      }
    };
  }, []);

  // Update center when city dropdown changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([selectedCity.lat, selectedCity.lng], 12, { animate: true, duration: 1.2 });
    }
  }, [selectedCity]);

  // 3. Filter Pins by active category tab & search query
  const filteredPins = pins.filter(p => {
    if (activeFilter !== 'all') {
      if (activeFilter === 'dog' && p.type !== 'dog') return false;
      if (activeFilter === 'emergency' && p.type !== 'emergency') return false;
      if (activeFilter === 'ngo' && p.type !== 'ngo') return false;
      if (activeFilter === 'shg' && p.type !== 'shg') return false;
    }
    const q = searchQuery.toLowerCase();
    const loc = (p.location || '').toLowerCase();
    const title = (p.title || '').toLowerCase();
    const code = (p.public_code || p.animal_id || '').toLowerCase();
    return !q || loc.includes(q) || title.includes(q) || code.includes(q);
  });

  // 4. Render Dynamic Interactive Leaflet Markers
  useEffect(() => {
    if (!markerGroupRef.current || !mapInstanceRef.current) return;

    markerGroupRef.current.clearLayers();

    filteredPins.forEach(pin => {
      if (!pin.lat || !pin.lng) return;

      let pinColor = '#10b981'; // Default Green Active
      let iconSymbol = '🐕';

      if (pin.type === 'dog') {
        if (pin.status === 'under_observation') {
          pinColor = '#f59e0b';
        } else if (pin.status === 'rescue_clinic') {
          pinColor = '#ef4444';
        }
      } else if (pin.type === 'emergency') {
        pinColor = '#ef4444';
        iconSymbol = '🚨';
      } else if (pin.type === 'ngo') {
        pinColor = '#3b82f6';
        iconSymbol = '🏥';
      } else if (pin.type === 'shg') {
        pinColor = '#eab308';
        iconSymbol = '💛';
      }

      const isSelected = selectedPin?.id === pin.id;
      const displayLabel = pin.public_code || pin.animal_id || pin.id;

      // Custom HTML Marker matching the screenshot design
      const customDivIcon = L.divIcon({
        className: 'leaflet-custom-marker-wrapper',
        html: `
          <div class="custom-map-pin ${isSelected ? 'selected' : ''}" style="background-color: ${pinColor};">
            <span class="pin-symbol">${iconSymbol}</span>
            <span class="pin-label">${displayLabel}</span>
          </div>
        `,
        iconSize: [80, 30],
        iconAnchor: [40, 15]
      });

      const marker = L.marker([pin.lat, pin.lng], { icon: customDivIcon });
      
      marker.on('click', () => {
        setSelectedPin(pin);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([pin.lat, pin.lng], 14, { animate: true, duration: 0.8 });
        }
      });

      markerGroupRef.current.addLayer(marker);
    });
  }, [pins, selectedPin, searchQuery, activeFilter]);

  // Fetch timeline when a dog pin is clicked
  useEffect(() => {
    if (selectedPin && selectedPin.type === 'dog') {
      const code = selectedPin.public_code || selectedPin.animal_id || selectedPin.db_id;
      fetch(`/api/dogs/${code}/locations`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setTimeline(data);
          else setTimeline([]);
        })
        .catch(() => setTimeline([]));
    } else {
      setTimeline([]);
    }
  }, [selectedPin]);

  // Upvote Distress Pin
  const handleUpvote = async () => {
    if (!selectedPin) return;
    try {
      const ticketId = selectedPin.public_code || selectedPin.animal_id || selectedPin.id;
      const res = await fetch(`/api/complaints/${ticketId}/upvote`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSelectedPin(prev => ({ ...prev, upvotes: data.upvotes }));
      }
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              ● STRAY MAP & REUSABLE PIN ENGINE V6.5 • RTK-GPS GeoFence Active
            </span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
            Interactive Stray Animal Map
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Live OpenStreetMap sightings for Stray Dogs (🐕), Emergency SOS (🚨), NGO Shelters (🏥), and SHG Feeders (💛).
          </p>
        </div>

        {/* City preset selector & Pin Sighting */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-color)',
            padding: '6px 12px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <MapPin size={14} color="var(--accent-emerald)" />
            <select
              value={selectedCity.name}
              onChange={(e) => {
                const found = CITIES.find(c => c.name === e.target.value);
                if (found) setSelectedCity(found);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '12.5px',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {CITIES.map((c, i) => (
                <option key={i} value={c.name} style={{ background: '#090d16', color: '#fff' }}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <button 
            onClick={onPinNewSighting}
            className="btn-emerald"
            style={{ padding: '9px 18px', fontSize: '12.5px' }}
          >
            <Plus size={15} />
            Pin Sighting
          </button>
        </div>
      </div>

      {/* Filter Tabs Bar (Matching Screenshot Uploaded) */}
      <div style={{
        background: '#090d16',
        border: '1px solid var(--border-color)',
        borderRadius: '14px',
        padding: '14px 18px',
        marginBottom: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setActiveFilter('all')}
            style={{
              background: activeFilter === 'all' ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : 'rgba(255, 255, 255, 0.05)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '12px',
              padding: '8px 16px',
              borderRadius: '9999px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            🎯 All Pins ({pins.length})
          </button>
          <button 
            onClick={() => setActiveFilter('dog')}
            style={{
              background: activeFilter === 'dog' ? 'var(--accent-emerald)' : 'rgba(255, 255, 255, 0.05)',
              color: activeFilter === 'dog' ? '#000' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '12px',
              padding: '8px 16px',
              borderRadius: '9999px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            🐕 Stray Dogs ({pins.filter(p => p.type === 'dog').length})
          </button>
          <button 
            onClick={() => setActiveFilter('emergency')}
            style={{
              background: activeFilter === 'emergency' ? '#ef4444' : 'rgba(255, 255, 255, 0.05)',
              color: activeFilter === 'emergency' ? '#fff' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '12px',
              padding: '8px 16px',
              borderRadius: '9999px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            🚨 Emergency SOS ({pins.filter(p => p.type === 'emergency').length})
          </button>
          <button 
            onClick={() => setActiveFilter('ngo')}
            style={{
              background: activeFilter === 'ngo' ? 'var(--accent-purple)' : 'rgba(255, 255, 255, 0.05)',
              color: activeFilter === 'ngo' ? '#fff' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '12px',
              padding: '8px 16px',
              borderRadius: '9999px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            🏥 NGO Shelters ({pins.filter(p => p.type === 'ngo').length})
          </button>
          <button 
            onClick={() => setActiveFilter('shg')}
            style={{
              background: activeFilter === 'shg' ? 'var(--accent-amber)' : 'rgba(255, 255, 255, 0.05)',
              color: activeFilter === 'shg' ? '#000' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '12px',
              padding: '8px 16px',
              borderRadius: '9999px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            💛 SHG & Feeders ({pins.filter(p => p.type === 'shg').length})
          </button>
        </div>

        {/* Search input inside card */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '420px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input 
            type="text"
            placeholder="Search location, PAW code or landmark..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: '#06080e',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '7px 12px 7px 34px',
              color: '#fff',
              fontSize: '12px',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Main Grid: Real Leaflet Map Engine & Map Pin Inspection Drawer */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.1fr', gap: '22px' }}>
        
        {/* Left: Interactive Real Leaflet Map */}
        <div className="cyber-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: 'var(--text-dim)' }}>
              <Compass size={14} color="var(--accent-emerald)" />
              <span>Viewing Area: {selectedCity.name} ({selectedCity.lat.toFixed(4)}° N, {selectedCity.lng.toFixed(4)}° E)</span>
            </div>
            <span style={{
              fontSize: '10.5px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--accent-emerald)',
              padding: '2px 8px',
              borderRadius: '4px',
              fontWeight: 700
            }}>
              ● LIVE LEAFLET ENGINE
            </span>
          </div>

          {/* Leaflet DOM container */}
          <div 
            ref={mapContainerRef}
            style={{
              width: '100%',
              height: '540px',
              borderRadius: '14px',
              overflow: 'hidden',
              border: '1px solid var(--border-color)'
            }}
          />
        </div>

        {/* Right: Map Pin Inspection Drawer (Exactly matching Screenshot) */}
        <div className="cyber-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>
              Map Pin Inspection
            </h3>
            <span style={{ fontSize: '10.5px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '4px' }}>
              Selected Pin
            </span>
          </div>

          {selectedPin ? (
            <>
              {/* Photo banner */}
              <div style={{ width: '100%', height: '180px', borderRadius: '12px', overflow: 'hidden', position: 'relative', marginBottom: '14px' }}>
                <img 
                  src={selectedPin.image || '/dogs_dataset/Copy of An_Indian_Pariah_Dog.jpg'} 
                  alt={selectedPin.title || selectedPin.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              {/* ID and Tag date */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 800,
                  color: '#f97316'
                }}>
                  {selectedPin.public_code || selectedPin.animal_id || selectedPin.id}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  {selectedPin.time || selectedPin.registeredDate || '2026-10-24'}
                </span>
              </div>

              {/* Title */}
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>
                {selectedPin.title || selectedPin.name || 'Community Animal'}
              </h2>

              {/* Address */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                <MapPin size={13} color="var(--accent-emerald)" />
                <span>{selectedPin.location}</span>
              </div>

              {/* Status & Health Record Box */}
              <div style={{ background: '#080c14', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 700 }}>
                  Status & Health Record:
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: selectedPin.type === 'emergency' ? '#ef4444' : 'var(--accent-emerald)', marginBottom: '4px' }}>
                  ● {selectedPin.health || selectedPin.status || 'Active Care'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                  GPS: {selectedPin.lat ? `${selectedPin.lat.toFixed(4)}° N, ${selectedPin.lng.toFixed(4)}° E` : '12.9716° N, 77.5946° E'}
                </div>
              </div>

              {/* Sighting Timeline */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '6px' }}>
                  ⏱ Sighting Timeline ({timeline.length || 1})
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {timeline.length > 0 ? (
                    timeline.map((t, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: 'var(--accent-emerald)' }}>●</span>
                        <span>{t.area || t.landmark || 'Spotted near anchor'} — {t.recorded_at ? t.recorded_at.slice(0, 10) : 'Recent'}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--accent-emerald)' }}>●</span>
                      <span>Initial GPS Discovery Tagged & Registered</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Distress Upvote & Action Button */}
              <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                <button
                  onClick={handleUpvote}
                  style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-color)',
                    color: '#fff',
                    padding: '10px',
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
                  <ThumbsUp size={14} color="var(--accent-emerald)" />
                  Upvote Distress ({selectedPin.upvotes || 1})
                </button>

                {userRole === 'ngo' && (
                  <button 
                    className="btn-emerald"
                    style={{ flex: 1, justifyContent: 'center', fontSize: '12px' }}
                  >
                    Dispatch Rescue Unit
                  </button>
                )}
              </div>
            </>
          ) : (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
              Click on any dynamic pin on the map to inspect telemetry & health details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

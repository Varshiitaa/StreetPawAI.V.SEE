import React from 'react';
import { 
  MapPin, 
  Search, 
  Bell, 
  Compass, 
  Radio, 
  PlusCircle, 
  ShieldAlert 
} from 'lucide-react';

export default function Header({ onPinSighting, onOpenSos, userRole }) {
  return (
    <header className="top-nav">
      {/* Left location & division status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-color)',
          padding: '6px 12px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: 600,
          color: '#e5e7eb'
        }}>
          <Compass size={14} color="var(--accent-emerald)" />
          <span>Bengaluru Urban Division</span>
          <span style={{ color: 'var(--text-dim)' }}>•</span>
          <span style={{ color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }}></span>
            57 Live Sightings
          </span>
        </div>
      </div>

      {/* Center Search Bar */}
      <div style={{ flex: 1, maxWidth: '420px', margin: '0 24px' }}>
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', color: 'var(--text-dim)' }} />
          <input 
            type="text"
            placeholder="Search PAW code, landmark or microchip..."
            style={{
              width: '100%',
              background: '#090d16',
              border: '1px solid var(--border-color)',
              borderRadius: '9999px',
              padding: '8px 40px 8px 36px',
              color: '#fff',
              fontSize: '12.5px',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent-emerald)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
          />
          <span style={{
            position: 'absolute',
            right: '12px',
            fontSize: '10.5px',
            color: 'var(--text-dim)',
            background: 'rgba(255, 255, 255, 0.06)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontFamily: 'var(--font-mono)'
          }}>⌘K</span>
        </div>
      </div>

      {/* Right Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-color)',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
          title="Notifications"
        >
          <Bell size={16} />
        </button>

        {userRole !== 'ngo' && (
          <button 
            onClick={onPinSighting}
            className="btn-emerald"
            style={{ padding: '8px 16px', fontSize: '12.5px' }}
          >
            <PlusCircle size={15} />
            Pin Sighting
          </button>
        )}
      </div>
    </header>
  );
}

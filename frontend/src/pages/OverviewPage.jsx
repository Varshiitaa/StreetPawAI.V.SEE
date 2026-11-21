import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Sparkles, 
  Shield, 
  Activity, 
  Users, 
  Eye, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  Send,
  MessageSquare,
  Bot
} from 'lucide-react';

export default function OverviewPage({ onOpenAISuite, onOpenRegistry, onOpenMap, onOpenSos }) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  const toggleVideo = () => {
    const video = document.getElementById('heroDogVideo');
    if (video) {
      if (isPlaying) video.pause();
      else video.play();
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    const video = document.getElementById('heroDogVideo');
    if (video) {
      video.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* 1. Hero Stream Banner with Dog Video */}
      <div style={{
        position: 'relative',
        borderRadius: '20px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        background: '#090d16',
        boxShadow: '0 16px 36px rgba(0, 0, 0, 0.6)',
        marginBottom: '28px'
      }}>
        {/* Live Stream Top Header Overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(180deg, rgba(7, 9, 14, 0.9) 0%, rgba(7, 9, 14, 0) 100%)',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: '#fff', fontWeight: 600 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444' }}></span>
            <span>LIVE STREAM: URBAN CANINE CAM #04</span>
            <span style={{ color: 'var(--text-dim)' }}>•</span>
            <span style={{ color: 'var(--accent-emerald)' }}>Bengaluru Koramangala Hub</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              onClick={toggleVideo}
              style={{
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                padding: '5px 10px',
                color: '#fff',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer'
              }}
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
              {isPlaying ? 'Pause Video' : 'Play Video'}
            </button>

            <button 
              onClick={toggleMute}
              style={{
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                padding: '5px 10px',
                color: '#fff',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer'
              }}
            >
              {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
              {isMuted ? 'Muted' : 'Sound On'}
            </button>
          </div>
        </div>

        {/* Video Player */}
        <div style={{ position: 'relative', width: '100%', height: '360px', overflow: 'hidden' }}>
          <video 
            id="heroDogVideo"
            src="/dog_animation.mp4"
            autoPlay
            loop
            muted={isMuted}
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'brightness(0.55) contrast(1.1)'
            }}
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at center, transparent 30%, rgba(7, 9, 14, 0.85) 100%)'
          }} />

          {/* Central Callout Message */}
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '20px',
            zIndex: 5
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '9999px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: 'var(--accent-emerald)',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '14px'
            }}>
              <Sparkles size={13} />
              A Collaborative Multi-Agent AI Platform for Stray Animal Welfare
            </div>

            <h1 style={{
              fontSize: '36px',
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.5px',
              marginBottom: '10px',
              lineHeight: 1.2
            }}>
              Protecting Every Stray <br />
              <span style={{ 
                background: 'linear-gradient(90deg, #f97316 0%, #10b981 100%)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent' 
              }}>
                With Intelligent Vision AI 🐾
              </span>
            </h1>

            <p style={{
              fontSize: '13.5px',
              color: 'var(--text-muted)',
              maxWidth: '650px',
              lineHeight: 1.5,
              marginBottom: '20px'
            }}>
              Real-time stray animal detection (Dogs, Cats, Pigs, Cows, etc.), visual re-identification, 
              disease health risk profiling and automated NGO rescue dispatch.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button 
                onClick={onOpenAISuite}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '11px 22px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(249, 115, 22, 0.4)'
                }}
              >
                Launch Animal Detection Engine →
              </button>

              <button 
                onClick={onOpenMap}
                className="btn-emerald"
                style={{ padding: '11px 20px', fontSize: '13px' }}
              >
                Pin Instant Sighting
              </button>
            </div>
          </div>
        </div>

        {/* Pipeline Stream Footer */}
        <div style={{
          padding: '10px 20px',
          background: '#070a10',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'var(--text-dim)',
          fontFamily: 'var(--font-mono)'
        }}>
          <div>
            ⚡ Pipeline Stream: <span style={{ color: '#e5e7eb' }}>YOLOv8 Quadruped ROI ➔ EfficientNet-B3 Breed DNA ➔ Skin Risk Triage ➔ Dispatch Webhook</span>
          </div>
          <div style={{ color: 'var(--accent-emerald)' }}>
            ● 4K 60FPS • Latency 118ms
          </div>
        </div>
      </div>

      {/* 2. Key Telemetry Metrics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '18px',
        marginBottom: '28px'
      }}>
        <div className="cyber-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={17} color="var(--accent-emerald)" />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--accent-emerald)', fontWeight: 700 }}>↗ +14 Today</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>134</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Verified Registered Strays</div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Biometric Re-ID Match</span>
            <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>100% Real Dataset</span>
          </div>
        </div>

        <div className="cyber-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Eye size={17} color="#ef4444" />
            </div>
            <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>● Live Radar</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>57</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Live Sightings (Bengaluru)</div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between' }}>
            <span>High Severity Flags</span>
            <span style={{ color: '#ef4444', fontWeight: 600 }}>3 Active</span>
          </div>
        </div>

        <div className="cyber-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={17} color="var(--accent-purple)" />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--accent-purple)', fontWeight: 700 }}>✓ Resolved</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>24</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>NGO Rescues Dispatched</div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Avg. Transit Response</span>
            <span style={{ color: '#fff', fontWeight: 600 }}>24 mins</span>
          </div>
        </div>

        <div className="cyber-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={17} color="var(--accent-amber)" />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--accent-amber)', fontWeight: 700 }}>SHG Verified</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>89</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Pawly Community Feeders</div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Daily Ration Coverage</span>
            <span style={{ color: '#fff', fontWeight: 600 }}>4,120 kg</span>
          </div>
        </div>
      </div>

      {/* 3. Autonomous Stray Welfare Architecture Methodology */}
      <div className="cyber-card" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="var(--accent-emerald)" />
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Autonomous Stray Welfare Architecture</h3>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>End-to-End Latency: 118ms</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
          <div style={{ background: '#090d16', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '4px' }}>01</div>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Data Acquisition</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Geo-tagged raw media capture & EXIF temporal indexing.</div>
          </div>

          <div style={{ background: '#090d16', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '10px', color: 'var(--accent-emerald)', fontWeight: 700, marginBottom: '4px' }}>02</div>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Vision Detection</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>YOLOv8 quadruped boundary segmentation & ROI parsing.</div>
          </div>

          <div style={{ background: '#090d16', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '10px', color: 'var(--accent-purple)', fontWeight: 700, marginBottom: '4px' }}>03</div>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Breed Identification</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>EfficientNet-B3 multi-label cross-breed phenotype prediction.</div>
          </div>

          <div style={{ background: '#090d16', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '10px', color: 'var(--accent-amber)', fontWeight: 700, marginBottom: '4px' }}>04</div>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Animal Re-ID</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Facial muzzle & contour deep metric embedding matching.</div>
          </div>
        </div>
      </div>

      {/* 4. Recent Street Sightings Grid & Quick Spatial Radar */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '22px' }}>
        {/* Sightings Feed */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Recent Street Sightings</h3>
            <button 
              onClick={onOpenRegistry}
              style={{ background: 'none', border: 'none', color: 'var(--accent-emerald)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Explore All 134 Dogs →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Card 1 */}
            <div className="cyber-card" style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ width: '90px', height: '90px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                <img 
                  src="/dogs_dataset/Copy of An_Indian_Pariah_Dog.jpg" 
                  alt="Bhaloo" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <span style={{ position: 'absolute', top: '4px', left: '4px', background: 'rgba(16, 185, 129, 0.9)', color: '#fff', fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px' }}>
                  Verified ID
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>#PAW-BLR-0041</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>8 mins ago</span>
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '3px' }}>Bhaloo (Indie Golden Mix)</h4>
                <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Spotted near 12th Main Indiranagar Park. Friendly disposition, healthy fur coat, no visible abrasions.
                </p>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>✓ Vaccinated</span>
                  <span style={{ fontSize: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>Ear-notched</span>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="cyber-card" style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ width: '90px', height: '90px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                <img 
                  src="/dogs_dataset/Copy of indian_pariah_1.jpg" 
                  alt="Sheru" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <span style={{ position: 'absolute', top: '4px', left: '4px', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px' }}>
                  Health Flagged
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>#PAW-BLR-0192</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>27 mins ago</span>
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '3px' }}>Sheru (Indian Pariah)</h4>
                <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Identified near Sony World Signal, Koramangala. Mild superficial dermatitis detected on left hind leg.
                </p>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{ fontSize: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>⚠ Stage 1 Dermatitis</span>
                  <span style={{ fontSize: '10px', background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>Rescue Assigned</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Spatial Radar Hub Mini-Card */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Spatial Radar Hub</h3>
            <button 
              onClick={onOpenMap}
              style={{ background: 'none', border: 'none', color: 'var(--accent-emerald)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Full Map View ↗
            </button>
          </div>

          <div className="cyber-card" style={{ padding: '16px' }}>
            {/* Visual Radar Mock */}
            <div style={{
              width: '100%',
              height: '180px',
              borderRadius: '12px',
              background: '#090e18',
              border: '1px solid var(--border-color)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px'
            }}>
              <div style={{
                position: 'absolute',
                width: '140px',
                height: '140px',
                borderRadius: '50%',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.1)'
              }} />
              <div style={{
                position: 'absolute',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                border: '1px solid rgba(16, 185, 129, 0.4)'
              }} />
              
              {/* Radar Pins */}
              <div style={{ position: 'absolute', top: '35%', left: '42%', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
                <span style={{ fontSize: '10px', color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '1px 4px', borderRadius: '4px' }}>Bhaloo</span>
              </div>
              <div style={{ position: 'absolute', top: '65%', left: '60%', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444' }}></span>
                <span style={{ fontSize: '10px', color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '1px 4px', borderRadius: '4px' }}>Sheru (SOS)</span>
              </div>

              <div style={{ position: 'absolute', bottom: '8px', left: '10px', fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                ▲ Bengaluru Urban Grid
              </div>
              <div style={{ position: 'absolute', bottom: '8px', right: '10px', fontSize: '10px', color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
                57 Animals Tracked
              </div>
            </div>

            {/* NGO Dispatch Notification */}
            <div style={{ background: '#090d16', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>CARE Mobile Vet Unit 4</span>
                <span style={{ fontSize: '10px', color: 'var(--accent-emerald)' }}>4m away</span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                En-route to Koramangala 5th Block for #PAW-BLR-0192 rescue check.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { 
  Home, 
  Scan, 
  PawPrint, 
  MapPin, 
  Bot, 
  AlertTriangle, 
  LogOut, 
  ShieldCheck, 
  Activity,
  PhoneCall,
  Database,
  FileText,
  Search,
  Users,
  History,
  Building,
  FileSpreadsheet,
  MessageSquare
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, userRole, setUserRole, onOpenSos, onLogout, currentUser }) {
  const citizenNav = [
    { id: 'overview', label: 'Home / Overview', icon: Home },
    { id: 'ai-suite', label: 'AI Vision Scan & Triage', icon: Scan, badge: 'AI Live' },
    { id: 'registry', label: 'Digital Animal Registry', icon: PawPrint, count: 'Shared DB' },
    { id: 'lost-found', label: 'Lost & Found Pet Matcher', icon: Search, badge: 'Smart Match' },
    { id: 'my-complaints', label: 'Emergency Complaints & SOS', icon: FileText, tag: 'Live Status' },
    { id: 'help-contacts', label: 'Verified Help Directory', icon: PhoneCall, tag: '24/7' },
    { id: 'map', label: 'Interactive Stray Map', icon: MapPin, dot: true },
    { id: 'copilot', label: 'Pawly AI Copilot & Help', icon: Bot, tag: 'Helpline' }
  ];

  const ngoNav = [
    { id: 'ngo-dashboard', label: 'Govt & NGO Portal', icon: Database, badge: 'Central' },
    { id: 'lost-found-desk', label: 'Lost & Found Match Desk', icon: Search, badge: 'AI Match' },
    { id: 'shelter-mgmt', label: 'Shelter & Kennels', icon: Building },
    { id: 'admin-users', label: 'Staff & Org Approvals', icon: Users, badge: 'RBAC' },
    { id: 'admin-audit', label: 'Security Audit Logs', icon: History },
    { id: 'excel-export', label: 'Master Excel Export', icon: FileSpreadsheet, badge: '.XLSX' },
    { id: 'map', label: 'Interactive Stray Animal Map', icon: MapPin, dot: true },
    { id: 'registry', label: 'Unified Animal Registry', icon: PawPrint, count: 'Shared DB' },
    { id: 'help-contacts', label: 'Emergency Help Directory', icon: PhoneCall },
    { id: 'copilot', label: 'Pawly AI Copilot & Help', icon: Bot, tag: 'Helpline' },
    { id: 'ai-suite', label: 'AI Vision & Triage Suite', icon: Scan }
  ];

  const currentNav = userRole === 'ngo' ? ngoNav : citizenNav;

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div style={{ padding: '24px 20px 18px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', 
            height: '32px', 
            borderRadius: '8px', 
            background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px rgba(16, 185, 129, 0.4)'
          }}>
            <PawPrint size={18} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.3px', color: '#fff' }}>
              StreetPaw<span style={{ color: 'var(--accent-emerald)' }}>.AI</span>
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }}></span>
              v2.4 Vision Engine Active
            </div>
          </div>
        </div>

        {/* SOS Button - Citizen Only: NGO/Govt should not have complaint registration */}
        {userRole !== 'ngo' && (
          <div style={{ marginTop: '18px' }}>
            <button 
              onClick={onOpenSos}
              className="badge-sos" 
              style={{ width: '100%' }}
            >
              <AlertTriangle size={15} />
              REGISTER COMPLAINT / SOS
            </button>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <div style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
        <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', padding: '0 10px 8px', fontWeight: 700 }}>
          {userRole === 'ngo' ? 'Government & NGO Desk' : 'Citizen Platform'}
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {currentNav.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: isActive ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.16) 0%, rgba(16, 185, 129, 0.04) 100%)' : 'transparent',
                  border: isActive ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent',
                  color: isActive ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={17} color={isActive ? 'var(--accent-emerald)' : 'var(--text-muted)'} />
                <span style={{ flex: 1 }}>{item.label}</span>

                {item.badge && (
                  <span style={{
                    fontSize: '9.5px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '6px',
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: 'var(--accent-emerald)',
                    border: '1px solid rgba(16, 185, 129, 0.4)'
                  }}>
                    {item.badge}
                  </span>
                )}
                {item.tag && (
                  <span style={{
                    fontSize: '9.5px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '6px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.4)'
                  }}>
                    {item.tag}
                  </span>
                )}
                {item.count && (
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    {item.count}
                  </span>
                )}
                {item.dot && (
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }}></span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Role Switcher & User Profile */}
      <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', background: '#080c14' }}>
        {/* Toggle Mode */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          borderRadius: '8px',
          background: 'rgba(255, 255, 255, 0.04)',
          marginBottom: '12px'
        }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Active Role</span>
          <button
            onClick={() => setUserRole(userRole === 'citizen' ? 'ngo' : 'citizen')}
            style={{
              background: userRole === 'ngo' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              border: userRole === 'ngo' ? '1px solid #3b82f6' : '1px solid #10b981',
              color: userRole === 'ngo' ? '#60a5fa' : '#34d399',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '10.5px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {userRole === 'ngo' ? 'Govt / NGO Desk' : 'Citizen'}
          </button>
        </div>

        {/* Profile Card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: userRole === 'ngo' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '13px',
            color: '#fff',
            border: '2px solid rgba(255, 255, 255, 0.1)'
          }}>
            {userRole === 'ngo' ? 'GOV' : 'CIT'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentUser?.name || (userRole === 'ngo' ? 'Official Animal Welfare Desk' : 'Citizen Caregiver')}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              {userRole === 'ngo' ? 'BBMP Hub' : 'Bengaluru Hub'}
            </div>
          </div>
          <button 
            onClick={onLogout}
            title="Sign Out / Switch User"
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}

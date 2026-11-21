import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  RefreshCw,
  Plus,
  ShieldCheck,
  Building2,
  Calendar,
  ThumbsUp,
  Edit,
  Trash2,
  X,
  MessageSquare,
  Send
} from 'lucide-react';

export default function MyComplaintsPage({ onOpenNewComplaint, currentUser }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [activeFeedTab, setActiveFeedTab] = useState('community'); // 'community' | 'my'

  // Edit Modal State
  const [editingTicket, setEditingTicket] = useState(null);
  const [editForm, setEditForm] = useState({ description: '', address: '', urgency: 'HIGH' });
  const [isUpdating, setIsUpdating] = useState(false);

  // Remarks / Comments State
  const [remarks, setRemarks] = useState([]);
  const [newRemarkText, setNewRemarkText] = useState('');
  const [loadingRemarks, setLoadingRemarks] = useState(false);
  const [upvoting, setUpvoting] = useState(false);

  useEffect(() => {
    fetchComplaintsData(activeFeedTab);
  }, [activeFeedTab]);

  useEffect(() => {
    if (selectedTicket && selectedTicket.public_id) {
      fetchTicketRemarks(selectedTicket.public_id);
    }
  }, [selectedTicket?.public_id]);

  const fetchTicketRemarks = async (ticketId) => {
    try {
      setLoadingRemarks(true);
      const res = await fetch(`/api/complaints/${ticketId}/remarks`);
      if (res.ok) {
        const data = await res.json();
        setRemarks(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRemarks(false);
    }
  };

  const handlePostRemark = async (e) => {
    e.preventDefault();
    if (!newRemarkText.trim() || !selectedTicket) return;
    try {
      const token = localStorage.getItem('streetpaw_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/complaints/${selectedTicket.public_id}/remarks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ comment: newRemarkText.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.remark) {
          setRemarks(prev => [data.remark, ...prev]);
        }
        setNewRemarkText('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpvoteTicket = async (ticketId) => {
    if (upvoting) return;
    try {
      setUpvoting(true);
      const res = await fetch(`/api/complaints/${ticketId}/upvote`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setComplaints(prev => prev.map(c => (c.public_id === ticketId || c.id === ticketId) ? { ...c, upvotes: data.upvotes } : c));
        if (selectedTicket && (selectedTicket.public_id === ticketId || selectedTicket.id === ticketId)) {
          setSelectedTicket(prev => ({ ...prev, upvotes: data.upvotes }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpvoting(false);
    }
  };

  const fetchComplaintsData = async (feedMode = activeFeedTab) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('streetpaw_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const endpoint = feedMode === 'my' ? '/api/complaints/my' : '/api/complaints/';
      const res = await fetch(endpoint, { headers });
      if (res.ok) {
        const data = await res.json();
        setComplaints(data || []);
        if (data.length > 0 && !selectedTicket) {
          setSelectedTicket(data[0]);
        } else if (selectedTicket) {
          const updatedSelected = data.find(c => c.public_id === selectedTicket.public_id || c.id === selectedTicket.id);
          if (updatedSelected) setSelectedTicket(updatedSelected);
          else if (data.length > 0) setSelectedTicket(data[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching complaints:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTicket = async (publicId) => {
    if (!window.confirm(`Are you sure you want to cancel ticket ${publicId}?`)) return;
    try {
      const token = localStorage.getItem('streetpaw_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/complaints/${publicId}/cancel`, {
        method: 'PATCH',
        headers: headers
      });

      if (res.ok) {
        alert(`Ticket ${publicId} cancelled.`);
        fetchComplaintsData(activeFeedTab);
      } else {
        const err = await res.json();
        alert(err.detail || 'Could not cancel ticket.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTicket = async (publicId) => {
    if (!window.confirm(`Permanently delete ticket ${publicId}? This cannot be undone.`)) return;
    try {
      const token = localStorage.getItem('streetpaw_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/complaints/${publicId}`, {
        method: 'DELETE',
        headers
      });

      if (res.ok) {
        alert(`Complaint ${publicId} deleted successfully.`);
        if (selectedTicket?.public_id === publicId) setSelectedTicket(null);
        fetchComplaintsData(activeFeedTab);
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to delete complaint.');
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const openEditModal = (ticket) => {
    setEditingTicket(ticket);
    setEditForm({
      description: ticket.description || '',
      address: ticket.address || '',
      urgency: ticket.urgency || 'HIGH'
    });
  };

  const handleUpdateTicket = async (e) => {
    e.preventDefault();
    if (!editingTicket) return;
    setIsUpdating(true);
    try {
      const token = localStorage.getItem('streetpaw_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/complaints/${editingTicket.public_id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(editForm)
      });

      if (res.ok) {
        alert(`Complaint ${editingTicket.public_id} updated successfully.`);
        setEditingTicket(null);
        fetchComplaintsData(activeFeedTab);
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to update complaint.');
      }
    } catch (err) {
      console.error('Update error:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || 'reported').toLowerCase();
    if (s === 'resolved' || s === 'completed') {
      return { bg: 'rgba(16, 185, 129, 0.2)', color: '#34d399', label: 'RESOLVED' };
    } else if (s === 'in_progress' || s === 'dispatched' || s === 'team_dispatched' || s === 'under_treatment') {
      return { bg: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', label: 'DISPATCHED' };
    } else if (s === 'acknowledged') {
      return { bg: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', label: 'ACKNOWLEDGED' };
    } else if (s === 'cancelled') {
      return { bg: 'rgba(107, 114, 128, 0.2)', color: '#9ca3af', label: 'CANCELLED' };
    }
    return { bg: 'rgba(239, 68, 68, 0.2)', color: '#f87171', label: 'REPORTED / PENDING' };
  };

  const filteredComplaints = complaints.filter(c => {
    if (filterStatus === 'ALL') return true;
    return (c.status || '').toLowerCase() === filterStatus.toLowerCase();
  });

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--accent-red)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              ● LIVE CITIZEN COMPLAINT TRACKER & DISPATCH RADAR
            </span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
            {activeFeedTab === 'community' ? 'Public Community Animal Complaints' : 'My Registered Animal Complaints'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {activeFeedTab === 'community' 
              ? 'Browse all reported distressed animals city-wide. Upvote urgent cases and contribute live sighting remarks.'
              : 'Create, update, delete, and track your personal distress tickets sent to Municipal (BBMP) & NGO rescue units.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => fetchComplaintsData(activeFeedTab)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              color: '#d1d5db',
              borderRadius: '8px',
              padding: '9px 14px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={14} />
            Refresh
          </button>

          <button
            onClick={onOpenNewComplaint}
            className="btn-primary"
            style={{ padding: '9px 18px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} />
            Create New Complaint
          </button>
        </div>
      </div>

      {/* Public vs My Complaints Primary Feed Switcher */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: '#111827',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        padding: '4px',
        marginBottom: '18px',
        width: 'fit-content'
      }}>
        <button
          onClick={() => setActiveFeedTab('community')}
          style={{
            background: activeFeedTab === 'community' ? 'var(--accent-red)' : 'transparent',
            color: activeFeedTab === 'community' ? '#fff' : '#9ca3af',
            border: 'none',
            borderRadius: '7px',
            padding: '8px 18px',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          All Community Complaints
        </button>
        <button
          onClick={() => setActiveFeedTab('my')}
          style={{
            background: activeFeedTab === 'my' ? 'var(--accent-red)' : 'transparent',
            color: activeFeedTab === 'my' ? '#fff' : '#9ca3af',
            border: 'none',
            borderRadius: '7px',
            padding: '8px 18px',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          My Filed Complaints
        </button>
      </div>

      {/* Main Grid: List on Left, Ticket Inspection & Timeline on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr', gap: '22px' }}>
        
        {/* Left: Complaints List */}
        <div className="cyber-card" style={{ display: 'flex', flexDirection: 'column', height: '660px', padding: '18px' }}>
          
          {/* Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
            {['ALL', 'REPORTED', 'DISPATCHED', 'RESOLVED', 'CANCELLED'].map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                style={{
                  background: filterStatus === st ? 'var(--accent-red)' : 'rgba(255, 255, 255, 0.04)',
                  color: filterStatus === st ? '#fff' : 'var(--text-dim)',
                  border: filterStatus === st ? '1px solid var(--accent-red)' : '1px solid var(--border-color)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {st}
              </button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              {filteredComplaints.length} Tickets
            </span>
          </div>

          {/* List Body */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)' }}>
                Loading complaint tickets...
              </div>
            ) : filteredComplaints.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
                <FileText size={36} color="var(--border-color)" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>No Complaints Found</div>
                <p style={{ fontSize: '12px', marginBottom: '16px' }}>
                  You have not submitted any complaints matching this filter.
                </p>
                <button
                  onClick={onOpenNewComplaint}
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '12px' }}
                >
                  Create First Complaint
                </button>
              </div>
            ) : (
              filteredComplaints.map(c => {
                const badge = getStatusBadge(c.status);
                const isSelected = selectedTicket?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedTicket(c)}
                    style={{
                      background: isSelected ? 'rgba(239, 68, 68, 0.12)' : '#120505',
                      border: isSelected ? '1px solid var(--accent-red)' : '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                        {c.public_id}
                      </span>
                      <span style={{
                        fontSize: '9.5px',
                        background: badge.bg,
                        color: badge.color,
                        padding: '2px 7px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        textTransform: 'uppercase'
                      }}>
                        {badge.label}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#f3f4f6', marginBottom: '3px' }}>
                      {c.issue_type}
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                      <MapPin size={11} /> {c.address}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--text-dim)' }}>
                      <span>Reported: {c.created_at || 'Just now'}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#4ade80', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <ThumbsUp size={10} /> {c.upvotes || 1}
                        </span>
                        <span style={{ color: '#fca5a5', fontWeight: 600 }}>{c.urgency} Priority</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Ticket Detail & Real-Time Action Log */}
        <div className="cyber-card" style={{ display: 'flex', flexDirection: 'column', height: '660px', padding: '20px' }}>
          {selectedTicket ? (
            <>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                      Ticket #{selectedTicket.public_id}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      background: getStatusBadge(selectedTicket.status).bg,
                      color: getStatusBadge(selectedTicket.status).color,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 700
                    }}>
                      {getStatusBadge(selectedTicket.status).label}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#e5e7eb' }}>
                    {selectedTicket.issue_type}
                  </h3>
                </div>

                {/* Citizen 4 options: Create, Update, Delete, Track, Upvote */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {/* Public Upvote Action */}
                  <button
                    onClick={() => handleUpvoteTicket(selectedTicket.public_id)}
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#34d399',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                    title="Upvote urgent distress case"
                  >
                    <ThumbsUp size={12} />
                    Upvote ({selectedTicket.upvotes || 1})
                  </button>

                  {/* Update button */}
                  <button
                    onClick={() => openEditModal(selectedTicket)}
                    style={{
                      background: 'rgba(59, 130, 246, 0.15)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      color: '#60a5fa',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Update complaint details"
                  >
                    <Edit size={13} />
                    Update
                  </button>

                  {/* Cancel Action if pending */}
                  {['reported', 'acknowledged'].includes((selectedTicket.status || '').toLowerCase()) && (
                    <button
                      onClick={() => handleCancelTicket(selectedTicket.public_id)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  )}

                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteTicket(selectedTicket.public_id)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.25)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#fca5a5',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Permanently delete complaint"
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              </div>

              {/* Information Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                <div style={{ background: '#0a0303', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '3px' }}>Location</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {selectedTicket.address}
                  </div>
                </div>
                <div style={{ background: '#0a0303', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '3px' }}>City Grid</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>
                    {selectedTicket.city || 'Bengaluru'}
                  </div>
                </div>
                <div style={{ background: '#0a0303', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '3px' }}>Severity</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444' }}>
                    {selectedTicket.urgency}
                  </div>
                </div>
              </div>

              {/* Observation / Details */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>
                  Citizen Description
                </div>
                <div style={{ background: '#0d0404', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', fontSize: '12.5px', color: '#d1d5db', lineHeight: 1.5 }}>
                  {selectedTicket.description || 'No detailed observation provided.'}
                </div>
              </div>

              {/* NGO & Dispatch Events Timeline (TRACK) */}
              <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '18px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} color="var(--accent-red)" />
                  LIVE TRACKING & ACTION TIMELINE:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                  {selectedTicket.events && selectedTicket.events.length > 0 ? (
                    selectedTicket.events.map((ev, i) => (
                      <div 
                        key={ev.id || i}
                        style={{
                          display: 'flex',
                          gap: '12px',
                          borderLeft: '2px solid var(--accent-red)',
                          paddingLeft: '14px',
                          position: 'relative'
                        }}
                      >
                        <div style={{
                          position: 'absolute',
                          left: '-5px',
                          top: '2px',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: 'var(--accent-red)'
                        }}></div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#fff', textTransform: 'uppercase' }}>
                              {ev.status}
                            </span>
                            <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                              {ev.created_at ? new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Logged'}
                            </span>
                          </div>
                          <p style={{ fontSize: '11.5px', color: '#9ca3af', margin: 0 }}>
                            {ev.note || 'Action acknowledged by field dispatcher.'}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{
                      display: 'flex',
                      gap: '12px',
                      borderLeft: '2px solid var(--accent-red)',
                      paddingLeft: '14px',
                      position: 'relative'
                    }}>
                      <div style={{
                        position: 'absolute',
                        left: '-5px',
                        top: '2px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'var(--accent-red)'
                      }}></div>
                      <div>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#fff' }}>REPORTED</div>
                        <p style={{ fontSize: '11.5px', color: '#9ca3af', margin: 0 }}>
                          Distress signal broadcasted to municipal animal control & registered local NGO rescue vans.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Public Community Comments Stream (Instagram Style) */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '220px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageSquare size={14} color="#3b82f6" />
                  Community Remarks & Status Comments ({remarks.length})
                </div>

                {/* Comment input form */}
                <form onSubmit={handlePostRemark} style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  <input
                    type="text"
                    value={newRemarkText}
                    onChange={(e) => setNewRemarkText(e.target.value)}
                    placeholder="Add an update, sighting note, or remark..."
                    style={{
                      flex: 1,
                      background: '#111827',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      color: '#fff',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!newRemarkText.trim()}
                    style={{
                      background: newRemarkText.trim() ? '#2563eb' : '#374151',
                      border: 'none',
                      color: '#fff',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: newRemarkText.trim() ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Send size={12} /> Post
                  </button>
                </form>

                {/* Comments feed */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px' }}>
                  {remarks.length > 0 ? (
                    remarks.map((r, i) => (
                      <div 
                        key={r.id || i}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '8px',
                          padding: '8px 12px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#93c5fd' }}>
                            {r.author_name}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                            {r.created_at ? new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '12px', color: '#e5e7eb', lineHeight: 1.4 }}>
                          {r.comment}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center', padding: '12px' }}>
                      No community remarks yet. Share the first sighting or status update!
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)' }}>
              Select a complaint ticket on the left to track its live status and timeline.
            </div>
          )}
        </div>
      </div>

      {/* Update Complaint Modal */}
      {editingTicket && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#0d131f',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Update Ticket #{editingTicket.public_id}</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Edit complaint description or address</span>
              </div>
              <button 
                onClick={() => setEditingTicket(null)}
                style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>Urgency Level</label>
                <select
                  value={editForm.urgency}
                  onChange={(e) => setEditForm({ ...editForm, urgency: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#161f30',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    color: '#fff',
                    fontSize: '13px'
                  }}
                >
                  <option value="CRITICAL">CRITICAL (Immediate Life Threat)</option>
                  <option value="HIGH">HIGH (Severe Injury / Pain)</option>
                  <option value="MEDIUM">MEDIUM (Moderate / Sick)</option>
                  <option value="LOW">LOW (Mild observation)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>Address / Landmark</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#161f30',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    color: '#fff',
                    fontSize: '13px'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>Description / Medical Condition</label>
                <textarea
                  rows={4}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#161f30',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    color: '#fff',
                    fontSize: '13px',
                    resize: 'vertical'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingTicket(null)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: '#9ca3af',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="btn-primary"
                  style={{ padding: '8px 20px', fontSize: '13px' }}
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

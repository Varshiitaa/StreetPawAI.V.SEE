with open('frontend/src/pages/NgoDashboardPage.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_handler = """  // Approve / Update complaint status
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
  };"""

new_handler = """  // Update complaint status (Dispatch, Approve, Resolve, Cancel)
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
  };"""

old_buttons = """                  {/* Status & Approval Selector */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Status: {c.status}</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleUpdateComplaintStatus(c.public_id, 'in_progress')}
                        style={{
                          background: 'rgba(16, 185, 129, 0.2)',
                          border: '1px solid var(--accent-emerald)',
                          color: '#34d399',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Approve & Dispatch
                      </button>
                      <button
                        onClick={() => handleUpdateComplaintStatus(c.public_id, 'resolved')}
                        style={{
                          background: 'rgba(59, 130, 246, 0.2)',
                          border: '1px solid #3b82f6',
                          color: '#60a5fa',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Mark Resolved ✓
                      </button>
                    </div>
                  </div>"""

new_buttons = """                  {/* Status & NGO Action Buttons: Dispatch, Approve, Resolve, Cancel, Delete */}
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
                  </div>"""

norm = text.replace('\r\n', '\n')
if old_handler in norm and old_buttons in norm:
    norm = norm.replace(old_handler, new_handler).replace(old_buttons, new_buttons)
    with open('frontend/src/pages/NgoDashboardPage.jsx', 'w', encoding='utf-8') as f:
        f.write(norm)
    print("SUCCESSFULLY UPDATED NgoDashboardPage.jsx")
else:
    print("OLD PATTERNS NOT FOUND")

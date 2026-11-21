import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Input } from '@streetpaw/ui';
import { MessageSquare, Send, User, Calendar, MapPin, Search, RefreshCw, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function DirectMessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInbox();
  }, []);

  const fetchInbox = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('streetpaw_token') || localStorage.getItem('ngo_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch('/api/lost-found/inbox/my-messages', { headers });
      const data = await res.json();
      if (Array.isArray(data)) {
        setConversations(data);
        if (data.length > 0 && !selectedConvo) {
          setSelectedConvo(data[0]);
        } else if (selectedConvo) {
          const updated = data.find(c => c.post_id === selectedConvo.post_id);
          if (updated) setSelectedConvo(updated);
        }
      }
    } catch (err) {
      console.error('Error fetching inbox:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedConvo) return;
    setIsSending(true);
    try {
      const token = localStorage.getItem('streetpaw_token') || localStorage.getItem('ngo_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/lost-found/posts/${selectedConvo.post_id}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ body: replyText.trim() })
      });
      if (res.ok) {
        setReplyText('');
        fetchInbox();
      } else {
        alert('Could not send message.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Badge variant="brand">DIRECT CITIZEN & FINDER COMMUNICATION</Badge>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MessageSquare color="#8b5cf6" size={26} /> In-App Direct Messages
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Coordinate safely with dog owners, finders, and volunteers regarding active lost & found pets.
          </p>
        </div>

        <Button variant="secondary" icon={RefreshCw} onClick={fetchInbox}>
          Refresh Inbox
        </Button>
      </div>

      {/* Main 2-Pane Messenger */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.9fr', gap: '20px', minHeight: '620px' }}>
        
        {/* Left Pane: Conversations List */}
        <Card variant="glass" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#cbd5e1', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
            Active Conversations ({conversations.length})
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {conversations.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 10px', fontSize: '0.85rem' }}>
                No active message threads yet. Send messages on lost & found cards to start a chat!
              </div>
            ) : (
              conversations.map((c) => {
                const isSelected = selectedConvo && selectedConvo.post_id === c.post_id;
                const lastMsg = c.messages[0] || {};
                return (
                  <div
                    key={c.post_id}
                    onClick={() => setSelectedConvo(c)}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? '1px solid #8b5cf6' : '1px solid var(--border-subtle)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <img 
                        src={c.photo || '/dogs_dataset/Copy of An_Indian_Pariah_Dog.jpg'} 
                        alt="Pet" 
                        style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover' }} 
                      />
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>
                            {c.dog_name || 'Pet Notice'}
                          </span>
                          <Badge variant={c.kind === 'lost' ? 'critical' : 'brand'}>
                            {c.kind.toUpperCase()}
                          </Badge>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {lastMsg.body ? `${lastMsg.sender_name}: ${lastMsg.body}` : 'No messages'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Right Pane: Active Chat Room */}
        <Card variant="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          {selectedConvo ? (
            <>
              {/* Chat Thread Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img 
                    src={selectedConvo.photo || '/dogs_dataset/Copy of An_Indian_Pariah_Dog.jpg'} 
                    alt="Pet" 
                    style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', border: '1px solid var(--border-subtle)' }} 
                  />
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                      Post #{selectedConvo.post_id} — {selectedConvo.dog_name}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <MapPin size={13} color="#8b5cf6" /> {selectedConvo.address || 'Bengaluru'}
                    </div>
                  </div>
                </div>

                <Badge variant={selectedConvo.kind === 'lost' ? 'critical' : 'brand'}>
                  {selectedConvo.kind.toUpperCase()} NOTICE
                </Badge>
              </div>

              {/* Chat Messages Body */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column-reverse', gap: '10px', padding: '10px 0' }}>
                {selectedConvo.messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: m.is_mine ? 'flex-end' : 'flex-start',
                      maxWidth: '75%',
                      background: m.is_mine ? '#8b5cf6' : 'rgba(30, 41, 59, 0.8)',
                      color: '#fff',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      fontSize: '0.875rem',
                      border: '1px solid rgba(255,255,255,0.06)'
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', opacity: 0.8, marginBottom: '4px', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                      <strong>{m.sender_name}</strong>
                      <span>{m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                    </div>
                    <div>{m.body}</div>
                  </div>
                ))}
              </div>

              {/* Message Input Footer */}
              <form onSubmit={handleSendReply} style={{ display: 'flex', gap: '10px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                <Input
                  placeholder="Type a safe, helpful message..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <Button type="submit" variant="brand" icon={Send} loading={isSending}>
                  Send
                </Button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Select a conversation on the left to read and send messages.
            </div>
          )}
        </Card>

      </div>

    </div>
  );
}

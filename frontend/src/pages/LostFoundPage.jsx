import React, { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, Badge, Modal } from '@streetpaw/ui';
import {
  Search, Camera, CheckCircle2, AlertCircle, MapPin, Calendar, Heart, Sparkles,
  Phone, MessageSquare, Send, ShieldAlert, Filter, Map as MapIcon, Grid, Plus,
  Check, Trash2, Edit3, Lock, Unlock, Eye, X, Award, AlertTriangle, RefreshCw,
  Archive, ThumbsUp, ThumbsDown, Share2, MessageCircle
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';
import { LocationPicker } from '../components/LocationPicker';
import { PawBurstContainer } from '../components/PawBurst';

export function LostFoundPage() {
  const { user, token } = useAuth();

  // Tabs: 'browse' | 'lost_form' | 'found_form' | 'archived'
  const [activeTab, setActiveTab] = useState('browse');

  // Posts and Filter state
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterKind, setFilterKind] = useState('all'); // 'all' | 'lost' | 'found'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'open' | 'matched' | 'reunited' | 'closed'
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'map'

  // Social & Community Interaction state
  const [remarksInput, setRemarksInput] = useState('');
  const [isSubmittingRemark, setIsSubmittingRemark] = useState(false);
  const [copiedShareId, setCopiedShareId] = useState(null);

  // Edit Post State (for Govt / NGO / Authorized users)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPostData, setEditingPostData] = useState(null);

  // Form State for Create Lost / Found Post
  const [formPhoto, setFormPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [dogName, setDogName] = useState('');
  const [breed, setBreed] = useState('Indian Pariah / Desi');
  const [colourMarkings, setColourMarkings] = useState('');
  const [ageSex, setAgeSex] = useState('2 Years / Male');
  const [collarMicrochip, setCollarMicrochip] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 16));
  const [reward, setReward] = useState('');
  const [contactPref, setContactPref] = useState('in_app');
  const [condition, setCondition] = useState('Healthy / Uninjured');
  const [keepingSafe, setKeepingSafe] = useState(true);

  // Location Picker Modal state
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState({
    lat: 12.9716,
    lng: 77.6412,
    address: 'Indiranagar 100ft Road, Bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka'
  });

  // Selected Post Details Modal
  const [selectedPost, setSelectedPost] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Messaging state inside Detail Modal
  const [postMessages, setPostMessages] = useState([]);
  const [msgInput, setMsgInput] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);

  // Reunited Celebration animation flag
  const [isReunitedAnimating, setIsReunitedAnimating] = useState(false);

  // Map container ref
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // Filter active vs archived posts
  const displayedPosts = posts.filter(p => {
    if (activeTab === 'archived') {
      return p.is_archived === true;
    }
    // in normal browse mode, exclude archived posts unless specifically searching
    return !p.is_archived;
  });
  useEffect(() => {
    fetchPosts();
  }, [filterKind, filterStatus, searchQuery]);

  // Polling for post messages when detail modal is open
  useEffect(() => {
    let interval = null;
    if (isDetailModalOpen && selectedPost && token) {
      fetchPostMessages(selectedPost.id);
      interval = setInterval(() => {
        fetchPostMessages(selectedPost.id);
      }, 4000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isDetailModalOpen, selectedPost, token]);

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      let url = '/api/lost-found/?';
      if (filterKind !== 'all') url += `kind=${filterKind}&`;
      if (filterStatus !== 'all') url += `status=${filterStatus}&`;
      if (searchQuery) url += `q=${encodeURIComponent(searchQuery)}&`;

      const curToken = token || localStorage.getItem('streetpaw_token') || localStorage.getItem('ngo_token');
      const headers = curToken ? { 'Authorization': `Bearer ${curToken}` } : {};
      const res = await fetch(url, { headers });
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching lost & found posts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSinglePost = async (postId) => {
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`/api/lost-found/${postId}`, { headers });
      const data = await res.json();
      setSelectedPost(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPostMessages = async (postId) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/lost-found/posts/${postId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPostMessages(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Initialize Leaflet map for Map View
  useEffect(() => {
    if (viewMode === 'map' && mapContainerRef.current) {
      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current).setView([12.9716, 77.5946], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 18
        }).addTo(map);
        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;
      // Clear existing markers
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          map.removeLayer(layer);
        }
      });

      // Add pins for posts
      posts.forEach((p) => {
        const isLost = p.kind === 'lost';
        const markerColor = isLost ? '#ef4444' : '#8b5cf6';
        
        const customIcon = L.divIcon({
          className: 'custom-lostfound-pin',
          html: `<div style="background-color: ${markerColor}; width: 28px; height: 28px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 10px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 14px; font-weight: bold;">${isLost ? '🐶' : '🔍'}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const marker = L.marker([p.lat || 12.9716, p.lng || 77.5946], { icon: customIcon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: sans-serif; padding: 4px; max-width: 200px;">
            <img src="${p.photo}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 6px; margin-bottom: 6px;" />
            <strong style="color: ${markerColor}; text-transform: uppercase; font-size: 12px;">${p.kind} DOG</strong>
            <div style="font-weight: bold; font-size: 14px; margin-top: 2px;">${p.dog_name || p.breed}</div>
            <div style="font-size: 11px; color: #666; margin-top: 2px;">📍 ${p.address}</div>
          </div>
        `);
      });
    }
  }, [viewMode, posts]);

  // Handle Photo Selection
  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
      setFormPhoto(url);
    }
  };

  // Submit Lost / Found Form
  const handleSubmitForm = async (kindType) => {
    const curToken = token || localStorage.getItem('streetpaw_token') || localStorage.getItem('ngo_token');
    if (!curToken) {
      alert("Please login to post a Lost or Found pet record.");
      return;
    }

    const payload = {
      kind: kindType,
      dog_name: kindType === 'lost' ? (dogName || 'Missing Dog') : 'Found Dog',
      breed: breed || 'Indian Pariah / Desi',
      colour_markings: colourMarkings || 'Tricolor',
      age_sex: ageSex,
      collar_microchip: collarMicrochip,
      photo: photoPreview || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&auto=format&fit=crop',
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      address: selectedLocation.address,
      city: selectedLocation.city || 'Bengaluru',
      state: selectedLocation.state || 'Karnataka',
      event_date: eventDate,
      reward: kindType === 'lost' ? reward : null,
      contact_pref: contactPref
    };

    try {
      const res = await fetch('/api/lost-found/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${curToken}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        alert(errData.detail || "Failed to create post.");
        return;
      }

      const createdPost = await res.json();
      resetForm();
      setActiveTab('browse');
      fetchPosts();
      
      // Open detail modal to show newly created post and smart matches!
      setSelectedPost(createdPost);
      setIsDetailModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormPhoto(null);
    setPhotoPreview(null);
    setDogName('');
    setBreed('Indian Pariah / Desi');
    setColourMarkings('');
    setAgeSex('2 Years / Male');
    setCollarMicrochip('');
    setReward('');
    setCondition('Healthy / Uninjured');
  };

  // Citizen Match Opinion Handler
  const handleCitizenOpinion = async (matchId, opinionType) => {
    const curToken = token || localStorage.getItem('streetpaw_token') || localStorage.getItem('ngo_token');
    try {
      const res = await fetch(`/api/lost-found/matches/${matchId}/opinion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(curToken ? { 'Authorization': `Bearer ${curToken}` } : {})
        },
        body: JSON.stringify({ opinion: opinionType })
      });
      const data = await res.json();
      alert(data.message || "Thanks for sharing your opinion!");
      if (selectedPost) fetchSinglePost(selectedPost.id);
      fetchPosts();
    } catch (err) {
      console.error(err);
      alert("Thanks for sharing your opinion! Stored for Govt/NGO review.");
    }
  };

  // Archive (Soft-Delete) Post Action
  const handleArchivePost = async (postId, shouldArchive = true) => {
    const curToken = token || localStorage.getItem('streetpaw_token') || localStorage.getItem('ngo_token');
    const endpoint = shouldArchive ? `/api/lost-found/posts/${postId}/archive` : `/api/lost-found/posts/${postId}/unarchive`;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: curToken ? { 'Authorization': `Bearer ${curToken}` } : {}
      });
      if (res.ok) {
        alert(shouldArchive ? "Post moved to Archived / Soft Delete tab." : "Post restored to active listing.");
        setIsDetailModalOpen(false);
        fetchPosts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Upvote / Downvote Action
  const handleVotePost = async (postId, type = 'up') => {
    try {
      const res = await fetch(`/api/lost-found/posts/${postId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });
      if (res.ok) {
        fetchPosts();
        if (selectedPost && selectedPost.id === postId) {
          fetchSinglePost(postId);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Social Remark / Comment
  const handleAddRemark = async (postId) => {
    if (!remarksInput.trim()) return;
    setIsSubmittingRemark(true);
    try {
      const curToken = token || localStorage.getItem('streetpaw_token') || localStorage.getItem('ngo_token');
      const headers = { 'Content-Type': 'application/json' };
      if (curToken) headers['Authorization'] = `Bearer ${curToken}`;

      const res = await fetch(`/api/lost-found/posts/${postId}/remarks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          comment: remarksInput.trim(),
          author_name: user?.full_name || user?.username || 'Community Caregiver'
        })
      });
      if (res.ok) {
        setRemarksInput('');
        fetchSinglePost(postId);
        fetchPosts();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingRemark(false);
    }
  };

  // Share Post Action
  const handleSharePost = (post) => {
    const shareUrl = `${window.location.origin}/#lost-found?post=${post.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`🚨 StreetPaw Missing Pet Alert: ${post.dog_name || 'Pet'} (${post.breed || ''}) seen around ${post.address || 'Bengaluru'}. Details: ${shareUrl}`);
      setCopiedShareId(post.id);
      setTimeout(() => setCopiedShareId(null), 2500);
    }
  };

  // Save Post Edit (Govt / NGO or Owner)
  const handleSaveEditPost = async (e) => {
    e.preventDefault();
    if (!editingPostData) return;
    try {
      const curToken = token || localStorage.getItem('streetpaw_token') || localStorage.getItem('ngo_token');
      const headers = { 'Content-Type': 'application/json' };
      if (curToken) headers['Authorization'] = `Bearer ${curToken}`;

      const res = await fetch(`/api/lost-found/${editingPostData.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(editingPostData)
      });
      if (res.ok) {
        alert("Post details updated successfully.");
        setIsEditModalOpen(false);
        setEditingPostData(null);
        fetchPosts();
        if (selectedPost) fetchSinglePost(selectedPost.id);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Update failed: ${err.detail || 'Error'}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Mark Reunited Action
  const handleMarkReunited = async (postId) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/lost-found/${postId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'reunited' })
      });

      if (res.ok) {
        setIsReunitedAnimating(true);
        setTimeout(() => setIsReunitedAnimating(false), 2500);
        fetchSinglePost(postId);
        fetchPosts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Send In-App Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const curToken = token || localStorage.getItem('streetpaw_token') || localStorage.getItem('ngo_token');
    if (!msgInput.trim() || !curToken || !selectedPost) {
      if (!curToken) alert("Please log in to send a direct message.");
      return;
    }
    setIsSendingMsg(true);

    try {
      const res = await fetch(`/api/lost-found/posts/${selectedPost.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${curToken}`
        },
        body: JSON.stringify({ body: msgInput.trim() })
      });

      if (res.ok) {
        setMsgInput('');
        fetchPostMessages(selectedPost.id);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Message sending failed: ${errData.detail || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error sending message: " + err.message);
    } finally {
      setIsSendingMsg(false);
    }
  };

  // Report Post Action
  const handleReportPost = async (postId) => {
    if (!token) return alert("Please login to report a post.");
    try {
      const res = await fetch(`/api/lost-found/posts/${postId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: "Reported suspicious or duplicate post" })
      });
      if (res.ok) {
        alert("Post reported to NGO moderation squad for review. Thank you!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Post Action
  const handleDeletePost = async (postId) => {
    if (!confirm("Are you sure you want to delete this lost & found post?")) return;
    try {
      const res = await fetch(`/api/lost-found/${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setIsDetailModalOpen(false);
        fetchPosts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: '1140px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* LAVENDER HERO HEADER */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.9) 0%, rgba(88, 28, 135, 0.7) 100%)',
        border: '1px solid rgba(167, 139, 250, 0.3)',
        borderRadius: 'var(--radius-xl)',
        padding: '32px 24px',
        marginBottom: '28px',
        boxShadow: '0 0 30px rgba(139, 92, 246, 0.2)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <Badge variant="brand" style={{ background: 'rgba(192, 132, 252, 0.2)', color: '#c084fc', border: '1px solid #c084fc' }}>
            💜 DIGITAL ANIMAL RECOVERY NETWORK
          </Badge>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#ffffff', marginTop: '10px', marginBottom: '8px', letterSpacing: '-0.02em' }}>
            Lost & Found Pets Portal
          </h2>
          <p style={{ color: '#e9d5ff', fontSize: '0.975rem', maxWidth: '640px', lineHeight: '1.5', margin: 0 }}>
            Report missing pets or found strays. Our smart Re-ID match engine continuously pairs sightings by area radius, breed traits, and visual features.
          </p>
        </div>
      </div>

      {/* SLIDING PILL TABS */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(167, 139, 250, 0.25)',
        borderRadius: 'var(--radius-xl)',
        padding: '6px',
        marginBottom: '28px'
      }}>
        <div style={{ display: 'flex', gap: '6px', width: '100%', maxWidth: '600px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('browse')}
            style={{
              flex: 1,
              padding: '12px 18px',
              borderRadius: 'var(--radius-lg)',
              fontWeight: 700,
              fontSize: '0.9rem',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'browse' ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' : 'transparent',
              color: activeTab === 'browse' ? '#ffffff' : 'var(--text-muted)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Grid size={16} /> Browse Posts
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('lost_form')}
            style={{
              flex: 1,
              padding: '12px 18px',
              borderRadius: 'var(--radius-lg)',
              fontWeight: 700,
              fontSize: '0.9rem',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'lost_form' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'transparent',
              color: activeTab === 'lost_form' ? '#ffffff' : 'var(--text-muted)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <AlertCircle size={16} /> I Lost My Dog
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('found_form')}
            style={{
              flex: 1,
              padding: '12px 18px',
              borderRadius: 'var(--radius-lg)',
              fontWeight: 700,
              fontSize: '0.9rem',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'found_form' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
              color: activeTab === 'found_form' ? '#ffffff' : 'var(--text-muted)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <CheckCircle2 size={16} /> I Found a Dog
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('archived')}
            title="Archived records"
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-lg)',
              fontWeight: 700,
              fontSize: '0.85rem',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'archived' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
              color: activeTab === 'archived' ? '#a5b4fc' : 'var(--text-dim)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Archive size={14} /> Archived
          </button>
        </div>

        {(activeTab === 'browse' || activeTab === 'archived') && (
          <div style={{ display: 'flex', gap: '6px', paddingRight: '6px' }}>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                background: viewMode === 'grid' ? 'rgba(167, 139, 250, 0.3)' : 'transparent',
                color: viewMode === 'grid' ? '#c084fc' : 'var(--text-muted)',
                border: '1px solid rgba(167, 139, 250, 0.3)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Grid size={14} /> Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                background: viewMode === 'map' ? 'rgba(167, 139, 250, 0.3)' : 'transparent',
                color: viewMode === 'map' ? '#c084fc' : 'var(--text-muted)',
                border: '1px solid rgba(167, 139, 250, 0.3)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <MapIcon size={14} /> Map View
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: BROWSE REGISTRY & ARCHIVE */}
      {(activeTab === 'browse' || activeTab === 'archived') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* SEARCH & FILTERS BAR */}
          <Card variant="glass" style={{ padding: '16px 20px', borderColor: 'rgba(167, 139, 250, 0.3)' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: '240px' }}>
                <Input
                  icon={Search}
                  placeholder="Search by dog name, breed, markings, area..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Type Filter Chips */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Type:</span>
                {['all', 'lost', 'found'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setFilterKind(k)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '16px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      border: '1px solid var(--border-subtle)',
                      background: filterKind === k ? '#8b5cf6' : 'rgba(30, 41, 59, 0.5)',
                      color: filterKind === k ? '#ffffff' : 'var(--text-muted)',
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {k}
                  </button>
                ))}
              </div>

              {/* Status Filter Chips */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status:</span>
                {['all', 'open', 'matched', 'reunited', 'closed'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFilterStatus(s)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '16px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      border: '1px solid var(--border-subtle)',
                      background: filterStatus === s ? '#8b5cf6' : 'rgba(30, 41, 59, 0.5)',
                      color: filterStatus === s ? '#ffffff' : 'var(--text-muted)',
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* MAP VIEW INTERFACE */}
          {viewMode === 'map' ? (
            <Card variant="glass" style={{ padding: '0', overflow: 'hidden', height: '520px', position: 'relative' }}>
              <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
            </Card>
          ) : (
            /* GRID VIEW INTERFACE */
            <div>
              {isLoading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                  Loading Lost & Found pet posts...
                </div>
              ) : displayedPosts.length === 0 ? (
                <Card variant="glass" style={{ padding: '40px', textAlign: 'center' }}>
                  <AlertCircle size={40} color="#c084fc" style={{ marginBottom: '12px' }} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                    {activeTab === 'archived' ? 'No Archived Posts' : 'No Posts Found'}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '360px', margin: '8px auto 0' }}>
                    {activeTab === 'archived' 
                      ? 'No posts have been archived or soft-deleted yet.'
                      : 'There are currently no missing or found pet posts matching your search criteria.'}
                  </p>
                </Card>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                  {displayedPosts.map((post) => {
                    const isLost = post.kind === 'lost';
                    const isReunited = post.status === 'reunited';

                    return (
                      <Card
                        key={post.id}
                        variant="glass"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden',
                          padding: 0,
                          borderColor: isLost ? 'rgba(239, 68, 68, 0.3)' : 'rgba(167, 139, 250, 0.4)',
                          background: 'rgba(15, 23, 42, 0.75)',
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          setSelectedPost(post);
                          setIsDetailModalOpen(true);
                        }}
                      >
                        {/* Photo Banner */}
                        <div style={{ position: 'relative', width: '100%', height: '200px' }}>
                          <img
                            src={post.photo}
                            alt={post.dog_name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px' }}>
                            <Badge variant={isLost ? 'critical' : 'brand'}>
                              {isLost ? '• LOST PET' : '• FOUND PET'}
                            </Badge>
                            {isReunited && <Badge variant="emerald">🎉 REUNITED</Badge>}
                          </div>

                          {post.reward && (
                            <div style={{
                              position: 'absolute',
                              bottom: '12px',
                              right: '12px',
                              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                              color: '#fff',
                              fontSize: '0.75rem',
                              fontWeight: 900,
                              padding: '4px 10px',
                              borderRadius: '12px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <Award size={12} /> REWARD: {post.reward}
                            </div>
                          )}

                          {post.matches_count > 0 && (
                            <div style={{
                              position: 'absolute',
                              top: '12px',
                              right: '12px',
                              background: 'rgba(139, 92, 246, 0.9)',
                              color: '#fff',
                              fontSize: '0.725rem',
                              fontWeight: 800,
                              padding: '4px 10px',
                              borderRadius: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <Sparkles size={12} /> {post.matches_count} Smart Match{post.matches_count > 1 ? 'es' : ''}
                            </div>
                          )}
                        </div>

                        {/* Card Content Body */}
                        <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                                {post.dog_name}
                              </h3>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {new Date(post.event_date).toLocaleDateString()}
                              </span>
                            </div>

                            <div style={{ fontSize: '0.85rem', color: '#c084fc', fontWeight: 700, marginTop: '2px' }}>
                              {post.breed}
                            </div>

                            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: '8px 0 12px', lineHeight: '1.4' }}>
                              {post.colour_markings}
                            </p>

                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={14} color="var(--primary-coral)" /> {post.address}
                            </div>
                          </div>

                          {/* Social Actions Bar (Votes, Remarks, Share, Archive) */}
                          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                title="Upvote post"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVotePost(post.id, 'up');
                                }}
                                style={{
                                  background: 'rgba(255,255,255,0.05)',
                                  border: '1px solid var(--border-subtle)',
                                  color: '#4ade80',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11px',
                                  fontWeight: 700
                                }}
                              >
                                <ThumbsUp size={12} /> {post.upvotes || 0}
                              </button>

                              <button
                                type="button"
                                title="Downvote"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVotePost(post.id, 'down');
                                }}
                                style={{
                                  background: 'rgba(255,255,255,0.05)',
                                  border: '1px solid var(--border-subtle)',
                                  color: '#f87171',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11px',
                                  fontWeight: 700
                                }}
                              >
                                <ThumbsDown size={12} /> {post.downvotes || 0}
                              </button>

                              <button
                                type="button"
                                title="Remarks / Comments"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPost(post);
                                  setIsDetailModalOpen(true);
                                }}
                                style={{
                                  background: 'rgba(255,255,255,0.05)',
                                  border: '1px solid var(--border-subtle)',
                                  color: '#c084fc',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11px',
                                  fontWeight: 700
                                }}
                              >
                                <MessageCircle size={12} /> {post.remarks_count || 0}
                              </button>

                              <button
                                type="button"
                                title="Share post"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSharePost(post);
                                }}
                                style={{
                                  background: 'rgba(255,255,255,0.05)',
                                  border: '1px solid var(--border-subtle)',
                                  color: copiedShareId === post.id ? '#4ade80' : '#cbd5e1',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11px'
                                }}
                              >
                                <Share2 size={12} /> {copiedShareId === post.id ? 'Copied!' : 'Share'}
                              </button>
                            </div>
                          </div>

                          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Posted by {post.owner_name}
                            </span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <Button variant="secondary" size="sm" icon={Eye}>
                                View Matches
                              </Button>

                              {/* Subtle minimal delete icon (invisible soft delete) */}
                              <button
                                type="button"
                                title={post.is_archived ? "Restore record" : "Remove"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleArchivePost(post.id, !post.is_archived);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#475569',
                                  padding: '4px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  opacity: 0.35,
                                  transition: 'opacity 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.35'}
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* VIEW 2: FORM FOR "I LOST MY DOG" */}
      {activeTab === 'lost_form' && (
        <Card variant="glass" style={{ maxWidth: '720px', margin: '0 auto', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f87171', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={24} /> Report Missing / Lost Dog
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Fill in the details below. Our system will immediately analyze sightings in your area and cross-match dog breed and color features.
          </p>

          <form onSubmit={(e) => { e.preventDefault(); handleSubmitForm('lost'); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Photo Upload Card */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Dog Photo</label>
              <div style={{
                padding: '24px',
                border: '2px dashed rgba(239, 68, 68, 0.4)',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center',
                background: 'rgba(15, 23, 42, 0.6)',
                cursor: 'pointer',
                position: 'relative'
              }}>
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" style={{ maxHeight: '180px', margin: '0 auto', borderRadius: '12px', objectFit: 'cover' }} />
                ) : (
                  <>
                    <Camera size={32} color="#f87171" style={{ marginBottom: '8px' }} />
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>Upload Photo of Missing Dog</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Used for Re-ID facial embedding search</div>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handlePhotoSelect} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Input label="Dog Name" placeholder="e.g. Bruno" value={dogName} onChange={(e) => setDogName(e.target.value)} required />
              <Input label="Breed" placeholder="e.g. Beagle / Desi Mix" value={breed} onChange={(e) => setBreed(e.target.value)} required />
            </div>

            <Input label="Colour & Distinctive Markings" placeholder="e.g. Tricolor brown black white, white chest patch, blue collar" value={colourMarkings} onChange={(e) => setColourMarkings(e.target.value)} required />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Input label="Approx Age / Sex" placeholder="e.g. 2 Years / Male" value={ageSex} onChange={(e) => setAgeSex(e.target.value)} />
              <Input label="Collar / Microchip Info" placeholder="e.g. Blue nylon collar with bell" value={collarMicrochip} onChange={(e) => setCollarMicrochip(e.target.value)} />
            </div>

            {/* Location Selector */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Last Seen Location</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ flex: 1, padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '8px', fontSize: '0.875rem', color: '#fff' }}>
                  <MapPin size={14} color="var(--primary-coral)" inline style={{ marginRight: '6px' }} />
                  {selectedLocation.address}
                </div>
                <Button type="button" variant="secondary" onClick={() => setIsLocationPickerOpen(true)}>
                  Change Location
                </Button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Input label="Date & Time Last Seen" type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
              <Input label="Optional Reward Amount (₹)" placeholder="e.g. ₹5,000" value={reward} onChange={(e) => setReward(e.target.value)} />
            </div>

            <Button type="submit" variant="critical" size="lg" icon={AlertCircle} style={{ marginTop: '8px' }}>
              Publish Lost Dog Post & Run Re-ID Match
            </Button>
          </form>
        </Card>
      )}

      {/* VIEW 3: FORM FOR "I FOUND A DOG" */}
      {activeTab === 'found_form' && (
        <Card variant="glass" style={{ maxWidth: '720px', margin: '0 auto', borderColor: 'rgba(167, 139, 250, 0.4)' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#c084fc', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={24} /> Report Found / Spotted Stray Dog
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Spotted or rescued a stray dog? Upload photo and location to match with pet owners searching for lost dogs.
          </p>

          <form onSubmit={(e) => { e.preventDefault(); handleSubmitForm('found'); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Photo Upload Card */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Found Dog Photo</label>
              <div style={{
                padding: '24px',
                border: '2px dashed rgba(167, 139, 250, 0.4)',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center',
                background: 'rgba(15, 23, 42, 0.6)',
                cursor: 'pointer',
                position: 'relative'
              }}>
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" style={{ maxHeight: '180px', margin: '0 auto', borderRadius: '12px', objectFit: 'cover' }} />
                ) : (
                  <>
                    <Camera size={32} color="#c084fc" style={{ marginBottom: '8px' }} />
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>Upload Photo of Found Dog</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Used for Re-ID facial embedding search</div>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handlePhotoSelect} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Input label="Breed / Species Estimate" placeholder="e.g. Beagle / Desi Mix" value={breed} onChange={(e) => setBreed(e.target.value)} required />
              <Input label="Colour & Markings" placeholder="e.g. Tricolor brown black white" value={colourMarkings} onChange={(e) => setColourMarkings(e.target.value)} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Input label="Dog Health / Condition" placeholder="e.g. Healthy, Scared, Injured" value={condition} onChange={(e) => setCondition(e.target.value)} />
              <Input label="Collar / Tag Info" placeholder="e.g. Has blue nylon collar" value={collarMicrochip} onChange={(e) => setCollarMicrochip(e.target.value)} />
            </div>

            {/* Location Selector */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Sighting / Found Location</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ flex: 1, padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '8px', fontSize: '0.875rem', color: '#fff' }}>
                  <MapPin size={14} color="var(--primary-coral)" inline style={{ marginRight: '6px' }} />
                  {selectedLocation.address}
                </div>
                <Button type="button" variant="secondary" onClick={() => setIsLocationPickerOpen(true)}>
                  Change Location
                </Button>
              </div>
            </div>

            <Input label="Date & Time Found" type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />

            <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid var(--border-subtle)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.875rem', color: '#fff' }}>
                <input type="checkbox" checked={keepingSafe} onChange={(e) => setKeepingSafe(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                <span>I am currently keeping this dog safe at my home / shelter</span>
              </label>
            </div>

            <Button type="submit" variant="brand" size="lg" icon={CheckCircle2} style={{ marginTop: '8px', background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' }}>
              Publish Found Dog Post & Run Re-ID Match
            </Button>
          </form>
        </Card>
      )}

      {/* LOCATION PICKER MODAL */}
      {isLocationPickerOpen && (
        <Modal isOpen={isLocationPickerOpen} onClose={() => setIsLocationPickerOpen(false)} title="Select Sighting Location on Map" maxWidth="600px">
          <LocationPicker
            initialLocation={selectedLocation}
            onSelectLocation={(loc) => {
              setSelectedLocation(loc);
              setIsLocationPickerOpen(false);
            }}
            onCancel={() => setIsLocationPickerOpen(false)}
          />
        </Modal>
      )}

      {/* POST DETAILS & SMART MATCHING MODAL */}
      {isDetailModalOpen && selectedPost && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`${selectedPost.kind.toUpperCase()} DOG — ${selectedPost.dog_name}`}
          maxWidth="760px"
        >
          <PawBurstContainer type="heart">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Safety Warning Banner */}
              <div style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: '#fbbf24',
                fontSize: '0.825rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                lineHeight: '1.4'
              }}>
                <ShieldAlert size={20} className="shrink-0" />
                <div>
                  <strong>Safety Notice:</strong> Meet in well-lit public places. Never send advance money or reward fees before verifying the pet in person.
                </div>
              </div>

              {/* Post Header Card */}
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <img
                  src={selectedPost.photo}
                  alt={selectedPost.dog_name}
                  style={{ width: '180px', height: '180px', objectFit: 'cover', borderRadius: '16px' }}
                />
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <Badge variant={selectedPost.kind === 'lost' ? 'critical' : 'brand'}>
                      {selectedPost.kind.toUpperCase()} PET
                    </Badge>
                    <Badge variant={selectedPost.status === 'reunited' ? 'emerald' : 'normal'}>
                      STATUS: {selectedPost.status.toUpperCase()}
                    </Badge>
                  </div>

                  <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>{selectedPost.dog_name}</h3>
                  <div style={{ fontSize: '0.9rem', color: '#c084fc', fontWeight: 700 }}>{selectedPost.breed}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>{selectedPost.colour_markings}</div>

                  <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={14} color="var(--primary-coral)" /> {selectedPost.address}
                  </div>

                  {selectedPost.reward && (
                    <div style={{ marginTop: '10px', color: '#fbbf24', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Award size={16} /> Reward Offered: {selectedPost.reward}
                    </div>
                  )}

                  {/* Phone Privacy Display */}
                  <div style={{ marginTop: '14px', padding: '10px 14px', background: 'rgba(30, 41, 59, 0.8)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Contact Phone:</div>
                    {selectedPost.phone_hidden ? (
                      <div style={{ fontSize: '0.85rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Lock size={14} /> {selectedPost.owner_phone}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <a href={`tel:${selectedPost.owner_phone}`} style={{ fontSize: '0.95rem', fontWeight: 800, color: '#4ade80', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={14} /> {selectedPost.owner_phone}
                        </a>
                        <a href={`https://wa.me/${selectedPost.owner_phone?.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', background: '#25D366', color: '#fff', padding: '2px 8px', borderRadius: '4px', textDecoration: 'none', fontWeight: 700 }}>
                          WhatsApp
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SMART MATCHES SECTION */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} color="#c084fc" /> Smart Re-ID Candidates ({selectedPost.matches?.length || 0})
                </h4>

                {selectedPost.matches && selectedPost.matches.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedPost.matches.map((m) => (
                      <div
                        key={m.match_id}
                        style={{
                          padding: '12px 16px',
                          background: 'rgba(15, 23, 42, 0.8)',
                          borderRadius: 'var(--radius-md)',
                          border: m.status === 'confirmed' ? '1px solid #22c55e' : '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img src={m.photo} alt="Candidate" style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} />
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>
                              {m.kind.toUpperCase()} — {m.dog_name || m.breed}
                            </div>
                            <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>📍 {m.address}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Badge variant={m.score >= 75 ? 'emerald' : 'brand'}>
                            ⚡ {m.score}% Match
                          </Badge>

                          {m.status === 'confirmed' ? (
                            <Badge variant="emerald">✓ CONFIRMED MATCH</Badge>
                          ) : (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <Button
                                variant="emerald"
                                size="sm"
                                icon={Check}
                                onClick={() => handleCitizenOpinion(m.match_id, 'match')}
                              >
                                I Think It's a Match ✓
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={X}
                                onClick={() => handleCitizenOpinion(m.match_id, 'not_a_match')}
                                style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                              >
                                Not a Match ✕
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No potential matches found yet. Our algorithm runs continuously as new sightings are reported.
                  </div>
                )}
              </div>

              {/* SOCIAL COMMUNITY REMARKS / COMMENTS (Instagram Style) */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageCircle size={16} color="#4ade80" /> Community Sightings & Remarks ({selectedPost.remarks?.length || 0})
                </h4>

                <div style={{
                  maxHeight: '160px',
                  overflowY: 'auto',
                  background: 'rgba(15, 23, 42, 0.7)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  marginBottom: '10px'
                }}>
                  {(!selectedPost.remarks || selectedPost.remarks.length === 0) ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>
                      No community remarks yet. Seen this dog or have information? Post a comment below!
                    </div>
                  ) : (
                    selectedPost.remarks.map((rmk) => (
                      <div key={rmk.id} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '3px' }}>
                          <strong style={{ color: '#4ade80' }}>@{rmk.author_name}</strong>
                          <span style={{ color: 'var(--text-muted)' }}>{rmk.created_at ? new Date(rmk.created_at).toLocaleString() : ''}</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#fff' }}>{rmk.comment}</div>
                      </div>
                    ))
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <Input
                    placeholder="Leave a helpful remark, sighting note, or tip..."
                    value={remarksInput}
                    onChange={(e) => setRemarksInput(e.target.value)}
                  />
                  <Button
                    variant="emerald"
                    size="sm"
                    loading={isSubmittingRemark}
                    onClick={() => handleAddRemark(selectedPost.id)}
                  >
                    Post Remark
                  </Button>
                </div>
              </div>

              {/* IN-APP MESSAGING THREAD */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={16} color="#c084fc" /> In-App Direct Messages
                </h4>

                <div style={{
                  maxHeight: '180px',
                  overflowY: 'auto',
                  background: 'rgba(15, 23, 42, 0.9)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  marginBottom: '10px'
                }}>
                  {postMessages.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>
                      No messages yet. Send a message to contact the poster.
                    </div>
                  ) : (
                    postMessages.map((msg) => (
                      <div
                        key={msg.id}
                        style={{
                          alignSelf: user && msg.sender_id === user.id ? 'flex-end' : 'flex-start',
                          maxWidth: '80%',
                          background: user && msg.sender_id === user.id ? '#8b5cf6' : 'rgba(30, 41, 59, 0.8)',
                          color: '#fff',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          fontSize: '0.85rem'
                        }}
                      >
                        <div style={{ fontSize: '0.7rem', opacity: 0.8, marginBottom: '2px' }}>{msg.sender_name}</div>
                        <div>{msg.body}</div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
                  <Input
                    placeholder="Type message to owner/finder..."
                    value={msgInput}
                    onChange={(e) => setMsgInput(e.target.value)}
                  />
                  <Button type="submit" variant="brand" icon={Send} loading={isSendingMsg}>
                    Send
                  </Button>
                </form>
              </div>

              {/* POST ACTIONS FOOTER (No citizen delete post button) */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button variant="secondary" size="sm" icon={AlertTriangle} onClick={() => handleReportPost(selectedPost.id)}>
                  Report Post
                </Button>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {/* Share button */}
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Share2}
                    onClick={() => handleSharePost(selectedPost)}
                  >
                    {copiedShareId === selectedPost.id ? 'Copied Alert!' : 'Share Post'}
                  </Button>

                  {selectedPost.status !== 'reunited' && (
                    <Button variant="emerald" size="sm" icon={Heart} onClick={() => handleMarkReunited(selectedPost.id)}>
                      Mark Reunited 🎉
                    </Button>
                  )}

                  {/* Subtle minimal delete icon */}
                  <button
                    type="button"
                    title={selectedPost.is_archived ? "Restore record" : "Remove"}
                    onClick={() => handleArchivePost(selectedPost.id, !selectedPost.is_archived)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#475569',
                      padding: '4px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0.35,
                      transition: 'opacity 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.35'}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

            </div>
          </PawBurstContainer>
        </Modal>
      )}

      {/* EDIT POST MODAL (Govt/NGO & Post Owner Edit) */}
      {isEditModalOpen && editingPostData && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Edit Post #${editingPostData.id}`}
          maxWidth="500px"
        >
          <form onSubmit={handleSaveEditPost} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Dog Name</label>
              <input
                type="text"
                value={editingPostData.dog_name || ''}
                onChange={(e) => setEditingPostData({ ...editingPostData, dog_name: e.target.value })}
                style={{ width: '100%', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Breed</label>
              <input
                type="text"
                value={editingPostData.breed || ''}
                onChange={(e) => setEditingPostData({ ...editingPostData, breed: e.target.value })}
                style={{ width: '100%', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Colour Markings & Notes</label>
              <input
                type="text"
                value={editingPostData.colour_markings || ''}
                onChange={(e) => setEditingPostData({ ...editingPostData, colour_markings: e.target.value })}
                style={{ width: '100%', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11.5px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Status</label>
              <select
                value={editingPostData.status || 'open'}
                onChange={(e) => setEditingPostData({ ...editingPostData, status: e.target.value })}
                style={{ width: '100%', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px', color: '#fff' }}
              >
                <option value="open">Open</option>
                <option value="matched">Matched</option>
                <option value="reunited">Reunited</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="emerald">
                Save Changes ✓
              </Button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
}

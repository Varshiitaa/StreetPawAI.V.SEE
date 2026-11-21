import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import OverviewPage from './pages/OverviewPage';
import AIModularSuitePage from './pages/AIModularSuitePage';
import RegistryPage from './pages/RegistryPage';
import MapPage from './pages/MapPage';
import NgoDashboardPage from './pages/NgoDashboardPage';
import AuthPage from './pages/AuthPage';
import ChatAssistantPage from './pages/ChatAssistantPage';
import MyComplaintsPage from './pages/MyComplaintsPage';
import { LostFoundPage } from './pages/LostFoundPage';
import { HelpContactsPage } from './pages/HelpContactsPage';
import { LostFoundDeskPage } from './pages/LostFoundDeskPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminAuditPage } from './pages/AdminAuditPage';
import { ShelterManagementPage } from './pages/ShelterManagementPage';
import { DirectMessagesPage } from './pages/DirectMessagesPage';
import RegisterAnimalModal from './components/RegisterAnimalModal';
import RegisterComplaintModal from './components/RegisterComplaintModal';
import SosModal from './components/SosModal';

export default function App() {
  // Authentication State: Require login / signup first
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // App Navigation
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'ai-suite' | 'registry' | 'map' | 'ngo-dashboard' | 'copilot' | 'my-complaints'
  const [userRole, setUserRole] = useState('citizen'); // 'citizen' | 'ngo'
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [activeAnimalId, setActiveAnimalId] = useState('');
  const [activePhotoFile, setActivePhotoFile] = useState(null);
  const [activePhotoPreview, setActivePhotoPreview] = useState(null);
  const [activeBreed, setActiveBreed] = useState('Indian Breed');

  // Handle successful login or account creation
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setUserRole(user.role);
    setIsAuthenticated(true);
    // Open website accordingly based on role chosen during login
    if (user.role === 'ngo') {
      setActiveTab('ngo-dashboard');
    } else {
      setActiveTab('overview');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  // If not logged in, show AuthPage first with Citizen / NGO selector
  if (!isAuthenticated) {
    return (
      <AuthPage 
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="app-container">
      {/* Dark Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userRole={userRole}
        setUserRole={setUserRole}
        onOpenSos={() => setIsComplaintModalOpen(true)}
        onLogout={handleLogout}
        currentUser={currentUser}
      />

      {/* Main Content Area */}
      <div className="main-content">
        <Header 
          onPinSighting={() => setActiveTab('map')}
          onOpenSos={() => setIsComplaintModalOpen(true)}
          userRole={userRole}
        />

        <main style={{ flex: 1, paddingBottom: '40px' }}>
          {activeTab === 'overview' && (
            <OverviewPage 
              onOpenAISuite={() => setActiveTab('ai-suite')}
              onOpenRegistry={() => setActiveTab('registry')}
              onOpenMap={() => setActiveTab('map')}
              onOpenSos={() => setIsComplaintModalOpen(true)}
            />
          )}

          {activeTab === 'ai-suite' && (
            <AIModularSuitePage 
              onRegisterNewAnimal={(id, photoFile, photoUrl, breed) => {
                setActiveAnimalId(id);
                setActivePhotoFile(photoFile || null);
                setActivePhotoPreview(photoUrl || null);
                if (breed) setActiveBreed(breed);
                setIsRegisterOpen(true);
              }}
              prefilledAnimalId={activeAnimalId}
            />
          )}

          {activeTab === 'registry' && (
            <RegistryPage 
              onSelectAnimal={(animal) => {
                setActiveAnimalId(animal.animal_id || animal.public_code || `PAW-${animal.id}`);
                setActiveTab('ai-suite');
              }}
              onOpenRegisterModal={() => setIsRegisterOpen(true)}
              userRole={userRole}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'map' && (
            <MapPage 
              onPinNewSighting={() => setIsRegisterOpen(true)}
              userRole={userRole}
            />
          )}

          {activeTab === 'ngo-dashboard' && (
            <NgoDashboardPage />
          )}

          {activeTab === 'my-complaints' && (
            <MyComplaintsPage 
              onOpenNewComplaint={() => setIsComplaintModalOpen(true)}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'copilot' && (
            <ChatAssistantPage 
              onOpenSos={() => setIsComplaintModalOpen(true)}
              onOpenMap={() => setActiveTab('map')}
            />
          )}

          {/* Vrinda Additional Features: Citizen Desk */}
          {activeTab === 'lost-found' && (
            <LostFoundPage />
          )}

          {activeTab === 'messages' && (
            <DirectMessagesPage />
          )}

          {activeTab === 'help-contacts' && (
            <HelpContactsPage />
          )}

          {/* Vrinda Additional Features: NGO / Admin Operations Desk */}
          {activeTab === 'lost-found-desk' && (
            <LostFoundDeskPage 
              authToken={localStorage.getItem('streetpaw_token') || localStorage.getItem('ngo_token')} 
            />
          )}

          {activeTab === 'shelter-mgmt' && (
            <ShelterManagementPage />
          )}

          {activeTab === 'admin-users' && (
            <AdminUsersPage 
              adminToken={localStorage.getItem('streetpaw_token') || localStorage.getItem('ngo_token')} 
            />
          )}

          {activeTab === 'admin-audit' && (
            <AdminAuditPage 
              authToken={localStorage.getItem('streetpaw_token') || localStorage.getItem('ngo_token')} 
              currentUser={currentUser}
            />
          )}

          {activeTab === 'excel-export' && (
            <div style={{ maxWidth: '800px', margin: '40px auto', padding: '32px', background: 'var(--card-bg, #0f172a)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
                📊 Master Excel / CSV Export Center
              </h2>
              <p style={{ color: 'var(--text-muted, #94a3b8)', marginBottom: '24px', fontSize: '14px' }}>
                Download comprehensive datasets styled with automated openpyxl formatting, formulas, and auto-adjusted column widths.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <a 
                  href="http://localhost:8000/api/exports/dogs.xlsx" 
                  download="streetpaw_dogs_registry.xlsx"
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>🐶</div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#10b981', marginBottom: '4px' }}>Canine Registry Excel</h3>
                    <p style={{ fontSize: '12px', color: '#cbd5e1' }}>Download complete census of all 134+ registered street canines with ID, breed, health & GPS coordinates.</p>
                    <div style={{ marginTop: '12px', fontSize: '12px', fontWeight: 700, color: '#10b981' }}>Download .XLSX →</div>
                  </div>
                </a>

                <a 
                  href="http://localhost:8000/api/exports/complaints.xlsx" 
                  download="streetpaw_complaints_dispatch.xlsx"
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>🚨</div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#3b82f6', marginBottom: '4px' }}>Distress & Rescue Tickets</h3>
                    <p style={{ fontSize: '12px', color: '#cbd5e1' }}>Export dispatch logs, reported complaints, response time metrics and resolution status.</p>
                    <div style={{ marginTop: '12px', fontSize: '12px', fontWeight: 700, color: '#3b82f6' }}>Download .XLSX →</div>
                  </div>
                </a>

                <a 
                  href="http://localhost:8000/api/exports/dogs.csv" 
                  download="streetpaw_dogs.csv"
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>📁</div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#a855f7', marginBottom: '4px' }}>Raw Dataset CSV</h3>
                    <p style={{ fontSize: '12px', color: '#cbd5e1' }}>Plain CSV text format for Python Pandas, R, or rapid analytical modeling pipelines.</p>
                    <div style={{ marginTop: '12px', fontSize: '12px', fontWeight: 700, color: '#a855f7' }}>Download .CSV →</div>
                  </div>
                </a>

                <a 
                  href="http://localhost:8000/api/exports/lost-found.xlsx" 
                  download="streetpaw_lost_found_registry.xlsx"
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.3)', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔍</div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ec4899', marginBottom: '4px' }}>Lost & Found Registry</h3>
                    <p style={{ fontSize: '12px', color: '#cbd5e1' }}>Export missing pet notices, stray sightings, and AI similarity scores.</p>
                    <div style={{ marginTop: '12px', fontSize: '12px', fontWeight: 700, color: '#ec4899' }}>Download .XLSX →</div>
                  </div>
                </a>

                <a 
                  href="http://localhost:8000/api/exports/full-report.xlsx" 
                  download="streetpaw_full_welfare_report.xlsx"
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>📑</div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f59e0b', marginBottom: '4px' }}>Full Multi-Sheet Report</h3>
                    <p style={{ fontSize: '12px', color: '#cbd5e1' }}>Comprehensive master workbook with Dogs, Sightings, Vaccinations, and Complaints.</p>
                    <div style={{ marginTop: '12px', fontSize: '12px', fontWeight: 700, color: '#f59e0b' }}>Download .XLSX →</div>
                  </div>
                </a>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Register Animal Tag Modal */}
      <RegisterAnimalModal 
        isOpen={isRegisterOpen}
        onClose={() => {
          setIsRegisterOpen(false);
          setActivePhotoFile(null);
          setActivePhotoPreview(null);
        }}
        initialAnimalId={activeAnimalId}
        initialPhotoFile={activePhotoFile}
        initialPhotoPreview={activePhotoPreview}
        initialBreed={activeBreed}
        onRegistered={(newDog) => {
          setActiveAnimalId(newDog.animal_id || newDog.public_code);
          setActivePhotoFile(null);
          setActivePhotoPreview(null);
          setActiveTab('registry');
        }}
      />

      {/* Register Complaint & Distress Ticket Modal */}
      <RegisterComplaintModal 
        isOpen={isComplaintModalOpen}
        onClose={() => setIsComplaintModalOpen(false)}
        currentUser={currentUser}
        onComplaintCreated={() => {
          setActiveTab('my-complaints');
        }}
      />

      {/* Emergency Distress SOS Modal */}
      <SosModal 
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
      />
    </div>
  );
}

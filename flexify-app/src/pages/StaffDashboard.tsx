import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminApi, type AdminStats, type User } from '../api';
import { Users, Shield, CheckCircle, XCircle, Search, Filter, AlertTriangle, FileText, Info } from 'lucide-react';
import './Dashboard.css';

export default function StaffDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingVerifications, setPendingVerifications] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<boolean[]>([false, false, false, false]);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [rejectConfirmId, setRejectConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Reset checklist when user changes
    setCheckedItems([false, false, false, false]);
    setEnhancedImage(null);
  }, [selectedUser]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, ver] = await Promise.all([
        adminApi.getStats().catch(() => null),
        adminApi.getPendingVerifications().catch(() => []),
      ]);
      if (s) setStats(s);
      setPendingVerifications(ver);
    } catch (err) {
      console.error('Error fetching staff data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = (idx: number) => {
    const updated = [...checkedItems];
    updated[idx] = !updated[idx];
    setCheckedItems(updated);
  };

  const allChecked = checkedItems.every(Boolean);

  const handleApproveOwner = async (userId: string) => {
    if (!allChecked) return;
    setActionLoading(userId);
    try {
      await adminApi.approveOwner(userId);
      setPendingVerifications(prev => prev.filter(u => (u.id || u._id) !== userId));
      setShowVerificationModal(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectOwner = async (userId: string) => {
    setActionLoading(userId);
    try {
      await adminApi.rejectOwner(userId);
      setPendingVerifications(prev => prev.filter(u => (u.id || u._id) !== userId));
      setShowVerificationModal(false);
      setRejectConfirmId(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredVerifications = pendingVerifications.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.verificationRequest?.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user || user.role !== 'staff') {
    return (
      <div className="container" style={{ padding: '6rem 2rem', textAlign: 'center' }}>
        <Shield size={48} color="var(--error-color)" style={{ marginBottom: '1rem' }} />
        <h2>Staff Access Required</h2>
        <p>You do not have permission to access this page.</p>
        <button onClick={() => window.history.back()} className="btn btn-primary" style={{ marginTop: '1.5rem' }}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="dashboard-page bg-secondary">
      <div className="dashboard-header" style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)', padding: '5rem 0 4rem' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 16px', borderRadius: '30px', fontSize: '11px', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Secure Identity Management</span>
              <h1 style={{ marginTop: '0.75rem', fontSize: '2.5rem' }}>Staff Verification Portal</h1>
              <p style={{ opacity: 0.9, fontSize: '1.1rem', marginTop: '0.5rem' }}>Reviewing and maintaining the integrity of the Flexify community.</p>
            </div>
            <div className="header-stats" style={{ display: 'flex', gap: '3rem' }}>
               <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 800 }}>{pendingVerifications.length}</div>
                  <div style={{ fontSize: '12px', opacity: 0.8, textTransform: 'uppercase' }}>Waiting</div>
               </div>
               <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 800 }}>{stats?.totalUsers || 0}</div>
                  <div style={{ fontSize: '12px', opacity: 0.8, textTransform: 'uppercase' }}>Total Users</div>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container dashboard-content" style={{ marginTop: '-2rem' }}>
        {/* Verification Summary Cards */}
        <div className="dashboard-stats" style={{ marginBottom: '2.5rem' }}>
          <div className="stat-card card shadow-sm">
            <div className="stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><CheckCircle size={24} /></div>
            <div className="stat-info">
              <span className="stat-number">{stats?.totalUsers || 0}</span>
              <span className="stat-label">Active Users</span>
            </div>
          </div>
          <div className="stat-card card shadow-sm">
            <div className="stat-icon" style={{ background: '#fff7ed', color: '#ea580c' }}><Shield size={24} /></div>
            <div className="stat-info">
              <span className="stat-number">{pendingVerifications.length}</span>
              <span className="stat-label">Pending Review</span>
            </div>
          </div>
          <div className="stat-card card shadow-sm">
            <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><Users size={24} /></div>
            <div className="stat-info">
              <span className="stat-number">{filteredVerifications.length}</span>
              <span className="stat-label">Matching Filter</span>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
           <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', zIndex: 1 }} />
              <input 
                type="text" 
                placeholder="Search by name, email or ID details..." 
                className="input-field" 
                style={{ paddingLeft: '40px', borderRadius: '12px', background: 'white' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
           </div>
           <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-ghost" style={{ background: 'white' }} onClick={fetchData}>
                <Filter size={16} /> Filters
              </button>
              <button className="btn btn-primary" onClick={fetchData}>Refresh Data</button>
           </div>
        </div>

        {/* Verification List */}
        <div className="card shadow-md" style={{ padding: '0', overflow: 'hidden', border: 'none' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-tertiary)' }}>
              <div className="loading-spinner" style={{ marginBottom: '1rem' }}></div>
              <p>Fetching pending verifications...</p>
            </div>
          ) : filteredVerifications.length === 0 ? (
            <div className="dashboard-empty" style={{ padding: '6rem 2rem' }}>
              <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '50%', marginBottom: '1rem' }}>
                <Shield size={48} strokeWidth={1} />
              </div>
              <h3 style={{ color: 'var(--text-primary)' }}>All Clear!</h3>
              <p style={{ maxWidth: '400px', textAlign: 'center' }}>{searchQuery ? `No results found for "${searchQuery}".` : 'There are no pending identity verification requests at the moment.'}</p>
              {searchQuery && <button className="btn btn-ghost mt-2" onClick={() => setSearchQuery('')}>Clear Search</button>}
            </div>
          ) : (
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Requested User</th>
                  <th style={{ width: '20%' }}>Request Type</th>
                  <th style={{ width: '20%' }}>Submission Date</th>
                  <th style={{ width: '10%' }}>System Risk</th>
                  <th style={{ width: '20%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVerifications.map(u => {
                  const id = (u.id || u._id)!;
                  const isSuspicious = !u.phone || !u.verificationRequest?.idFront;
                  
                  return (
                    <tr key={id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                           <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(45deg, #0d9488, #5eead4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '16px' }}>
                              {u.name.charAt(0)}
                           </div>
                           <div className="table-vehicle">
                              <strong>{u.verificationRequest?.fullName || u.name}</strong>
                              <span>{u.email}</span>
                           </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-primary" style={{ background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }}>
                           {u.verificationRequest?.type || 'Standard'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                           <span style={{ fontWeight: 500 }}>{u.verificationRequest?.submittedAt ? new Date(u.verificationRequest.submittedAt).toLocaleDateString() : 'N/A'}</span>
                           <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{u.verificationRequest?.submittedAt ? new Date(u.verificationRequest.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                      </td>
                      <td>
                        {isSuspicious ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontSize: '12px', fontWeight: 600 }}>
                            <AlertTriangle size={14} /> High
                          </span>
                        ) : (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '12px', fontWeight: 600 }}>
                            <CheckCircle size={14} /> Low
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                          <button 
                            className="btn btn-sm" 
                            style={{ 
                              background: '#1e293b', 
                              color: 'white',
                              borderRadius: '8px',
                              padding: '6px 16px',
                              fontWeight: 700,
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              border: 'none',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                            onClick={() => { setSelectedUser(u); setShowVerificationModal(true); }}
                          >
                            <Shield size={14} /> Verify Identity
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Verification Detail Modal */}
      {showVerificationModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowVerificationModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '1000px', width: '95%', padding: '0', borderRadius: '24px', overflow: 'hidden' }}>
             <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                   <div style={{ padding: '10px', background: 'var(--primary-color)', color: 'white', borderRadius: '12px' }}>
                      <Shield size={24} />
                   </div>
                   <div>
                      <h2 style={{ fontSize: '1.25rem', marginBottom: '0' }}>Identity Verification</h2>
                      <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: 0 }}>Review documents and user information carefully.</p>
                   </div>
                </div>
                <button className="modal-close" onClick={() => setShowVerificationModal(false)} style={{ position: 'static', padding: '8px' }}>&times;</button>
             </div>

             <div className="verification-detail-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 350px) 1fr', height: 'calc(85vh - 140px)', maxHeight: '800px' }}>
                {/* Left Panel: Information */}
                <div style={{ padding: '2rem', borderRight: '1px solid #e2e8f0', overflowY: 'auto', background: '#ffffff' }}>
                   <div style={{ marginBottom: '2.5rem' }}>
                      <h3 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-tertiary)', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '4px', height: '14px', background: 'var(--primary-color)', borderRadius: '2px' }}></span>
                        Personal Information
                      </h3>
                      
                      <div style={{ display: 'grid', gap: '1.25rem' }}>
                        <div className="info-group">
                           <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Full Identity Name</label>
                           <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e293b' }}>{selectedUser.verificationRequest?.fullName || selectedUser.name}</div>
                        </div>
                        
                        <div className="info-group">
                           <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Primary Contact</label>
                           <div style={{ fontWeight: 600, color: '#475569' }}>{selectedUser.email}</div>
                        </div>
                        
                        <div className="info-group">
                           <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Registered Phone</label>
                           <div style={{ fontWeight: 600, color: '#475569' }}>{selectedUser.verificationRequest?.phone || 'Not provided'}</div>
                           {!selectedUser.verificationRequest?.phone && (
                             <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#991b1b', padding: '6px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                               <AlertTriangle size={12} /> SYSTEM FLAG: MISSING PHONE
                             </div>
                           )}
                        </div>
                        
                        <div className="info-group">
                           <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Verified Address</label>
                           <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#475569', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                             {selectedUser.verificationRequest?.address || 'No physical address provided on file.'}
                           </div>
                        </div>
                      </div>
                   </div>

                   <div style={{ background: 'linear-gradient(to bottom right, #f0f9ff, #e0f2fe)', padding: '1.25rem', borderRadius: '16px', border: '1px solid #bae6fd', marginBottom: '1.5rem' }}>
                      <h4 style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: '#0369a1', marginBottom: '10px' }}>
                        <Info size={14} /> Submission Metadata
                      </h4>
                      <div style={{ display: 'grid', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ color: '#0c4a6e', opacity: 0.7 }}>Channel:</span>
                          <strong style={{ color: '#0c4a6e' }}>{selectedUser.verificationRequest?.type || 'Identity-Portal'}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ color: '#0c4a6e', opacity: 0.7 }}>Submitted:</span>
                          <strong style={{ color: '#0c4a6e' }}>{selectedUser.verificationRequest?.submittedAt ? new Date(selectedUser.verificationRequest.submittedAt).toLocaleDateString() : 'Pending'}</strong>
                        </div>
                      </div>
                   </div>

                   <div style={{ padding: '1.25rem', background: '#fff1f2', borderRadius: '16px', border: '1px solid #ffe4e6' }}>
                      <h4 style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: '#e11d48', marginBottom: '10px' }}>
                        <AlertTriangle size={14} /> Critical Review Checklist
                      </h4>
                       <div style={{ display: 'grid', gap: '8px' }}>
                          {[
                            "Cross-check ID Front/Back serial numbers",
                            "Verify Selfie matches Government ID photo",
                            "Check for digital editing or artifacts",
                            "Ensure name matches bank/payment records"
                          ].map((item, idx) => (
                            <div 
                              key={idx} 
                              onClick={() => handleCheck(idx)}
                              style={{ 
                                display: 'flex', 
                                gap: '8px', 
                                fontSize: '11px', 
                                color: checkedItems[idx] ? '#065f46' : '#9f1239', 
                                fontWeight: 600,
                                cursor: 'pointer',
                                background: checkedItems[idx] ? '#ecfdf5' : 'transparent',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                transition: 'all 0.2s'
                              }}
                            >
                              <div style={{ 
                                minWidth: '16px', 
                                height: '16px', 
                                border: `2px solid ${checkedItems[idx] ? '#10b981' : '#fda4af'}`, 
                                borderRadius: '4px', 
                                background: checkedItems[idx] ? '#10b981' : 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white'
                              }}>
                                {checkedItems[idx] && <CheckCircle size={12} />}
                              </div>
                              {item}
                            </div>
                          ))}
                       </div>
                   </div>
                </div>

                {/* Right Panel: Documents */}
                <div style={{ background: '#f8fafc', padding: '2rem', overflowY: 'auto' }}>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
                      <div className="doc-section">
                         <h3 style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#334155', marginBottom: '1.5rem' }}>
                           <FileText size={18} color="var(--primary-color)" /> Document Verification Bay
                         </h3>
                         
                         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
                            {[
                              { label: 'Primary ID Identification (Front)', field: 'idFront' },
                              { label: 'Primary ID Identification (Back)', field: 'idBack' },
                              { label: 'Live Verification Selfie', field: 'userPhoto' }
                            ].map((doc, idx) => (
                              <div key={idx} className="doc-card" style={{ background: 'white', padding: '16px', borderRadius: '20px', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
                                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                   <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{doc.label}</div>
                                   <div style={{ padding: '4px 8px', background: '#f1f5f9', borderRadius: '6px', fontSize: '10px', color: '#94a3b8' }}>HD Quality Check</div>
                                 </div>
                                 <div style={{ width: '100%', height: '280px', background: '#f8fafc', borderRadius: '12px', overflow: 'hidden', cursor: 'zoom-in', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #e2e8f0', transition: 'all 0.2s' }}>
                                    {selectedUser.verificationRequest?.[doc.field as keyof typeof selectedUser.verificationRequest] ? (
                                      <img 
                                        src={selectedUser.verificationRequest[doc.field as keyof typeof selectedUser.verificationRequest] as string} 
                                        alt={doc.label} 
                                        style={{ 
                                          width: '100%', 
                                          height: '100%', 
                                          objectFit: 'contain',
                                          filter: enhancedImage === doc.field ? 'contrast(1.2) brightness(1.1) sharpen(1.2)' : 'none'
                                        }} 
                                      />
                                    ) : (
                                      <div style={{ color: '#cbd5e1', textAlign: 'center' }}>
                                        <FileText size={48} strokeWidth={1} style={{ marginBottom: '8px' }} />
                                        <p style={{ fontSize: '12px', fontWeight: 600 }}>MISSING DOCUMENT</p>
                                      </div>
                                    )}
                                 </div>
                                 <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                                    <button 
                                      className="btn btn-ghost btn-sm" 
                                      style={{ fontSize: '11px' }}
                                      onClick={() => setFullScreenImage(selectedUser.verificationRequest?.[doc.field as keyof typeof selectedUser.verificationRequest] as string)}
                                    >
                                      Open Fullscreen
                                    </button>
                                    <button 
                                      className="btn btn-ghost btn-sm" 
                                      style={{ fontSize: '11px', color: enhancedImage === doc.field ? 'var(--primary-color)' : 'inherit' }}
                                      onClick={() => setEnhancedImage(enhancedImage === doc.field ? null : doc.field)}
                                    >
                                      {enhancedImage === doc.field ? 'Reset View' : 'Enhance View'}
                                    </button>
                                 </div>
                              </div>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             <div className="modal-actions" style={{ padding: '1.5rem 2rem', background: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '1.25rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                <button 
                  className="btn btn-ghost" 
                  onClick={() => setShowVerificationModal(false)}
                  style={{ fontWeight: 600, color: '#64748b' }}
                >
                  Cancel Review
                </button>
                
                <div style={{ height: '32px', width: '1px', background: '#e2e8f0' }}></div>
                
                <button 
                  className="btn" 
                  disabled={actionLoading === (selectedUser.id || selectedUser._id)}
                  onClick={() => setRejectConfirmId((selectedUser.id || selectedUser._id)!)}
                  style={{ 
                    background: '#fff1f2', 
                    color: '#e11d48', 
                    border: '1px solid #ffe4e6',
                    padding: '0.75rem 1.75rem',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    minWidth: '180px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#ffe4e6'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fff1f2'; }}
                >
                  <XCircle size={18} /> Reject Identity
                </button>
                
                <button 
                  className="btn" 
                  disabled={actionLoading === (selectedUser.id || selectedUser._id) || !allChecked}
                  onClick={() => handleApproveOwner((selectedUser.id || selectedUser._id)!)}
                  style={{ 
                    background: allChecked ? 'linear-gradient(135deg, #0d9488, #14b8a6)' : '#e2e8f0', 
                    color: allChecked ? 'white' : '#94a3b8', 
                    boxShadow: allChecked ? '0 4px 12px rgba(13, 148, 136, 0.25)' : 'none',
                    cursor: allChecked ? 'pointer' : 'not-allowed',
                    padding: '0.75rem 2rem',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    minWidth: '200px',
                    border: 'none',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { 
                    if (allChecked) {
                      e.currentTarget.style.transform = 'translateY(-1px)'; 
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(13, 148, 136, 0.35)'; 
                    }
                  }}
                  onMouseLeave={(e) => { 
                    if (allChecked) {
                      e.currentTarget.style.transform = 'none'; 
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(13, 148, 136, 0.25)'; 
                    }
                  }}
                >
                  <CheckCircle size={18} /> {allChecked ? 'Approve User' : 'Complete Checklist'}
                </button>
             </div>
          </div>
        </div>
      )}
      {/* Full Screen Image Overlay */}
      {fullScreenImage && (
        <div 
          className="modal-overlay" 
          onClick={() => setFullScreenImage(null)} 
          style={{ zIndex: 2000, background: 'rgba(0,0,0,0.95)', cursor: 'zoom-out' }}
        >
          <div style={{ position: 'relative', width: '90%', height: '90%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
            <img 
              src={fullScreenImage} 
              alt="Fullscreen" 
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', boxShadow: '0 0 50px rgba(0,0,0,0.5)', borderRadius: '8px' }} 
            />
            <button 
              onClick={() => setFullScreenImage(null)}
              style={{ 
                position: 'absolute', 
                top: '-40px', 
                right: '0', 
                color: 'white', 
                background: 'transparent', 
                border: 'none', 
                fontSize: '40px',
                cursor: 'pointer',
                lineHeight: '1'
              }}
            >
              &times;
            </button>
          </div>
        </div>
      )}
      {/* Rejection Confirmation Modal */}
      {rejectConfirmId && (
        <div className="modal-overlay" style={{ zIndex: 3000, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)' }}>
          <div className="card shadow-lg" style={{ maxWidth: '450px', width: '90%', padding: '2.5rem', textAlign: 'center', background: 'white', borderRadius: '24px', border: 'none' }}>
            <div style={{ width: '80px', height: '80px', background: '#fff1f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e11d48', margin: '0 auto 1.5rem' }}>
              <AlertTriangle size={40} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.75rem' }}>Reject Identity?</h2>
            <p style={{ color: '#64748b', lineHeight: '1.6', marginBottom: '2rem' }}>
              Are you sure you want to reject this verification? This will flag the user as <strong>suspicious</strong> and prevent them from listing vehicles.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="btn btn-ghost" 
                style={{ flex: 1, fontWeight: 700, borderRadius: '12px' }}
                onClick={() => setRejectConfirmId(null)}
              >
                Go Back
              </button>
              <button 
                className="btn" 
                style={{ 
                  flex: 1, 
                  background: '#e11d48', 
                  color: 'white', 
                  fontWeight: 700,
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(225, 29, 72, 0.25)',
                  border: 'none',
                  padding: '0.75rem'
                }}
                onClick={() => handleRejectOwner(rejectConfirmId)}
                disabled={!!actionLoading}
              >
                {actionLoading ? 'Processing...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

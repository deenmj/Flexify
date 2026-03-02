import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { subadminApi, type User, type Vehicle, type SubadminStats } from '../api';
import { Users, Car, Shield, CheckCircle, XCircle, Search, AlertTriangle, FileText, Clock } from 'lucide-react';
import './Dashboard.css';

export default function SubAdminDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState<SubadminStats | null>(null);
    const [pendingUsers, setPendingUsers] = useState<User[]>([]);
    const [pendingVehicles, setPendingVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'users' | 'vehicles'>('users');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [checkedItems, setCheckedItems] = useState<boolean[]>([false, false, false, false]);
    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

    useEffect(() => { fetchData(); }, []);
    useEffect(() => { setCheckedItems([false, false, false, false]); }, [selectedUser]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [s, u, v] = await Promise.all([
                subadminApi.getStats().catch(() => null),
                subadminApi.getPendingUsers().catch(() => []),
                subadminApi.getPendingVehicles().catch(() => []),
            ]);
            if (s) setStats(s);
            setPendingUsers(u);
            setPendingVehicles(v);
        } catch (err) { console.error('Error:', err); }
        finally { setLoading(false); }
    };

    const handleCheck = (idx: number) => {
        const updated = [...checkedItems];
        updated[idx] = !updated[idx];
        setCheckedItems(updated);
    };

    const allChecked = checkedItems.every(Boolean);

    const handleApproveUser = async (userId: string) => {
        if (!allChecked) return;
        setActionLoading(userId);
        try {
            await subadminApi.approveUser(userId);
            setPendingUsers(prev => prev.filter(u => (u.id || u._id) !== userId));
            setShowModal(false);
        } catch (err: any) { alert(err.message); }
        finally { setActionLoading(null); }
    };

    const handleRejectUser = async (userId: string) => {
        setActionLoading(userId);
        try {
            await subadminApi.rejectUser(userId);
            setPendingUsers(prev => prev.filter(u => (u.id || u._id) !== userId));
            setShowModal(false);
        } catch (err: any) { alert(err.message); }
        finally { setActionLoading(null); }
    };

    const handleApproveVehicle = async (vehicleId: string) => {
        setActionLoading(vehicleId);
        try {
            await subadminApi.approveVehicle(vehicleId);
            setPendingVehicles(prev => prev.filter(v => v._id !== vehicleId));
        } catch (err: any) { alert(err.message); }
        finally { setActionLoading(null); }
    };

    const handleRejectVehicle = async (vehicleId: string) => {
        setActionLoading(vehicleId);
        try {
            await subadminApi.rejectVehicle(vehicleId);
            setPendingVehicles(prev => prev.filter(v => v._id !== vehicleId));
        } catch (err: any) { alert(err.message); }
        finally { setActionLoading(null); }
    };

    const filteredUsers = pendingUsers.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!user || (user.role !== 'subadmin' && user.role !== 'superadmin')) {
        return (
            <div className="container" style={{ padding: '6rem 2rem', textAlign: 'center' }}>
                <Shield size={48} color="var(--error-color)" style={{ marginBottom: '1rem' }} />
                <h2>Sub-Admin Access Required</h2>
                <p>You do not have permission to access this page.</p>
            </div>
        );
    }

    return (
        <div className="dashboard-page bg-secondary">
            <div className="dashboard-header" style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)', padding: '5rem 0 4rem' }}>
                <div className="container">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                        <div>
                            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 16px', borderRadius: '30px', fontSize: '11px', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Verification Portal</span>
                            <h1 style={{ marginTop: '0.75rem', fontSize: '2.5rem' }}>Sub-Admin Dashboard</h1>
                            <p style={{ opacity: 0.9, fontSize: '1.1rem', marginTop: '0.5rem' }}>Manage KYC verifications and vehicle approvals.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '2.5rem' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: 800 }}>{pendingUsers.length}</div>
                                <div style={{ fontSize: '12px', opacity: 0.8, textTransform: 'uppercase' }}>KYC Pending</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: 800 }}>{pendingVehicles.length}</div>
                                <div style={{ fontSize: '12px', opacity: 0.8, textTransform: 'uppercase' }}>Vehicles Pending</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container dashboard-content" style={{ marginTop: '-2rem' }}>

                {/* Stats cards */}
                {stats && (
                    <div className="dashboard-stats" style={{ marginBottom: '2rem' }}>
                        <div className="stat-card card shadow-sm">
                            <div className="stat-icon" style={{ background: '#fff7ed', color: '#ea580c' }}><Clock size={24} /></div>
                            <div className="stat-info"><span className="stat-number">{stats.pendingUsers}</span><span className="stat-label">Pending KYC</span></div>
                        </div>
                        <div className="stat-card card shadow-sm">
                            <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}><Car size={24} /></div>
                            <div className="stat-info"><span className="stat-number">{stats.pendingVehicles}</span><span className="stat-label">Pending Vehicles</span></div>
                        </div>
                        <div className="stat-card card shadow-sm">
                            <div className="stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><CheckCircle size={24} /></div>
                            <div className="stat-info"><span className="stat-number">{stats.approvedUsers}</span><span className="stat-label">Approved Users</span></div>
                        </div>
                        <div className="stat-card card shadow-sm">
                            <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><Users size={24} /></div>
                            <div className="stat-info"><span className="stat-number">{stats.totalVehicles}</span><span className="stat-label">Active Vehicles</span></div>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="dashboard-tabs">
                    <button className={`dashboard-tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
                        <Shield size={16} /> KYC Verifications ({pendingUsers.length})
                    </button>
                    <button className={`dashboard-tab ${tab === 'vehicles' ? 'active' : ''}`} onClick={() => setTab('vehicles')}>
                        <Car size={16} /> Vehicle Approvals ({pendingVehicles.length})
                    </button>
                </div>

                {/* Search bar */}
                {tab === 'users' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
                            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', zIndex: 1 }} />
                            <input type="text" placeholder="Search by name or email..." className="input-field" style={{ paddingLeft: '40px', borderRadius: '12px', background: 'white' }} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                        <button className="btn btn-primary" onClick={fetchData}>Refresh</button>
                    </div>
                )}

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-tertiary)' }}>
                        <div className="loading-spinner" style={{ marginBottom: '1rem' }} />
                        <p>Loading...</p>
                    </div>
                ) : tab === 'users' ? (
                    <div className="card shadow-md" style={{ padding: '0', overflow: 'hidden', border: 'none' }}>
                        {filteredUsers.length === 0 ? (
                            <div className="dashboard-empty" style={{ padding: '6rem 2rem' }}>
                                <Shield size={48} strokeWidth={1} />
                                <h3>All Clear!</h3>
                                <p>{searchQuery ? `No results for "${searchQuery}".` : 'No pending KYC verifications.'}</p>
                            </div>
                        ) : (
                            <table className="dashboard-table">
                                <thead>
                                    <tr><th>User</th><th>Phone</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map(u => {
                                        const id = (u.id || u._id)!;
                                        return (
                                            <tr key={id}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(45deg, #0d9488, #5eead4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>{u.name.charAt(0)}</div>
                                                        <div className="table-vehicle"><strong>{u.name}</strong><span>{u.email}</span></div>
                                                    </div>
                                                </td>
                                                <td>{u.phone || <span style={{ color: '#ef4444', fontSize: '12px' }}>Not provided</span>}</td>
                                                <td><span className="badge badge-warning">Pending</span></td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button className="btn btn-sm" style={{ background: '#1e293b', color: 'white', borderRadius: '8px', padding: '6px 16px', fontWeight: 700, fontSize: '12px', border: 'none' }} onClick={() => { setSelectedUser(u); setShowModal(true); }}>
                                                        <Shield size={14} /> Review
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                ) : (
                    /* Vehicles Tab */
                    <div className="card shadow-md" style={{ padding: '0', overflow: 'hidden', border: 'none' }}>
                        {pendingVehicles.length === 0 ? (
                            <div className="dashboard-empty" style={{ padding: '6rem 2rem' }}>
                                <Car size={48} strokeWidth={1} />
                                <h3>No Pending Vehicles</h3>
                                <p>All vehicle listings have been reviewed.</p>
                            </div>
                        ) : (
                            <table className="dashboard-table">
                                <thead><tr><th>Vehicle</th><th>Owner</th><th>Price/day</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {pendingVehicles.map(v => {
                                        const owner = typeof v.owner === 'object' ? v.owner : null;
                                        return (
                                            <tr key={v._id}>
                                                <td><div className="table-vehicle"><strong>{v.title}</strong><span>{v.make} {v.model} ({v.year})</span></div></td>
                                                <td>{owner ? <div className="table-vehicle"><strong>{owner.name}</strong><span>{owner.email}</span></div> : 'Unknown'}</td>
                                                <td>LKR {v.pricePerDay.toLocaleString()}</td>
                                                <td className="table-actions">
                                                    <button className="btn btn-sm btn-primary" onClick={() => handleApproveVehicle(v._id)} disabled={actionLoading === v._id}>
                                                        <CheckCircle size={14} /> Approve
                                                    </button>
                                                    <button className="btn btn-sm btn-danger" onClick={() => handleRejectVehicle(v._id)} disabled={actionLoading === v._id}>
                                                        <XCircle size={14} /> Reject
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>

            {/* KYC Review Modal */}
            {showModal && selectedUser && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '1000px', width: '95%', padding: '0', borderRadius: '24px', overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ padding: '10px', background: 'var(--primary-color)', color: 'white', borderRadius: '12px' }}><Shield size={24} /></div>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', marginBottom: '0' }}>KYC Verification Review</h2>
                                    <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: 0 }}>Review documents carefully before approving.</p>
                                </div>
                            </div>
                            <button className="modal-close" onClick={() => setShowModal(false)} style={{ position: 'static', padding: '8px' }}>&times;</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 350px) 1fr', height: 'calc(75vh - 140px)', maxHeight: '700px' }}>
                            {/* Left Panel */}
                            <div style={{ padding: '2rem', borderRight: '1px solid #e2e8f0', overflowY: 'auto' }}>
                                <h3 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-tertiary)', fontWeight: 800, marginBottom: '1.5rem' }}>User Information</h3>
                                <div style={{ display: 'grid', gap: '1rem' }}>
                                    <div><label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Full Name</label><div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e293b' }}>{selectedUser.name}</div></div>
                                    <div><label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Email</label><div style={{ fontWeight: 600, color: '#475569' }}>{selectedUser.email}</div></div>
                                    <div><label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Phone</label><div style={{ fontWeight: 600, color: '#475569' }}>{selectedUser.phone || 'Not provided'}</div></div>
                                    <div><label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Address</label><div style={{ fontSize: '13px', lineHeight: '1.6', color: '#475569', background: '#f8fafc', padding: '12px', borderRadius: '12px' }}>{selectedUser.documents?.address || 'Not provided'}</div></div>
                                    <div><label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Role</label><span className="badge badge-primary">{selectedUser.role}</span></div>
                                </div>

                                {/* Checklist */}
                                <div style={{ padding: '1.25rem', background: '#fff1f2', borderRadius: '16px', border: '1px solid #ffe4e6', marginTop: '1.5rem' }}>
                                    <h4 style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: '#e11d48', marginBottom: '10px' }}>
                                        <AlertTriangle size={14} /> Critical Checklist
                                    </h4>
                                    <div style={{ display: 'grid', gap: '8px' }}>
                                        {["Cross-check ID serial numbers", "Verify selfie matches ID photo", "Check for digital editing", "Verify name matches documents"].map((item, idx) => (
                                            <div key={idx} onClick={() => handleCheck(idx)} style={{ display: 'flex', gap: '8px', fontSize: '11px', color: checkedItems[idx] ? '#065f46' : '#9f1239', fontWeight: 600, cursor: 'pointer', background: checkedItems[idx] ? '#ecfdf5' : 'transparent', padding: '4px 8px', borderRadius: '6px', transition: 'all 0.2s' }}>
                                                <div style={{ minWidth: '16px', height: '16px', border: `2px solid ${checkedItems[idx] ? '#10b981' : '#fda4af'}`, borderRadius: '4px', background: checkedItems[idx] ? '#10b981' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
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
                                <h3 style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#334155', marginBottom: '1.5rem' }}>
                                    <FileText size={18} color="var(--primary-color)" /> Submitted Documents
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                    {[
                                        { label: 'NIC Front', field: 'nicFront' },
                                        { label: 'NIC Back', field: 'nicBack' },
                                        { label: 'Driving License', field: 'license' },
                                        { label: 'Selfie / Photo', field: 'selfie' },
                                    ].map((doc, idx) => {
                                        const imgUrl = selectedUser.documents?.[doc.field as keyof typeof selectedUser.documents];
                                        return (
                                            <div key={idx} style={{ background: 'white', padding: '16px', borderRadius: '20px', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
                                                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>{doc.label}</div>
                                                <div style={{ width: '100%', height: '220px', background: '#f8fafc', borderRadius: '12px', overflow: 'hidden', cursor: imgUrl ? 'zoom-in' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #e2e8f0' }} onClick={() => imgUrl && setFullScreenImage(imgUrl)}>
                                                    {imgUrl ? (
                                                        <img src={imgUrl} alt={doc.label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                    ) : (
                                                        <div style={{ color: '#cbd5e1', textAlign: 'center' }}>
                                                            <FileText size={36} strokeWidth={1} style={{ marginBottom: '8px' }} />
                                                            <p style={{ fontSize: '12px', fontWeight: 600 }}>NOT UPLOADED</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn" onClick={() => handleRejectUser((selectedUser.id || selectedUser._id)!)} disabled={!!actionLoading} style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #ffe4e6', padding: '0.75rem 1.75rem', borderRadius: '12px', fontWeight: 700 }}>
                                <XCircle size={18} /> Reject
                            </button>
                            <button className="btn" disabled={!!actionLoading || !allChecked} onClick={() => handleApproveUser((selectedUser.id || selectedUser._id)!)} style={{ background: allChecked ? 'linear-gradient(135deg, #0d9488, #14b8a6)' : '#e2e8f0', color: allChecked ? 'white' : '#94a3b8', cursor: allChecked ? 'pointer' : 'not-allowed', padding: '0.75rem 2rem', borderRadius: '12px', fontWeight: 700, border: 'none' }}>
                                <CheckCircle size={18} /> {allChecked ? 'Approve User' : 'Complete Checklist'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Fullscreen image */}
            {fullScreenImage && (
                <div className="modal-overlay" onClick={() => setFullScreenImage(null)} style={{ zIndex: 2000, background: 'rgba(0,0,0,0.95)', cursor: 'zoom-out' }}>
                    <div style={{ position: 'relative', width: '90%', height: '90%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={fullScreenImage} alt="Fullscreen" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }} />
                        <button onClick={() => setFullScreenImage(null)} style={{ position: 'absolute', top: '-40px', right: '0', color: 'white', background: 'transparent', border: 'none', fontSize: '40px', cursor: 'pointer' }}>&times;</button>
                    </div>
                </div>
            )}
        </div>
    );
}

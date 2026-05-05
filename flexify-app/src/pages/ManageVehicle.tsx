import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Car, Star, CheckCircle, Zap, Eye, Edit, MessageSquare, 
  Calendar as CalIcon, AlertTriangle, Trash2, ArrowLeft,
  ChevronLeft, ChevronRight, EyeOff
} from 'lucide-react';
import { vehicleApi, bookingApi, reviewApi, blackoutApi, getImageUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

import { Spin, Calendar, Form, Input, Button, Row, Col, DatePicker, message, Avatar, Rate, Modal, Tag } from 'antd';
import { useIsMobile } from '../hooks/useIsMobile';
import './Dashboard.css'; // Reusing dashboard styles

dayjs.extend(isBetween);
const { RangePicker } = DatePicker;

// Define basic interfaces locally or export from somewhere
interface Vehicle {
  _id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  pricePerDay: number;
  status: string;
  isActive: boolean;
  averageRating: number;
  totalBookings: number;
  isBoosted: boolean;
  photos: any[];
}

interface Booking {
  _id: string;
  startDate: string;
  endDate: string;
  status: string;
  user: any;
}

interface Review {
  _id: string;
  rating: number;
  comment: string;
  createdAt: string;
  user?: any;
  reviewer?: any;
  vehicle: any;
  booking: any;
}

interface Blackout {
  _id: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export default function ManageVehicle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile(640);

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  
  // States copied from Dashboard
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  
  const [blackouts, setBlackouts] = useState<Blackout[]>([]);
  const [showBlackoutModal, setShowBlackoutModal] = useState(false);
  const [blackoutSaving, setBlackoutSaving] = useState(false);
  const [blackoutForm] = Form.useForm();
  const [calendarLoading, setCalendarLoading] = useState(false);

  const loadData = async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    setCalendarLoading(true);
    
    try {
      // Fetch specific vehicle
      const v = await vehicleApi.getById(id);
      setVehicle(v);

      // Fetch bookings for owner and filter
      const allBookings = await bookingApi.getMy().catch(() => []);
      const vBookings = (allBookings as any[]).filter(b => {
        const vId = typeof b.vehicle === 'object' ? b.vehicle._id : b.vehicle;
        return vId === id;
      });
      setBookings(vBookings);

      // Fetch reviews
      const allReviews = await reviewApi.getMyReviews().catch(() => []);
      setReviews(allReviews as any[]);

      // Fetch blackouts
      const bOuts = await blackoutApi.getForVehicle(id).catch(() => []);
      setBlackouts(bOuts);

    } catch (error: any) {
      message.error("Failed to load vehicle data");
      if (!silent) navigate('/dashboard');
    } finally {
      if (!silent) setLoading(false);
      setCalendarLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const onCalendarSelect = (date: Dayjs) => {
    // Optional: Auto-fill blackout form or just show modal
    setShowBlackoutModal(true);
    blackoutForm.setFieldsValue({
      startDate: date,
      endDate: date.add(1, 'day')
    });
  };

  const calendarCellRender = useCallback((date: Dayjs) => {
    // 1. Regular Bookings (Only Confirmed or Pending)
    const matchingBookings = bookings.filter((b) => {
      if (b.status !== 'CONFIRMED' && b.status !== 'PENDING') return false;
      const start = dayjs(b.startDate).startOf('day');
      const end = dayjs(b.endDate).endOf('day');
      return date.isBetween(start, end, 'day', '[]');
    });

    // 2. Blackout Dates
    const matchingBlackouts = blackouts.filter((b) => {
      const start = dayjs(b.startDate).startOf('day');
      const end = dayjs(b.endDate).endOf('day');
      return date.isBetween(start, end, 'day', '[]');
    });

    if (matchingBookings.length === 0 && matchingBlackouts.length === 0) return null;

    return (
      <div className="avail-status-container">
        {matchingBookings.map((b) => {
          if (b.status === 'CONFIRMED') {
            return (
              <div key={b._id} className="status-indicator confirmed">
                <span className="status-text">Booked</span>
              </div>
            );
          } else {
            return (
              <div key={b._id} className="status-indicator pending">
                <span className="status-text">Pending</span>
              </div>
            );
          }
        })}
        {matchingBlackouts.map((b) => (
          <div key={b._id} className="status-indicator blackout">
            <span className="status-text">Unavailable</span>
          </div>
        ))}
      </div>
    );
  }, [bookings, blackouts]);

  const handleAddBlackout = async (values: any) => {
    if (!values.startDate || !values.endDate || !id) return;

    setBlackoutSaving(true);
    try {
      const newBlackout = await blackoutApi.create(
        id,
        values.startDate.toISOString(),
        values.endDate.toISOString(),
        values.reason
      );
      setBlackouts([...blackouts, newBlackout]);
      message.success('Blackout period added successfully');
      setShowBlackoutModal(false);
      blackoutForm.resetFields();
    } catch (err: any) {
      message.error(err.message || 'Failed to add blackout period');
    } finally {
      setBlackoutSaving(false);
    }
  };

  const handleDeleteBlackout = async (bId: string) => {
    try {
      await blackoutApi.delete(bId);
      setBlackouts(prev => prev.filter(b => b._id !== bId));
      message.success('Blackout period removed');
    } catch (err: any) {
      message.error(err.message || 'Failed to remove blackout');
    }
  };

  const handleToggleStatus = async () => {
    if (!vehicle || !id) return;
    try {
      await vehicleApi.toggleStatus(id);
      setVehicle({ ...vehicle, isActive: !vehicle.isActive });
      message.success('Vehicle status updated');
    } catch (err: any) { message.error(err.message || 'Failed to update status'); }
  };

  const handleDeleteVehicle = async () => {
    if (!vehicle || !id) return;
    Modal.confirm({
      title: 'Delete Vehicle',
      content: 'Are you sure you want to delete this vehicle? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await vehicleApi.delete(id);
          message.success('Vehicle deleted');
          navigate('/dashboard?tab=vehicles');
        } catch (err: any) { message.error(err.message || 'Failed to delete vehicle'); }
      },
    });
  };

  const vehicleStatusBadge = (status: string, isActive: boolean) => {
    if (status === 'pending') return <Tag color="warning">Pending</Tag>;
    if (status === 'rejected') return <Tag color="error">Rejected</Tag>;
    if (!isActive) return <Tag color="error">Hidden</Tag>;
    return <Tag color="success">Active</Tag>;
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '6rem 2rem', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="container" style={{ padding: '6rem 2rem', textAlign: 'center' }}>
        <h2>Vehicle not found</h2>
        <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  // Filter reviews for this vehicle
  const vehicleReviews = reviews.filter(r => {
    const vId = typeof r.vehicle === 'object' ? r.vehicle._id : r.vehicle;
    const bVId = typeof r.booking === 'object' ? (r.booking.vehicle?._id || r.booking.vehicle) : null;
    return vId === id || bVId === id;
  });

  return (
    <div className="manage-vehicle-page" style={{ paddingBottom: '4rem' }}>
      <div className="container" style={{ paddingTop: isMobile ? '1rem' : '2rem', maxWidth: '1200px' }}>

        <div className="vehicle-detail-panel" style={{ background: 'white', borderRadius: isMobile ? '0' : '24px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 12px 30px rgba(0,0,0,0.08)' }}>
          <div className="vd-header">
            <div className="vd-image-container" style={{ height: isMobile ? '160px' : '380px', position: 'relative' }}>
              {vehicle.photos?.[0] ? (
                <img src={getImageUrl(vehicle.photos[0])} alt={vehicle.title} className="vd-main-image" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div className="vd-image-placeholder" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}><Car size={isMobile ? 48 : 64} color="#94a3b8" /></div>
              )}
              <div className="vd-badges" style={{ position: 'absolute', top: isMobile ? '12px' : '20px', left: isMobile ? '12px' : '20px' }}>
                {vehicleStatusBadge(vehicle.status, vehicle.isActive)}
              </div>
              <div className="vd-price-overlay" style={{ position: 'absolute', bottom: isMobile ? '12px' : '20px', right: isMobile ? '12px' : '20px', background: 'rgba(255,255,255,0.95)', padding: isMobile ? '6px 12px' : '10px 20px', borderRadius: isMobile ? '12px' : '16px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
                <span style={{ fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: 800, color: 'var(--primary-color)' }}>LKR {vehicle.pricePerDay.toLocaleString()}</span>
                <span style={{ fontSize: isMobile ? '0.7rem' : '0.8rem', color: '#64748b', fontWeight: 600, marginLeft: '4px' }}>/day</span>
              </div>
            </div>
            
            <div className="vd-title-bar" style={{ padding: isMobile ? '1rem' : '2.5rem', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(to bottom, #ffffff, #f8fafc)' }}>
              <div style={{ maxWidth: '800px' }}>
                <h2 className="vd-title" style={{ margin: 0, fontSize: isMobile ? '1.4rem' : '2.5rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{vehicle.title}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: isMobile ? '0.5rem' : '0.75rem', flexWrap: 'wrap' }}>
                  <p className="vd-subtitle" style={{ margin: 0, color: '#64748b', fontSize: isMobile ? '0.9rem' : '1.1rem', fontWeight: 500 }}>{vehicle.make} {vehicle.model} • {vehicle.year}</p>
                  <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#cbd5e1' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontWeight: 600, fontSize: isMobile ? '0.9rem' : '1rem' }}>
                    <Star size={isMobile ? 14 : 16} fill="#f59e0b" /> {vehicle.averageRating > 0 ? vehicle.averageRating.toFixed(1) : 'New'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="vd-content" style={{ padding: isMobile ? '1rem' : '2rem' }}>
            <Row gutter={[32, 32]}>
              {/* Left Column: Performance & Actions (Sticky on desktop) */}
              <Col xs={24} lg={9}>
                <div style={{ position: isMobile ? 'static' : 'sticky', top: '100px' }}>
                  {/* Stats Bar */}
                  <div className="vd-section" style={{ background: '#f8fafc', padding: isMobile ? '1rem' : '1.5rem', borderRadius: isMobile ? '16px' : '24px', border: '1px solid #e2e8f0', marginBottom: isMobile ? '1.5rem' : '2rem' }}>
                    <h3 style={{ margin: isMobile ? '0 0 1rem 0' : '0 0 1.25rem 0', fontSize: isMobile ? '1rem' : '1.1rem', fontWeight: 700, color: '#0f172a' }}>Performance</h3>
                    <div className="vd-stats-bar" style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                      <div className="vd-stat-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: isMobile ? '0.5rem' : '0.75rem', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div className="stat-icon-wrap" style={{ width: isMobile ? '28px' : '32px', height: isMobile ? '28px' : '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef3c7', color: '#d97706' }}><Star size={isMobile ? 14 : 16} /></div>
                        <div className="vd-stat-info" style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="vd-stat-value" style={{ fontSize: isMobile ? '1rem' : '1.1rem', fontWeight: 700 }}>{vehicle.averageRating > 0 ? vehicle.averageRating.toFixed(1) : 'N/A'}</span>
                          <span className="vd-stat-label" style={{ fontSize: isMobile ? '0.6rem' : '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Rating</span>
                        </div>
                      </div>
                      <div className="vd-stat-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: isMobile ? '0.5rem' : '0.75rem', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div className="stat-icon-wrap" style={{ width: isMobile ? '28px' : '32px', height: isMobile ? '28px' : '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e0e7ff', color: '#4f46e5' }}><CheckCircle size={isMobile ? 14 : 16} /></div>
                        <div className="vd-stat-info" style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="vd-stat-value" style={{ fontSize: isMobile ? '1rem' : '1.1rem', fontWeight: 700 }}>{vehicle.totalBookings || 0}</span>
                          <span className="vd-stat-label" style={{ fontSize: isMobile ? '0.6rem' : '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Bookings</span>
                        </div>
                      </div>
                      <div className="vd-stat-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: isMobile ? '0.5rem' : '0.75rem', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', gridColumn: isMobile ? '1 / -1' : 'auto' }}>
                        <div className="stat-icon-wrap" style={{ width: isMobile ? '28px' : '32px', height: isMobile ? '28px' : '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#dcfce7', color: '#16a34a' }}><Zap size={isMobile ? 14 : 16} /></div>
                        <div className="vd-stat-info" style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="vd-stat-value" style={{ fontSize: isMobile ? '1rem' : '1.1rem', fontWeight: 700 }}>{vehicle.isBoosted ? 'Yes' : 'No'}</span>
                          <span className="vd-stat-label" style={{ fontSize: isMobile ? '0.6rem' : '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Boosted</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <Link to={`/vehicles/${vehicle._id}`} className="btn" style={{ background: 'white', color: '#1e293b', border: '1px solid #cbd5e1', justifyContent: 'center', height: '48px', borderRadius: '16px', fontSize: '1rem', fontWeight: 600 }}>
                        <Eye size={18} style={{ marginRight: '8px' }} /> View Public Page
                      </Link>

                      {/* Vehicle Management Block */}
                      <div style={{ border: '1px dashed #cbd5e1', borderRadius: '20px', padding: '1.25rem', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <h4 style={{ textAlign: 'center', color: '#1e3a8a', fontSize: '1.05rem', margin: '0 0 0.5rem 0', fontWeight: 600 }}>Vehicle Management</h4>
                        
                        <Link to={`/edit-vehicle/${vehicle._id}`} className="btn" style={{ background: 'white', color: '#0f172a', border: '1px solid #cbd5e1', justifyContent: 'center', height: '44px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600 }}>
                          <Edit size={16} style={{ marginRight: '8px' }} /> Edit Details
                        </Link>
                        
                        <button className="btn" onClick={handleToggleStatus} style={{ background: 'white', color: '#0f172a', border: '1px solid #cbd5e1', justifyContent: 'center', height: '44px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600 }}>
                          {vehicle.isActive ? <EyeOff size={16} style={{ marginRight: '8px' }} /> : <Eye size={16} style={{ marginRight: '8px' }} />}
                          {vehicle.isActive ? 'Hide Listing' : 'Show Listing'}
                        </button>
                        
                        <button className="btn" onClick={handleDeleteVehicle} style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', justifyContent: 'center', height: '44px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600 }}>
                          <Trash2 size={16} style={{ marginRight: '8px' }} /> Delete Vehicle
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Active Blackouts List (in left column on desktop) */}
                  {!isMobile && blackouts.length > 0 && (
                    <div className="vd-blackouts-list" style={{ padding: '0 0.5rem' }}>
                      <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>Active Blackouts</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {blackouts.map(b => (
                          <div key={b._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#fff1f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
                            <div>
                              <div style={{ fontWeight: 700, color: '#991b1b', fontSize: '0.85rem' }}>
                                {dayjs(b.startDate).format('MMM D')} - {dayjs(b.endDate).format('MMM D')}
                              </div>
                            </div>
                            <Button 
                              danger 
                              type="text" 
                              size="small"
                              icon={<Trash2 size={16} />} 
                              onClick={() => handleDeleteBlackout(b._id)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Col>

              {/* Right Column: Calendar */}
              <Col xs={24} lg={15}>
                <div className="vd-section">
                  <div className="vd-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '0 0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}><CalIcon size={22} /> Availability</h3>
                    <Button type="primary" icon={<AlertTriangle size={16} />} onClick={() => setShowBlackoutModal(true)} style={{ height: '38px', borderRadius: '10px', fontWeight: 600 }}>
                      Add Blackout
                    </Button>
                  </div>
                  
                  <div className="vd-calendar-container" style={{ padding: '0.5rem', background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <Spin spinning={calendarLoading}>
                      <Calendar 
                        className="vd-custom-calendar" 
                        fullscreen={!isMobile} 
                        cellRender={calendarCellRender}
                        onSelect={onCalendarSelect}
                        headerRender={({ value, type, onChange, onTypeChange }) => {
                          return (
                            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                                  {value.format('MMMM YYYY')}
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <Button 
                                  size="middle" 
                                  icon={<ChevronLeft size={20} />} 
                                  onClick={() => {
                                    const now = value.clone().subtract(1, 'month');
                                    onChange(now);
                                  }}
                                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}
                                />
                                <Button 
                                  size="middle"
                                  onClick={() => {
                                    onChange(dayjs());
                                  }}
                                  style={{ fontWeight: 700, borderRadius: '10px' }}
                                >
                                  Today
                                </Button>
                                <Button 
                                  size="middle" 
                                  icon={<ChevronRight size={20} />} 
                                  onClick={() => {
                                    const now = value.clone().add(1, 'month');
                                    onChange(now);
                                  }}
                                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}
                                />
                              </div>
                            </div>
                          );
                        }}
                      />
                      
                      <div className="avail-legend-horizontal" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: '1.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#fee2e2', border: '1px solid #fca5a5' }}></span>
                          Booked
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#fef3c7', border: '1px solid #fcd34d' }}></span>
                          Pending
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                          <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f0fdf4', border: '1px solid #86efac' }}></span>
                          Available
                        </span>
                      </div>
                    </Spin>
                  </div>

                  {/* Blackouts for mobile view only (moved above for desktop) */}
                  {isMobile && blackouts.length > 0 && (
                    <div className="vd-blackouts-list" style={{ marginTop: '2.5rem' }}>
                      <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>Active Blackouts</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                        {blackouts.map(b => (
                          <div key={b._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#fff1f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
                            <div>
                              <div style={{ fontWeight: 700, color: '#991b1b', fontSize: '1rem' }}>
                                {dayjs(b.startDate).format('MMM D, YYYY')} - {dayjs(b.endDate).format('MMM D, YYYY')}
                              </div>
                              <div style={{ color: '#b91c1c', fontSize: '0.9rem', marginTop: '6px', fontWeight: 500 }}>{b.reason || 'No reason provided'}</div>
                            </div>
                            <Button 
                              danger 
                              type="text" 
                              icon={<Trash2 size={20} />} 
                              onClick={() => handleDeleteBlackout(b._id)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Col>

              {/* Reviews - Back to Full Width at bottom */}
              <Col span={24}>
                <div className="vd-section" style={{ borderTop: '2px solid #f1f5f9', paddingTop: isMobile ? '1.5rem' : '3rem', marginTop: '1rem', paddingBottom: isMobile ? '2rem' : '6rem' }}>
                  <div className="vd-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '1rem' : '2rem', padding: '0 1rem' }}>
                    <h3 style={{ margin: 0, fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '12px' }}><MessageSquare size={isMobile ? 20 : 24} /> Reviews</h3>
                    <span className="vd-review-count" style={{ fontSize: isMobile ? '0.8rem' : '0.9rem', color: '#64748b', fontWeight: 600, background: '#f1f5f9', padding: '6px 16px', borderRadius: '20px' }}>
                      {vehicleReviews.length} Reviews
                    </span>
                  </div>
                  
                  <div className="vd-reviews-list" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: isMobile ? '1rem' : '1.5rem', padding: isMobile ? '0 0.5rem' : '0 1rem' }}>
                    {vehicleReviews.length === 0 ? (
                      <div className="vd-empty-state" style={{ gridColumn: '1 / -1', padding: isMobile ? '2rem 1rem' : '4rem 1rem', textAlign: 'center', background: '#f8fafc', borderRadius: '24px', border: '2px dashed #e2e8f0' }}>
                        <MessageSquare size={isMobile ? 32 : 48} color="#94a3b8" style={{ margin: '0 auto 1.5rem' }} />
                        <p style={{ color: '#64748b', fontSize: isMobile ? '0.95rem' : '1.1rem', fontWeight: 500 }}>No reviews yet for this vehicle.</p>
                      </div>
                    ) : (
                      vehicleReviews.map(r => {
                        // Support populated nested user or reviewer
                        const reviewer = r.reviewer || r.user || {};
                        return (
                          <div key={r._id} className="vd-review-item" style={{ padding: isMobile ? '1rem' : '1.75rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: isMobile ? '16px' : '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', transition: 'transform 0.2s ease' }}>
                            <div className="vd-review-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isMobile ? '0.75rem' : '1.25rem' }}>
                              <div className="vd-reviewer" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <Avatar size={isMobile ? 40 : 44} src={getImageUrl(reviewer.profilePic)} style={{ backgroundColor: 'var(--primary-color)', boxShadow: '0 0 0 2px white, 0 0 0 4px #e2e8f0' }}>
                                  {reviewer.name?.charAt(0) || 'U'}
                                </Avatar>
                                <div>
                                  <div className="vd-reviewer-name" style={{ fontWeight: 700, color: '#1e293b', fontSize: isMobile ? '1rem' : '1.05rem' }}>{reviewer.name || 'User'}</div>
                                  <div className="vd-review-date" style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>{dayjs(r.createdAt).format('MMM D, YYYY')}</div>
                                </div>
                              </div>
                            </div>
                            <div className="vd-review-stars" style={{ marginBottom: isMobile ? '0.5rem' : '0.75rem' }}>
                              <Rate disabled defaultValue={r.rating} style={{ fontSize: isMobile ? '12px' : '14px', color: '#f59e0b' }} />
                            </div>
                            <p className="vd-review-text" style={{ margin: 0, color: '#475569', lineHeight: 1.5, fontSize: isMobile ? '0.85rem' : '1rem' }}>{r.comment}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </Col>
            </Row>
          </div>
        </div>
      </div>

      {/* ADD BLACKOUT MODAL */}
      <Modal
        title={
          <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>Add Blackout Period</div>
        }
        open={showBlackoutModal}
        onCancel={() => {
          setShowBlackoutModal(false);
          blackoutForm.resetFields();
        }}
        footer={null}
        destroyOnClose
        centered
        className="premium-modal"
      >
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
          Mark dates as unavailable. Bookings cannot be made during these periods.
        </p>
        <Form form={blackoutForm} layout="vertical" onFinish={handleAddBlackout}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
            <Form.Item name="startDate" label={<span style={{ fontWeight: 500 }}>Start Date</span>} rules={[{ required: true, message: 'Required' }]}>
              <DatePicker 
                style={{ width: '100%', height: '44px', borderRadius: '8px' }} 
                disabledDate={(current) => current && current < dayjs().startOf('day')}
                format="MMM DD, YYYY"
                placeholder="Select start date"
                inputReadOnly
                placement="bottomLeft"
              />
            </Form.Item>
            <Form.Item name="endDate" label={<span style={{ fontWeight: 500 }}>End Date</span>} rules={[{ required: true, message: 'Required' }]}>
              <DatePicker 
                style={{ width: '100%', height: '44px', borderRadius: '8px' }} 
                disabledDate={(current) => {
                  const startDate = blackoutForm.getFieldValue('startDate');
                  return current && (current < dayjs().startOf('day') || (startDate && current < startDate));
                }}
                format="MMM DD, YYYY"
                placeholder="Select end date"
                inputReadOnly
                placement="bottomLeft"
              />
            </Form.Item>
          </div>
          <Form.Item name="reason" label={<span style={{ fontWeight: 500 }}>Reason (Optional)</span>}>
            <Input.TextArea rows={4} placeholder="e.g. Vehicle maintenance, Personal use" style={{ borderRadius: '8px', padding: '12px' }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={blackoutSaving} block danger style={{ height: '48px', borderRadius: '8px', fontWeight: 600, fontSize: '1rem', marginTop: '0.5rem' }}>
            Confirm Blackout
          </Button>
        </Form>
      </Modal>
    </div>
  );
}

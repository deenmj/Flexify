import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Car, Star, CheckCircle, Zap, Eye, Edit, MessageSquare, 
  Calendar as CalIcon, AlertTriangle, Trash2, ArrowLeft
} from 'lucide-react';
import { vehicleApi, bookingApi, reviewApi, blackoutApi, getImageUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

import { Spin, Calendar, Form, Input, Button, Row, Col, DatePicker, message, Avatar, Rate, Modal, Tag } from 'antd';
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
      dates: [date, date.add(1, 'day')]
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
    if (!values.dates || !values.dates[0] || !values.dates[1] || !id) return;

    setBlackoutSaving(true);
    try {
      const newBlackout = await blackoutApi.create(
        id,
        values.dates[0].toISOString(),
        values.dates[1].toISOString(),
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
      <div className="container" style={{ paddingTop: '2rem' }}>
        <button onClick={() => navigate('/dashboard')} className="btn btn-secondary btn-sm" style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center' }}>
          <ArrowLeft size={16} style={{ marginRight: '8px' }} /> Back to Dashboard
        </button>

        <div className="vehicle-detail-panel" style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <div className="vd-header">
            <div className="vd-image-container" style={{ height: '240px' }}>
              {vehicle.photos?.[0] ? (
                <img src={getImageUrl(vehicle.photos[0])} alt={vehicle.title} className="vd-main-image" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div className="vd-image-placeholder" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}><Car size={64} color="#94a3b8" /></div>
              )}
              <div className="vd-badges" style={{ position: 'absolute', top: '16px', right: '16px' }}>
                {vehicleStatusBadge(vehicle.status, vehicle.isActive)}
              </div>
            </div>
            
            <div className="vd-title-bar" style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 className="vd-title" style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>{vehicle.title}</h2>
                <p className="vd-subtitle" style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '1rem' }}>{vehicle.make} {vehicle.model} • {vehicle.year}</p>
              </div>
              <div className="vd-price">
                <span className="vd-price-amount" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)' }}>LKR {vehicle.pricePerDay.toLocaleString()}</span>
                <span className="vd-price-unit" style={{ color: '#64748b', marginLeft: '4px' }}>/day</span>
              </div>
            </div>
          </div>

          <div className="vd-content" style={{ padding: '1.5rem' }}>
            {/* 1. THE CENTERPIECE: FULL AVAILABILITY CALENDAR */}
            <div className="vd-section" style={{ marginBottom: '3rem' }}>
              <div className="vd-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px', color: '#0f172a' }}>
                  <CalIcon size={28} style={{ color: 'var(--primary-color)' }} /> Availability & Blackouts
                </h3>
                <Button 
                  type="primary" 
                  size="large"
                  icon={<AlertTriangle size={18} />} 
                  onClick={() => setShowBlackoutModal(true)}
                  style={{ height: '48px', borderRadius: '12px', fontWeight: 700, boxShadow: '0 4px 12px rgba(var(--primary-rgb), 0.2)' }}
                >
                  Add Blackout Period
                </Button>
              </div>
              
              <div className="vd-calendar-container" style={{ background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <Spin spinning={calendarLoading} size="large" tip="Updating availability...">
                  <div style={{ padding: '2rem' }}>
                    <Calendar 
                      className="vd-custom-calendar" 
                      fullscreen={true} 
                      cellRender={calendarCellRender}
                      onSelect={onCalendarSelect}
                      style={{ minHeight: '700px' }}
                    />
                    
                    <div className="avail-legend-horizontal" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: '2.5rem', marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.1rem', fontWeight: 600 }}>
                        <span style={{ width: '20px', height: '20px', borderRadius: '6px', background: '#fee2e2', border: '1.5px solid #fca5a5' }}></span>
                        <span style={{ color: '#475569' }}>Booked / Blackout</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.1rem', fontWeight: 600 }}>
                        <span style={{ width: '20px', height: '20px', borderRadius: '6px', background: '#fef3c7', border: '1.5px solid #fcd34d' }}></span>
                        <span style={{ color: '#475569' }}>Pending Request</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.1rem', fontWeight: 600 }}>
                        <span style={{ width: '20px', height: '20px', borderRadius: '6px', background: '#f0fdf4', border: '1.5px solid #86efac' }}></span>
                        <span style={{ color: '#475569' }}>Available Date</span>
                      </div>
                    </div>
                  </div>
                </Spin>
              </div>

              {blackouts.length > 0 && (
                <div className="vd-blackouts-list" style={{ marginTop: '2.5rem' }}>
                  <h4 style={{ margin: '0 0 1.25rem 0', fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Active Blackout Dates
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                    {blackouts.map(b => (
                      <div key={b._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', background: '#fff1f2', borderRadius: '16px', border: '1px solid #fecaca', boxShadow: '0 2px 4px rgba(225, 29, 72, 0.05)' }}>
                        <div>
                          <div style={{ fontWeight: 800, color: '#991b1b', fontSize: '1.1rem' }}>
                            {dayjs(b.startDate).format('MMM D, YYYY')} - {dayjs(b.endDate).format('MMM D, YYYY')}
                          </div>
                          <div style={{ color: '#b91c1c', fontSize: '0.95rem', marginTop: '6px', fontWeight: 500 }}>{b.reason || 'No reason provided'}</div>
                        </div>
                        <Button 
                          danger 
                          type="primary"
                          ghost
                          shape="circle"
                          icon={<Trash2 size={20} />} 
                          onClick={() => handleDeleteBlackout(b._id)}
                          style={{ border: 'none' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. STATS & QUICK ACTIONS */}
            <Row gutter={[24, 24]} style={{ marginBottom: '3rem' }}>
              <Col xs={24} lg={16}>
                <div className="vd-stats-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
                  <div className="vd-stat-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '1.5rem', background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                    <div className="stat-icon-wrap" style={{ width: '50px', height: '50px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef3c7', color: '#d97706', marginBottom: '0.75rem' }}><Star size={24} /></div>
                    <span className="vd-stat-value" style={{ fontSize: '1.5rem', fontWeight: 800 }}>{vehicle.averageRating > 0 ? vehicle.averageRating.toFixed(1) : 'N/A'}</span>
                    <span className="vd-stat-label" style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>AVERAGE RATING</span>
                  </div>
                  <div className="vd-stat-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '1.5rem', background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                    <div className="stat-icon-wrap" style={{ width: '50px', height: '50px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e0e7ff', color: '#4f46e5', marginBottom: '0.75rem' }}><CheckCircle size={24} /></div>
                    <span className="vd-stat-value" style={{ fontSize: '1.5rem', fontWeight: 800 }}>{vehicle.totalBookings || 0}</span>
                    <span className="vd-stat-label" style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>TOTAL BOOKINGS</span>
                  </div>
                  <div className="vd-stat-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '1.5rem', background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                    <div className="stat-icon-wrap" style={{ width: '50px', height: '50px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#dcfce7', color: '#16a34a', marginBottom: '0.75rem' }}><Zap size={24} /></div>
                    <span className="vd-stat-value" style={{ fontSize: '1.5rem', fontWeight: 800 }}>{vehicle.isBoosted ? 'Yes' : 'No'}</span>
                    <span className="vd-stat-label" style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>BOOSTED STATUS</span>
                  </div>
                </div>
              </Col>
              <Col xs={24} lg={8}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
                  <Link to={`/vehicles/${vehicle._id}`} className="btn" style={{ flex: 1, background: '#f1f5f9', color: '#334155', border: '1.2px solid #cbd5e1', justifyContent: 'center', fontSize: '1rem', fontWeight: 700 }}>
                    <Eye size={20} style={{ marginRight: '10px' }} /> View Public Page
                  </Link>
                  <Link to={`/vehicles/edit/${vehicle._id}`} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: '1rem', fontWeight: 700 }}>
                    <Edit size={20} style={{ marginRight: '10px' }} /> Edit Vehicle Details
                  </Link>
                </div>
              </Col>
            </Row>

            {/* 3. REVIEWS SECTION */}
            <div className="vd-section" style={{ borderTop: '2px solid #f1f5f9', paddingTop: '3rem' }}>
              <div className="vd-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}><MessageSquare size={28} /> Reviews & Ratings</h3>
                <span className="vd-review-count" style={{ fontSize: '1.1rem', color: '#475569', fontWeight: 700, background: '#f1f5f9', padding: '6px 16px', borderRadius: '24px' }}>
                  {vehicleReviews.length} Reviews Total
                </span>
              </div>
              
              <div className="vd-reviews-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
                {vehicleReviews.length === 0 ? (
                  <div className="vd-empty-state" style={{ gridColumn: '1 / -1', padding: '5rem 1rem', textAlign: 'center', background: '#f8fafc', borderRadius: '30px', border: '2px dashed #cbd5e1' }}>
                    <MessageSquare size={56} color="#94a3b8" style={{ margin: '0 auto 1.5rem' }} />
                    <p style={{ color: '#64748b', fontSize: '1.25rem', fontWeight: 600 }}>No reviews received yet.</p>
                  </div>
                ) : (
                  vehicleReviews.map(r => {
                    const reviewer = r.reviewer || r.user || {};
                    return (
                      <div key={r._id} className="vd-review-item" style={{ padding: '2rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                        <div className="vd-review-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                          <div className="vd-reviewer" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <Avatar size={52} src={getImageUrl(reviewer.profilePic)} style={{ backgroundColor: 'var(--primary-color)', boxShadow: '0 0 0 4px #f1f5f9' }}>
                              {reviewer.name?.charAt(0) || 'U'}
                            </Avatar>
                            <div>
                              <div className="vd-reviewer-name" style={{ fontWeight: 700, color: '#0f172a', fontSize: '1.1rem' }}>{reviewer.name || 'Anonymous User'}</div>
                              <div className="vd-review-date" style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 500 }}>{dayjs(r.createdAt).format('MMMM D, YYYY')}</div>
                            </div>
                          </div>
                        </div>
                        <div className="vd-review-stars" style={{ marginBottom: '1rem' }}>
                          <Rate disabled defaultValue={r.rating} style={{ fontSize: '18px', color: '#f59e0b' }} />
                        </div>
                        <p className="vd-review-text" style={{ margin: 0, color: '#334155', lineHeight: 1.8, fontSize: '1.05rem' }}>{r.comment}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
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
          <Form.Item name="dates" label={<span style={{ fontWeight: 500 }}>Select Date Range</span>} rules={[{ required: true, message: 'Please select dates' }]}>
            <RangePicker style={{ width: '100%', height: '44px', borderRadius: '8px' }} disabledDate={(current) => current && current < dayjs().startOf('day')} />
          </Form.Item>
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

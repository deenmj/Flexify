import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Car, Star, Eye, Edit, MessageSquare, 
  Trash2, EyeOff, Phone
} from 'lucide-react';
import { vehicleApi, getImageUrl, getVehicleSlug } from '../api';
import { useAuth } from '../context/AuthContext';

import { Spin, Button, Row, Col, message, Avatar, Rate, Modal, Tag } from 'antd';
import { useIsMobile } from '../hooks/useIsMobile';
import './Dashboard.css'; // Reusing dashboard styles
import dayjs from 'dayjs';

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
  callClicks?: number;
  whatsappClicks?: number;
}

export default function ManageVehicle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile(640);

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const v = await vehicleApi.getById(id);
      setVehicle(v);
    } catch (error: any) {
      message.error("Failed to load vehicle data");
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

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

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '5rem 0' }}>
      <Spin size="large" />
    </div>
  );

  if (!vehicle) {
    return (
      <div className="container" style={{ padding: '6rem 2rem', textAlign: 'center' }}>
        <h2>Vehicle not found</h2>
        <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="manage-vehicle-page" style={{ paddingBottom: '4rem' }}>
      <div className="container" style={{ paddingTop: isMobile ? '1rem' : '2rem', maxWidth: '900px' }}>

        <div className="vehicle-detail-panel" style={{ background: 'white', borderRadius: isMobile ? '0' : '24px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 12px 30px rgba(0,0,0,0.08)' }}>
          {/* Hero image */}
          <div style={{ height: isMobile ? '180px' : '340px', position: 'relative' }}>
            {vehicle.photos?.[0] ? (
              <img src={getImageUrl(vehicle.photos[0])} alt={vehicle.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
                <Car size={isMobile ? 48 : 64} color="#94a3b8" />
              </div>
            )}
            {/* Status badge */}
            <div style={{ position: 'absolute', top: isMobile ? '12px' : '20px', left: isMobile ? '12px' : '20px' }}>
              {vehicleStatusBadge(vehicle.status, vehicle.isActive)}
            </div>
            {/* Price overlay */}
            <div style={{ position: 'absolute', bottom: isMobile ? '12px' : '20px', right: isMobile ? '12px' : '20px', background: 'rgba(255,255,255,0.95)', padding: isMobile ? '6px 12px' : '10px 20px', borderRadius: isMobile ? '12px' : '16px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
              <span style={{ fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: 800, color: 'var(--primary-color)' }}>LKR {vehicle.pricePerDay.toLocaleString()}</span>
              <span style={{ fontSize: isMobile ? '0.7rem' : '0.8rem', color: '#64748b', fontWeight: 600, marginLeft: '4px' }}>/day</span>
            </div>
          </div>

          {/* Title bar */}
          <div style={{ padding: isMobile ? '1rem' : '2rem', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(to bottom, #ffffff, #f8fafc)' }}>
            <h2 style={{ margin: 0, fontSize: isMobile ? '1.4rem' : '2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{vehicle.title}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: isMobile ? '0.5rem' : '0.75rem', flexWrap: 'wrap' }}>
              <p style={{ margin: 0, color: '#64748b', fontSize: isMobile ? '0.9rem' : '1.05rem', fontWeight: 500 }}>{vehicle.make} {vehicle.model} • {vehicle.year}</p>
              {vehicle.averageRating > 0 && (
                <>
                  <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#cbd5e1' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontWeight: 600, fontSize: isMobile ? '0.9rem' : '1rem' }}>
                    <Star size={isMobile ? 14 : 16} fill="#f59e0b" /> {vehicle.averageRating.toFixed(1)}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: isMobile ? '1rem' : '2rem' }}>
            <Row gutter={[24, 24]}>
              {/* Stats */}
              <Col span={24}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.875rem 1rem', background: '#f0fdf4', borderRadius: '14px', border: '1px solid #bbf7d0' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#dcfce7', color: '#16a34a' }}>
                      <Phone size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#14532d' }}>{vehicle.callClicks || 0}</div>
                      <div style={{ fontSize: '0.7rem', color: '#16a34a', textTransform: 'uppercase', fontWeight: 700 }}>Call Clicks</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.875rem 1rem', background: '#f0fdf4', borderRadius: '14px', border: '1px solid #bbf7d0' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#dcfce7', color: '#16a34a' }}>
                      <MessageSquare size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#14532d' }}>{vehicle.whatsappClicks || 0}</div>
                      <div style={{ fontSize: '0.7rem', color: '#16a34a', textTransform: 'uppercase', fontWeight: 700 }}>WhatsApp Clicks</div>
                    </div>
                  </div>
                  {vehicle.averageRating > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.875rem 1rem', background: '#fffbeb', borderRadius: '14px', border: '1px solid #fde68a' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef3c7', color: '#d97706' }}>
                        <Star size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#78350f' }}>{vehicle.averageRating.toFixed(1)}</div>
                        <div style={{ fontSize: '0.7rem', color: '#d97706', textTransform: 'uppercase', fontWeight: 700 }}>Rating</div>
                      </div>
                    </div>
                  )}
                </div>
              </Col>

              {/* Management Actions */}
              <Col span={24}>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '20px', padding: isMobile ? '1rem' : '1.5rem', background: '#f8fafc' }}>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b', textAlign: 'center' }}>Vehicle Management</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <Link to={`/vehicles/${getVehicleSlug(vehicle)}`} className="btn" style={{ background: 'white', color: '#1e293b', border: '1px solid #cbd5e1', justifyContent: 'center', height: '48px', borderRadius: '14px', fontSize: '0.95rem', fontWeight: 600 }}>
                      <Eye size={18} style={{ marginRight: '8px' }} /> View Public Page
                    </Link>
                    <Link to={`/vehicles/edit/${vehicle._id}`} className="btn" style={{ background: 'white', color: '#0f172a', border: '1px solid #cbd5e1', justifyContent: 'center', height: '48px', borderRadius: '14px', fontSize: '0.95rem', fontWeight: 600 }}>
                      <Edit size={18} style={{ marginRight: '8px' }} /> Edit Details
                    </Link>
                    <button className="btn" onClick={handleToggleStatus} style={{ background: 'white', color: '#0f172a', border: '1px solid #cbd5e1', justifyContent: 'center', height: '48px', borderRadius: '14px', fontSize: '0.95rem', fontWeight: 600 }}>
                      {vehicle.isActive ? <EyeOff size={18} style={{ marginRight: '8px' }} /> : <Eye size={18} style={{ marginRight: '8px' }} />}
                      {vehicle.isActive ? 'Hide Listing' : 'Show Listing'}
                    </button>
                    <button className="btn" onClick={handleDeleteVehicle} style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', justifyContent: 'center', height: '48px', borderRadius: '14px', fontSize: '0.95rem', fontWeight: 600 }}>
                      <Trash2 size={18} style={{ marginRight: '8px' }} /> Delete Vehicle
                    </button>
                  </div>
                </div>
              </Col>
            </Row>
          </div>
        </div>
      </div>
    </div>
  );
}

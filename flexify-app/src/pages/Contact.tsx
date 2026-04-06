import { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Send, ArrowLeft, Clock, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Modal, message, Spin } from 'antd';
import { useAuth } from '../context/AuthContext';
import { settingsApi } from '../api';
import './StaticPages.css';

export default function Contact() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  
  // Dynamic Settings
  const [contactDetails, setContactDetails] = useState({
    email: 'support@flexify.com',
    phone: '+1 (555) 123-4567',
    address: 'Colombo, Sri Lanka',
    workingHours: 'Mon-Sat: 9:00 AM - 6:00 PM'
  });
  const [loading, setLoading] = useState(true);
  
  // Admin Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ ...contactDetails });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchContactDetails();
  }, []);

  const fetchContactDetails = async () => {
    try {
      const data = await settingsApi.getContactDetails();
      if (data) {
        setContactDetails(data);
        setEditForm(data);
      }
    } catch (err) {
      console.error("Failed to fetch contact details", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    message.success('Message sent! We will get back to you soon.');
    setForm({ name: '', email: '', message: '' });
  };

  const handleAdminSave = async () => {
    try {
      setSaving(true);
      const updated = await settingsApi.updateContactDetails(editForm);
      setContactDetails(updated);
      setIsEditModalOpen(false);
      message.success("Contact details updated successfully");
    } catch (err: any) {
      message.error(err.message || 'Failed to update contact details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="static-page">
      <section className="static-hero section-padding">
        <div className="container" style={{ textAlign: 'left' }}>
          <Link to="/" className="premium-back-btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
            <ArrowLeft size={18} />
            <span>Back to Home</span>
          </Link>
          <h1 style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            Contact & Support
          </h1>
          <p>We're here to help you with anything you need</p>
        </div>
      </section>
      <section className="static-content container section-padding">
        <div className="contact-grid">
          <div className="contact-info">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ marginBottom: 0 }}>Get in Touch</h2>
              {user?.role === 'superadmin' && (
                <button 
                  onClick={() => setIsEditModalOpen(true)} 
                  className="btn btn-sm"
                  style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Edit size={14} /> Edit Details
                </button>
              )}
            </div>
            <p>We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
            
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}><Spin /></div>
            ) : (
              <div className="contact-details" style={{ marginTop: '2rem' }}>
                <div className="contact-detail-item">
                  <Mail size={20} className="contact-detail-icon" />
                  <div>
                    <h4>Email</h4>
                    <p>{contactDetails.email}</p>
                  </div>
                </div>
                <div className="contact-detail-item">
                  <Phone size={20} className="contact-detail-icon" />
                  <div>
                    <h4>Phone</h4>
                    <p>{contactDetails.phone}</p>
                  </div>
                </div>
                <div className="contact-detail-item">
                  <MapPin size={20} className="contact-detail-icon" />
                  <div>
                    <h4>Location</h4>
                    <p>{contactDetails.address}</p>
                  </div>
                </div>
                <div className="contact-detail-item">
                  <Clock size={20} className="contact-detail-icon" />
                  <div>
                    <h4>Working Hours</h4>
                    <p>{contactDetails.workingHours}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <form className="contact-form card" onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Your Name</label>
              <input type="text" className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="input-group">
              <label>Your Email</label>
              <input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="input-group">
              <label>Message</label>
              <textarea className="input-field" rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
            </div>
            <button type="submit" className="btn btn-primary btn-full" style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
              <Send size={16} /> Send Message
            </button>
          </form>
        </div>
      </section>

      {/* Super Admin Edit Modal */}
      <Modal
        title="Edit Contact Details"
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        onOk={handleAdminSave}
        confirmLoading={saving}
        okText="Save Changes"
        centered
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <div className="input-group">
            <label>Support Email</label>
            <input 
              type="email" 
              className="input-field" 
              value={editForm.email} 
              onChange={(e) => setEditForm({...editForm, email: e.target.value})} 
            />
          </div>
          <div className="input-group">
            <label>Support Phone</label>
            <input 
              type="text" 
              className="input-field" 
              value={editForm.phone} 
              onChange={(e) => setEditForm({...editForm, phone: e.target.value})} 
            />
          </div>
          <div className="input-group">
            <label>Headquarters Address</label>
            <input 
              type="text" 
              className="input-field" 
              value={editForm.address} 
              onChange={(e) => setEditForm({...editForm, address: e.target.value})} 
            />
          </div>
          <div className="input-group">
            <label>Working Hours</label>
            <input 
              type="text" 
              className="input-field" 
              value={editForm.workingHours} 
              onChange={(e) => setEditForm({...editForm, workingHours: e.target.value})} 
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

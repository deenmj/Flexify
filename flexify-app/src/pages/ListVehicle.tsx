import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { vehicleApi, type VehicleMake, type VehicleModel } from '../api';
import { Select as AntSelect, message, Row, Col } from 'antd';
import { Car, MapPin, Settings, Image, Locate, Shield } from 'lucide-react';
import './ListVehicle.css';

const { Option } = AntSelect;

const SRI_LANKA_LOCATIONS: Record<string, string[]> = {
  'Western': ['Colombo', 'Gampaha', 'Kalutara'],
  'Central': ['Kandy', 'Matale', 'Nuwara Eliya'],
  'Southern': ['Galle', 'Matara', 'Hambantota'],
  'Northern': ['Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu'],
  'Eastern': ['Trincomalee', 'Batticaloa', 'Ampara'],
  'North Western': ['Kurunegala', 'Puttalam'],
  'North Central': ['Anuradhapura', 'Polonnaruwa'],
  'Uva': ['Badulla', 'Moneragala'],
  'Sabaragamuwa': ['Ratnapura', 'Kegalle']
};

const VEHICLE_FEATURES = [
  { id: 'ac', label: 'A/C', icon: '❄️' },
  { id: 'bluetooth', label: 'Bluetooth', icon: '📶' },
  { id: 'gps', label: 'GPS', icon: '📍' },
  { id: 'sparewheel', label: 'Spare Wheel', icon: '🛞' },
  { id: 'sunroof', label: 'Sunroof', icon: '☀️' }
];

export default function ListVehicle() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '', make: '', model: '', year: '', pricePerDay: '',
    transmission: 'Automatic', fuelType: 'Petrol', seats: '4',
    serviceType: '', description: '', address: '', lat: '', lng: '',
    engineCapacity: '', fuelConsumption: '', features: [] as string[],
    province: '', district: '', city: '',
    pricePerWeek: '', pricePerMonth: ''
  });

  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [makes, setMakes] = useState<VehicleMake[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [loadingMakes, setLoadingMakes] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    const fetchMakes = async () => {
      setLoadingMakes(true);
      try {
        const data = await vehicleApi.getMakes();
        setMakes(data);
      } catch (err) { console.error("API error", err); }
      finally { setLoadingMakes(false); }
    };
    fetchMakes();
  }, []);

  useEffect(() => {
    const fetchModels = async () => {
      if (!selectedMake) { setModels([]); return; }
      const makeObj = makes.find((m: VehicleMake) => m.name === selectedMake);
      if (!makeObj) return;
      setLoadingModels(true);
      try {
        const data = await vehicleApi.getModels(makeObj._id);
        setModels(data);
      } catch (err) { console.error("API error", err); }
      finally { setLoadingModels(false); }
    };
    fetchModels();
  }, [selectedMake, makes]);

  useEffect(() => {
    setForm(prev => ({ ...prev, make: selectedMake, model: selectedModel }));
  }, [selectedMake, selectedModel]);

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      message.loading({ content: 'Syncing...', key: 'locate' });
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
          const data = await res.json();
          if (data && data.address) {
            const addr = data.address;
            const city = addr.city || addr.town || addr.village || '';
            const district = (addr.state_district || addr.county || '').replace(' District', '').trim();
            const state = addr.state || '';
            let mp = ''; let md = '';
            Object.entries(SRI_LANKA_LOCATIONS).forEach(([prov, dists]) => {
              if (state.includes(prov) || dists.some(d => district.includes(d))) {
                mp = prov; if (dists.some(d => district.includes(d))) md = dists.find(d => district.includes(d)) || '';
              }
            });
            setForm(prev => ({ ...prev, province: mp || prev.province, district: md || prev.district, city: city || prev.city }));
            message.success({ content: `Location Updated: ${city}`, key: 'locate' });
          }
        } catch (err) { message.success({ content: 'Location Found', key: 'locate' }); }
      }, () => message.error({ content: 'Denied access', key: 'locate' }));
    }
  };

  const handleFeatureToggle = (fid: string) => {
    setForm(prev => ({ ...prev, features: prev.features.includes(fid) ? prev.features.filter(id => id !== fid) : [...prev.features, fid] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      formData.append('features', JSON.stringify(form.features));
      photos.forEach(p => formData.append('photos', p));
      await vehicleApi.createWithPhotos(formData);
      await refreshUser();
      setSuccess('Publishing Successfully!');
      window.scrollTo(0, 0);
    } catch (err: any) { setError(err.message || 'Error occurred'); }
    finally { setLoading(false); }
  };

  if (!user) return <div className="container" style={{ padding: '80px 1rem', textAlign: 'center' }}>Please log in to continue.</div>;

  return (
    <div className="list-vehicle-page">
      <section className="static-hero">
        <div className="container">
          <h1>List Your Vehicle</h1>
          <p>The premium way to share your drive</p>
        </div>
      </section>

      <section className="list-vehicle-wrapper">
        <form onSubmit={handleSubmit}>
          {error && <div className="auth-message error" style={{ marginBottom: '2rem' }}>{error}</div>}
          {success && <div className="auth-message success" style={{ marginBottom: '2rem' }}>{success}</div>}

          <Row gutter={[32, 32]}>
            {/* LEFT COLUMN */}
            <Col xs={24} lg={13}>
              <div className="form-card">
                <div className="form-card-header"><Car size={20} /><h3>Basic Information</h3></div>
                <div className="form-card-body">
                  <div className="input-group">
                    <label>Vehicle Listing Title</label>
                    <input className="input-field" placeholder="e.g. Spacious Luxury SUV 2024" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                  </div>
                  <Row gutter={[16, 16]}>
                    <Col span={12}><div className="input-group"><label>Make</label><AntSelect showSearch className="antd-select-large" placeholder="Brand" value={selectedMake || undefined} onChange={(v) => { setSelectedMake(v); setSelectedModel(''); }} loading={loadingMakes}>{makes.map(m => <Option key={m._id} value={m.name}>{m.name}</Option>)}</AntSelect></div></Col>
                    <Col span={12}><div className="input-group"><label>Model</label><AntSelect showSearch className="antd-select-large" placeholder="Model" value={selectedModel || undefined} onChange={(v) => setSelectedModel(v)} loading={loadingModels} disabled={!selectedMake}>{models.map(m => <Option key={m._id} value={m.name}>{m.name}</Option>)}</AntSelect></div></Col>
                  </Row>
                  <Row gutter={[16, 16]}>
                    <Col span={10}><div className="input-group"><label>Year</label><input type="number" className="input-field" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} required /></div></Col>
                    <Col span={14}><div className="input-group"><label>Daily Rate (LKR)</label><input type="number" className="input-field" value={form.pricePerDay} onChange={(e) => setForm({ ...form, pricePerDay: e.target.value })} required /></div></Col>
                  </Row>
                </div>
              </div>

              <div className="form-card">
                <div className="form-card-header"><MapPin size={20} /><h3>Location Details</h3><button type="button" onClick={handleGetLocation} className="btn-locate-premium"><Locate size={14} /> Auto-Detect</button></div>
                <div className="form-card-body">
                  <Row gutter={[16, 16]}>
                    <Col span={12}><div className="input-group"><label>Province</label><select className="input-field" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} required><option value="">Select Province</option>{Object.keys(SRI_LANKA_LOCATIONS).map(p => <option key={p} value={p}>{p}</option>)}</select></div></Col>
                    <Col span={12}><div className="input-group"><label>District</label><select className="input-field" disabled={!form.province} value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} required><option value="">Select District</option>{form.province && SRI_LANKA_LOCATIONS[form.province].map(d => <option key={d} value={d}>{d}</option>)}</select></div></Col>
                    <Col span={24}><div className="input-group"><label>City / Town</label><input className="input-field" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required /></div></Col>
                  </Row>
                </div>
              </div>
            </Col>

            {/* RIGHT COLUMN */}
            <Col xs={24} lg={11}>
              <div className="form-card">
                <div className="form-card-header"><Settings size={20} /><h3>Technical Specifications</h3></div>
                <div className="form-card-body">
                  <Row gutter={[14, 14]}>
                    <Col span={12}><div className="input-group"><label>Transmission</label><select className="input-field" value={form.transmission} onChange={(e) => setForm({ ...form, transmission: e.target.value })}><option value="Automatic">Automatic</option><option value="Manual">Manual</option></select></div></Col>
                    <Col span={12}><div className="input-group"><label>Fuel Type</label><select className="input-field" value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value })}><option value="Petrol">Petrol</option><option value="Diesel">Diesel</option></select></div></Col>
                    <Col span={12}><div className="input-group"><label>Seats</label><select className="input-field" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })}><option value="2">2</option><option value="4">4</option><option value="5">5</option><option value="7">7</option></select></div></Col>
                    <Col span={12}><div className="input-group"><label>Capacity</label><input className="input-field" placeholder="1500cc" value={form.engineCapacity} onChange={(e) => setForm({ ...form, engineCapacity: e.target.value })} /></div></Col>
                  </Row>
                  
                  <div style={{ marginTop: '1.5rem' }}>
                    <label className="input-group label">Features & Amenities</label>
                    <div className="features-grid">
                      {VEHICLE_FEATURES.map(v => (
                        <div key={v.id} className={`feature-item ${form.features.includes(v.id) ? 'active' : ''}`} onClick={() => handleFeatureToggle(v.id)}>
                          <span className="feature-icon">{v.icon}</span><span className="feature-label">{v.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-card">
                <div className="form-card-header"><Image size={20} /><h3>Media & Description</h3></div>
                <div className="form-card-body">
                  <div className="input-group"><label>Description</label><textarea className="input-field" rows={4} placeholder="Describe your vehicle..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>
                  <div className="input-group">
                    <label>Vehicle Photos</label>
                    <div className="upload-dropzone" onClick={() => fileInputRef.current?.click()}>
                      <p>Click to Upload Photos</p>
                      <input type="file" hidden multiple ref={fileInputRef} onChange={(e) => setPhotos(Array.from(e.target.files!))} accept="image/*" />
                    </div>
                    <div className="photo-preview-list">
                      {photos.map((p, i) => (
                        <div key={i} className="photo-tag">{p.name} <button type="button" onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))}>&times;</button></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <button type="submit" className="submit-vehicle-btn" disabled={loading}>
                {loading ? 'Processing...' : 'Publish Listing'}
              </button>
            </Col>
          </Row>
        </form>
      </section>
    </div>
  );
}

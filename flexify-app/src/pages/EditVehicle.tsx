import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { vehicleApi, type VehicleMake, type VehicleModel, getImageUrl } from '../api';
import { Select as AntSelect, message, Row, Col } from 'antd';
import { Car, MapPin, Settings, Image, Locate, Save, Trash2 } from 'lucide-react';
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

export default function EditVehicle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
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
  const [existingPhotos, setExistingPhotos] = useState<any[]>([]);
  const [makes, setMakes] = useState<VehicleMake[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const [v, am] = await Promise.all([vehicleApi.getById(id), vehicleApi.getMakes()]);
        setMakes(am); setSelectedMake(v.make || '');
        setForm({
          title: v.title, make: v.make, model: v.model, year: v.year.toString(), pricePerDay: v.pricePerDay.toString(),
          transmission: v.transmission || 'Automatic', fuelType: v.fuelType || 'Petrol', seats: (v.seats || 4).toString(),
          serviceType: (v.serviceType && v.serviceType[0]) || '', description: v.description || '', address: v.location?.address || '',
          lat: (v.location?.coordinates?.[1] || '').toString(), lng: (v.location?.coordinates?.[0] || '').toString(),
          engineCapacity: v.engineCapacity || '', fuelConsumption: v.fuelConsumption || '', features: v.features || [],
          province: v.province || '', district: v.district || '', city: v.city || '', pricePerWeek: v.pricePerWeek?.toString() || '', pricePerMonth: v.pricePerMonth?.toString() || ''
        });
        setExistingPhotos(v.photos || []);
      } catch (err: any) { setError(err.message || 'Error'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    const fetchModels = async () => {
      if (!selectedMake) { setModels([]); return; }
      const makeObj = makes.find((m: VehicleMake) => m.name === selectedMake);
      if (!makeObj) return;
      try {
        const data = await vehicleApi.getModels(makeObj._id); setModels(data);
        if (form.model) setSelectedModel(form.model);
      } catch (err) { console.error("API Error", err); }
    };
    if (makes.length > 0) fetchModels();
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
            const addr = data.address; const city = addr.city || addr.town || '';
            const district = (addr.state_district || addr.county || '').replace(' District', '').trim();
            const state = addr.state || '';
            let mp = ''; let md = '';
            Object.entries(SRI_LANKA_LOCATIONS).forEach(([prov, dists]) => {
              if (state.includes(prov) || dists.some(d => district.includes(d))) {
                mp = prov; if (dists.some(d => district.includes(d))) md = dists.find(d => district.includes(d)) || '';
              }
            });
            setForm(prev => ({ ...prev, province: mp || prev.province, district: md || prev.district, city: city || prev.city, lat: latitude.toString(), lng: longitude.toString() }));
            message.success({ content: `Detected: ${city}`, key: 'locate' });
          }
        } catch (err) { message.success({ content: 'Found', key: 'locate' }); }
      }, () => message.error({ content: 'Failed', key: 'locate' }));
    }
  };

  const handleFeatureToggle = (fid: string) => {
    setForm(prev => ({ ...prev, features: prev.features.includes(fid) ? prev.features.filter(id => id !== fid) : [...prev.features, fid] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!id) return; setSaveLoading(true); setError('');
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      formData.append('features', JSON.stringify(form.features));
      formData.append('existingPhotos', JSON.stringify(existingPhotos));
      photos.forEach(p => formData.append('photos', p));
      await vehicleApi.updateWithPhotos(id, formData); message.success('Updated Successfully!'); navigate('/dashboard');
    } catch (err: any) { setError(err.message || 'Error occurred'); }
    finally { setSaveLoading(false); }
  };

  if (loading) return <div className="container" style={{ padding: '80px 1rem', textAlign: 'center' }}>Syncing...</div>;

  return (
    <div className="list-vehicle-page">
      <section className="static-hero">
        <div className="container">
          <h1>Edit Vehicle Listing</h1>
          <p>The premium way to share your drive</p>
        </div>
      </section>

      <section className="list-vehicle-wrapper">
        <form onSubmit={handleSubmit}>
          {error && <div className="auth-message error" style={{ marginBottom: '2rem' }}>{error}</div>}

          <Row gutter={[32, 32]}>
            <Col xs={24} lg={13}>
              <div className="form-card">
                <div className="form-card-header"><Car size={20} /><h3>Basic Information</h3></div>
                <div className="form-card-body">
                  <div className="input-group"><label>Vehicle Title</label><input className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
                  <Row gutter={[16, 16]}>
                    <Col span={12}><div className="input-group"><label>Make</label><AntSelect showSearch className="antd-select-large" value={selectedMake || undefined} onChange={(v) => { setSelectedMake(v); setSelectedModel(''); }}>{makes.map(m => <Option key={m._id} value={m.name}>{m.name}</Option>)}</AntSelect></div></Col>
                    <Col span={12}><div className="input-group"><label>Model</label><AntSelect showSearch className="antd-select-large" value={selectedModel || undefined} onChange={(v) => setSelectedModel(v)} disabled={!selectedMake}>{models.map(m => <Option key={m._id} value={m.name}>{m.name}</Option>)}</AntSelect></div></Col>
                  </Row>
                  <Row gutter={[16, 16]}>
                    <Col span={10}><div className="input-group"><label>Year</label><input type="number" className="input-field" value={form.year} onChange={(e) => setForm({ ...form, year: v => v })} required /></div></Col>
                    <Col span={14}><div className="input-group"><label>Price / Day (LKR)</label><input type="number" className="input-field" value={form.pricePerDay} onChange={(e) => setForm({ ...form, pricePerDay: e.target.value })} required /></div></Col>
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

            <Col xs={24} lg={11}>
              <div className="form-card">
                <div className="form-card-header"><Settings size={20} /><h3>Technical Specs</h3></div>
                <div className="form-card-body">
                  <Row gutter={[14, 14]}>
                    <Col span={12}><div className="input-group"><label>Transmission</label><select className="input-field" value={form.transmission} onChange={(e) => setForm({ ...form, transmission: e.target.value })}><option value="Automatic">Automatic</option><option value="Manual">Manual</option></select></div></Col>
                    <Col span={12}><div className="input-group"><label>Fuel</label><select className="input-field" value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value })}><option value="Petrol">Petrol</option><option value="Diesel">Diesel</option></select></div></Col>
                  </Row>
                  <div style={{ marginTop: '1.5rem' }}>
                    <label className="input-group label">Amenities</label>
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
                <div className="form-card-header"><Image size={20} /><h3>Description & Media</h3></div>
                <div className="form-card-body">
                  <div className="input-group"><label>Description</label><textarea className="input-field" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div>
                  <div className="photo-preview-list" style={{ marginBottom: '1rem' }}>
                    {existingPhotos.map((p, i) => (
                      <div key={i} className="photo-tag"><img src={getImageUrl(p)} style={{ width: '30px', borderRadius: '4px' }} alt="" /><button type="button" onClick={() => setExistingPhotos(existingPhotos.filter((_, idx) => idx !== i))}><Trash2 size={12} /></button></div>
                    ))}
                  </div>
                  <div className="upload-dropzone" onClick={() => fileInputRef.current?.click()}><p>Add More Photos</p><input type="file" hidden multiple ref={fileInputRef} onChange={(e) => setPhotos(Array.from(e.target.files!))} accept="image/*" /></div>
                </div>
              </div>

              <button type="submit" className="submit-vehicle-btn" disabled={saveLoading} style={{ marginTop: '1rem' }}>
                {saveLoading ? 'Syncing...' : <><Save size={18} /> Save Changes</>}
              </button>
            </Col>
          </Row>
        </form>
      </section>
    </div>
  );
}

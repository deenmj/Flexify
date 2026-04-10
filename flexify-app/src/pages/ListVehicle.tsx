import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { vehicleApi, type VehicleMake, type VehicleModel } from '../api';
import { Select as AntSelect, message, Row, Col } from 'antd';
import { Car, MapPin, Settings, Image, Locate, ShieldCheck } from 'lucide-react';
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
  const [customMake, setCustomMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [customModel, setCustomModel] = useState('');
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
      } catch (err) { console.error("API FAIL", err); }
      finally { setLoadingMakes(false); }
    };
    fetchMakes();
  }, []);

  useEffect(() => {
    const fetchModels = async () => {
      if (!selectedMake || selectedMake === 'Other') { setModels([]); return; }
      const makeObj = makes.find((m: VehicleMake) => m.name === selectedMake);
      if (!makeObj) return;
      setLoadingModels(true);
      try {
        const data = await vehicleApi.getModels(makeObj._id);
        setModels(data);
      } catch (err) { console.error("API FAIL", err); }
      finally { setLoadingModels(false); }
    };
    fetchModels();
  }, [selectedMake, makes]);

  useEffect(() => {
    const finalMake = selectedMake === 'Other' ? customMake : selectedMake;
    const finalModel = selectedModel === 'Other' ? customModel : selectedModel;
    setForm(prev => ({ ...prev, make: finalMake, model: finalModel }));
  }, [selectedMake, customMake, selectedModel, customModel]);

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      message.loading({ content: 'Syncing Location...', key: 'locate' });
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
          const data = await res.json();
          if (data && data.address) {
            const addr = data.address;
            const city = addr.city || addr.town || '';
            const district = (addr.state_district || addr.county || '').replace(' District', '').trim();
            const state = addr.state || '';
            let matchedProvince = ''; let matchedDistrict = '';
            Object.entries(SRI_LANKA_LOCATIONS).forEach(([prov, dists]) => {
              if (state.includes(prov) || dists.some(d => district.includes(d))) {
                matchedProvince = prov;
                if (dists.some(d => district.includes(d))) matchedDistrict = dists.find(d => district.includes(d)) || '';
              }
            });
            setForm(prev => ({ ...prev, province: matchedProvince || prev.province, district: matchedDistrict || prev.district, city: city || prev.city }));
            message.success({ content: `Location Updated: ${city}`, key: 'locate' });
          }
        } catch (err) { message.success({ content: 'Location Found', key: 'locate' }); }
      }, () => message.error({ content: 'Sync Failed', key: 'locate' }));
    }
  };

  const handleFeatureToggle = (featureId: string) => {
    setForm(prev => ({
      ...prev, features: prev.features.includes(featureId) ? prev.features.filter(id => id !== featureId) : [...prev.features, featureId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      formData.append('features', JSON.stringify(form.features));
      photos.forEach(p => formData.append('photos', p));
      await vehicleApi.createWithPhotos(formData);
      await refreshUser();
      setSuccess('Vehicle Listing Published Successfully!');
      window.scrollTo(0, 0);
    } catch (err: any) { setError(err.message || 'Error occurred while publishing'); }
    finally { setLoading(false); }
  };

  if (!user) return <div className="container" style={{ padding: '100px 1rem', textAlign: 'center' }}>Please log in to continue.</div>;

  return (
    <div className="list-vehicle-page">
      <section className="static-hero">
        <div className="container">
          <h1>List Your Vehicle</h1>
          <p>Join Sri Lanka's premium vehicle marketplace</p>
        </div>
      </section>

      <section className="list-vehicle-wrapper">
        <form onSubmit={handleSubmit} className="list-vehicle-form-refined">
          
          <Row gutter={[32, 32]}>
            <Col xs={24} lg={12}>
              <div className="form-card">
                <div className="form-card-header">
                  <Car size={22} />
                  <h3>Basic Information</h3>
                </div>
                <div className="form-card-body">
                  <div className="input-group">
                    <label>Vehicle Listing Title</label>
                    <input className="input-field" placeholder="e.g. Spacious Luxury SUV" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                  </div>
                  
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <div className="input-group">
                        <label>Make</label>
                        <AntSelect showSearch className="antd-select-large" placeholder="Select Make" value={selectedMake || undefined} onChange={(val) => { setSelectedMake(val); setSelectedModel(''); }} loading={loadingMakes}>
                          {makes.map(m => <Option key={m._id} value={m.name}>{m.name}</Option>)}
                          <Option value="Other">Other</Option>
                        </AntSelect>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div className="input-group">
                        <label>Model</label>
                        <AntSelect showSearch className="antd-select-large" placeholder="Select Model" value={selectedModel || undefined} onChange={(val) => setSelectedModel(val)} loading={loadingModels} disabled={!selectedMake}>
                          {models.map(m => <Option key={m._id} value={m.name}>{m.name}</Option>)}
                          <Option value="Other">Other</Option>
                        </AntSelect>
                      </div>
                    </Col>
                  </Row>

                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <div className="input-group">
                        <label>Year of Manufacture</label>
                        <input type="number" className="input-field" placeholder="2024" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} required />
                      </div>
                    </Col>
                    <Col span={12}>
                      <div className="input-group">
                        <label>Daily Price (LKR)</label>
                        <input type="number" className="input-field" placeholder="LKR / Day" value={form.pricePerDay} onChange={(e) => setForm({ ...form, pricePerDay: e.target.value })} required />
                      </div>
                    </Col>
                  </Row>
                </div>
              </div>
            </Col>

            <Col xs={24} lg={12}>
              <div className="form-card">
                <div className="form-card-header">
                  <Settings size={22} />
                  <h3>Technical Specifications</h3>
                </div>
                <div className="form-card-body">
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <div className="input-group">
                        <label>Transmission</label>
                        <select className="input-field" value={form.transmission} onChange={(e) => setForm({ ...form, transmission: e.target.value })}>
                          <option value="Automatic">Automatic</option><option value="Manual">Manual</option>
                        </select>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div className="input-group">
                        <label>Fuel Type</label>
                        <select className="input-field" value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value })}>
                          <option value="Petrol">Petrol</option><option value="Diesel">Diesel</option><option value="Hybrid">Hybrid</option><option value="Electric">Electric</option>
                        </select>
                      </div>
                    </Col>
                  </Row>

                  <Row gutter={[16, 16]}>
                    <Col span={12}><div className="input-group"><label>Engine Capacity</label><input className="input-field" placeholder="e.g. 1500cc" value={form.engineCapacity} onChange={(e) => setForm({ ...form, engineCapacity: e.target.value })} /></div></Col>
                    <Col span={12}><div className="input-group"><label>Number of Seats</label><select className="input-field" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })}><option value="2">2</option><option value="4">4</option><option value="5">5</option><option value="7">7</option><option value="8">8+</option></select></div></Col>
                  </Row>

                  <label className="features-group-title">Features & Amenities</label>
                  <div className="features-grid">
                    {VEHICLE_FEATURES.map(feat => (
                      <div key={feat.id} className={`feature-item ${form.features.includes(feat.id) ? 'active' : ''}`} onClick={() => handleFeatureToggle(feat.id)}>
                        <span className="feature-icon">{feat.icon}</span>
                        <span className="feature-label">{feat.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Col>

            <Col xs={24}>
              <div className="form-card">
                <div className="form-card-header">
                  <MapPin size={22} />
                  <h3>Location & Media Details</h3>
                  <button type="button" onClick={handleGetLocation} className="btn-locate-premium"><Locate size={18} /> Auto-Detect Location</button>
                </div>
                <div className="form-card-body">
                  <Row gutter={[24, 24]}>
                    <Col xs={24} md={8}><div className="input-group"><label>Province</label><select className="input-field" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} required><option value="">Select Province</option>{Object.keys(SRI_LANKA_LOCATIONS).map(p => <option key={p} value={p}>{p}</option>)}</select></div></Col>
                    <Col xs={24} md={8}><div className="input-group"><label>District</label><select className="input-field" disabled={!form.province} value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} required><option value="">Select District</option>{form.province && SRI_LANKA_LOCATIONS[form.province].map(d => <option key={d} value={d}>{d}</option>)}</select></div></Col>
                    <Col xs={24} md={8}><div className="input-group"><label>City / Town</label><input className="input-field" placeholder="Enter City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required /></div></Col>
                    
                    <Col xs={24} md={12}><div className="input-group"><label>Tell us about your vehicle</label><textarea className="input-field" rows={5} placeholder="Describe condition, unique features, and rules..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div></Col>
                    <Col xs={24} md={12}>
                      <div className="input-group">
                        <label>Vehicle Media</label>
                        <div className="upload-dropzone" onClick={() => fileInputRef.current?.click()}>
                          <Image size={36} />
                          <p>Upload High-Res Photos</p>
                          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>PNG, JPG up to 10MB</span>
                          <input type="file" hidden multiple ref={fileInputRef} onChange={(e) => setPhotos(Array.from(e.target.files!))} accept="image/*" />
                        </div>
                        {photos.length > 0 && (
                          <div className="photo-preview-list">
                            {photos.map((p, i) => (
                              <span key={i} className="photo-tag">{p.name} <button type="button" onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))}>&times;</button></span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Col>
                  </Row>
                </div>
              </div>
            </Col>
          </Row>

          <button type="submit" className="submit-vehicle-btn" disabled={loading}>
            {loading ? 'Publishing...' : 'Publish Listing'}
          </button>
        </form>
      </section>
    </div>
  );
}

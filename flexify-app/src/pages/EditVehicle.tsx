import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { vehicleApi, type VehicleMake, type VehicleModel, getImageUrl } from '../api';
import { Select as AntSelect, message, Row, Col } from 'antd';
import { Car, MapPin, Settings, Image, Locate, Save, Trash2, Gauge, Fuel, Users, Zap } from 'lucide-react';
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
  const [customMake, setCustomMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<any[]>([]);
  const [makes, setMakes] = useState<VehicleMake[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const [vehicle, allMakes] = await Promise.all([
          vehicleApi.getById(id),
          vehicleApi.getMakes()
        ]);
        setMakes(allMakes);
        const makeExists = allMakes.find((m: any) => m.name === vehicle.make);
        if (makeExists) setSelectedMake(vehicle.make); else if (vehicle.make) { setSelectedMake('Other'); setCustomMake(vehicle.make); }
        setForm({
          title: vehicle.title, make: vehicle.make, model: vehicle.model,
          year: vehicle.year.toString(), pricePerDay: vehicle.pricePerDay.toString(),
          transmission: vehicle.transmission || 'Automatic', fuelType: vehicle.fuelType || 'Petrol',
          seats: (vehicle.seats || 4).toString(), serviceType: (vehicle.serviceType && vehicle.serviceType[0]) || '',
          description: vehicle.description || '', address: vehicle.location?.address || '',
          lat: (vehicle.location?.coordinates?.[1] || 7.8731).toString(),
          lng: (vehicle.location?.coordinates?.[0] || 80.7718).toString(),
          engineCapacity: vehicle.engineCapacity || '', fuelConsumption: vehicle.fuelConsumption || '',
          features: vehicle.features || [], province: vehicle.province || '', district: vehicle.district || '', city: vehicle.city || '',
          pricePerWeek: vehicle.pricePerWeek?.toString() || '', pricePerMonth: vehicle.pricePerMonth?.toString() || ''
        });
        setExistingPhotos(vehicle.photos || []);
      } catch (err: any) { setError(err.message || 'Failed load'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    const fetchModels = async () => {
      if (!selectedMake || selectedMake === 'Other') { setModels([]); return; }
      const makeObj = makes.find((m: VehicleMake) => m.name === selectedMake);
      if (!makeObj) return;
      try {
        const data = await vehicleApi.getModels(makeObj._id);
        setModels(data);
        const modelExists = data.find((md: any) => md.name === form.model);
        if (modelExists) setSelectedModel(form.model); else if (form.model && selectedMake !== 'Other') {
          setSelectedModel('Other'); setCustomModel(form.model);
        }
      } catch (err) { console.error("Models fail", err); }
    };
    if (makes.length > 0) fetchModels();
  }, [selectedMake, makes]);

  useEffect(() => {
    const finalMake = selectedMake === 'Other' ? customMake : selectedMake;
    const finalModel = selectedModel === 'Other' ? customModel : selectedModel;
    setForm(prev => ({ ...prev, make: finalMake, model: finalModel }));
  }, [selectedMake, customMake, selectedModel, customModel]);

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
            let matchedProvince = ''; let matchedDistrict = '';
            Object.entries(SRI_LANKA_LOCATIONS).forEach(([prov, dists]) => {
              if (state.includes(prov) || dists.some(d => district.includes(d))) {
                matchedProvince = prov;
                if (dists.some(d => district.includes(d))) matchedDistrict = dists.find(d => district.includes(d)) || '';
              }
            });
            setForm(prev => ({ ...prev, province: matchedProvince || prev.province, district: matchedDistrict || prev.district, city: city || prev.city, lat: latitude.toString(), lng: longitude.toString() }));
            message.success({ content: `Detected: ${city || 'Locality'}`, key: 'locate' });
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
    if (!id) return;
    setSaveLoading(true);
    setError('');
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      formData.append('features', JSON.stringify(form.features));
      formData.append('existingPhotos', JSON.stringify(existingPhotos));
      photos.forEach(p => formData.append('photos', p));
      await vehicleApi.updateWithPhotos(id, formData);
      message.success('Listing Updated!');
      navigate('/dashboard');
    } catch (err: any) { setError(err.message || 'Error occurred'); }
    finally { setSaveLoading(false); }
  };

  if (loading) return <div className="container" style={{ padding: '80px 1rem', textAlign: 'center' }}>Synchronizing details...</div>;

  return (
    <div className="list-vehicle-page">
      <section className="static-hero">
        <div className="container">
          <h1>Edit Profile</h1>
          <p>Optimize your vehicle listing for maximum visibility</p>
        </div>
      </section>

      <section className="list-vehicle-wrapper">
        <div className="container">
          {error && <div className="auth-message error" style={{ marginBottom: '2rem' }}>{error}</div>}

          <form onSubmit={handleSubmit} className="list-vehicle-form-refined">
            
            <Row gutter={[32, 32]}>
              <Col xs={24} lg={12}>
                <div className="form-card" style={{ height: '100%', animationDelay: '0s' }}>
                  <div className="form-card-header">
                    <Car size={22} />
                    <h3>Basic Information</h3>
                  </div>
                  <div className="form-card-body">
                    <div className="input-group">
                      <label>Vehicle Listing Title</label>
                      <input className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                    </div>
                    
                    <Row gutter={[16, 16]}>
                      <Col span={12}>
                        <div className="input-group">
                          <label>Make</label>
                          <AntSelect showSearch className="antd-select-large" value={selectedMake || undefined} onChange={(val) => { setSelectedMake(val); setSelectedModel(''); }}>
                            {makes.map(m => <Option key={m._id} value={m.name}>{m.name}</Option>)}
                            <Option value="Other">Other</Option>
                          </AntSelect>
                        </div>
                      </Col>
                      <Col span={12}>
                        <div className="input-group">
                          <label>Model</label>
                          <AntSelect showSearch className="antd-select-large" value={selectedModel || undefined} onChange={(val) => setSelectedModel(val)} disabled={!selectedMake}>
                            {models.map(m => <Option key={m._id} value={m.name}>{m.name}</Option>)}
                            <Option value="Other">Other</Option>
                          </AntSelect>
                        </div>
                      </Col>
                    </Row>

                    <Row gutter={[16, 16]}>
                      <Col span={8}>
                        <div className="input-group"><label>Year</label><input type="number" className="input-field" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} required /></div>
                      </Col>
                      <Col span={16}>
                        <div className="input-group"><label>Price / Day (LKR)</label><input type="number" className="input-field" value={form.pricePerDay} onChange={(e) => setForm({ ...form, pricePerDay: e.target.value })} required /></div>
                      </Col>
                    </Row>
                  </div>
                </div>
              </Col>

              <Col xs={24} lg={12}>
                <div className="form-card" style={{ height: '100%', animationDelay: '0.1s' }}>
                  <div className="form-card-header"><Settings size={22} /><h3>Technical Specifications</h3></div>
                  <div className="form-card-body">
                    <Row gutter={[16, 16]}>
                      <Col span={12}><div className="input-group"><label>Transmission</label><select className="input-field" value={form.transmission} onChange={(e) => setForm({ ...form, transmission: e.target.value })}><option value="Automatic">Automatic</option><option value="Manual">Manual</option></select></div></Col>
                      <Col span={12}><div className="input-group"><label>Fuel Type</label><select className="input-field" value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value })}><option value="Petrol">Petrol</option><option value="Diesel">Diesel</option><option value="Electric">Electric</option></select></div></Col>
                    </Row>
                    <label className="features-group-title">Features & Amenities</label>
                    <div className="features-grid">
                      {VEHICLE_FEATURES.map(feat => (
                        <div key={feat.id} className={`feature-item ${form.features.includes(feat.id) ? 'active' : ''}`} onClick={() => handleFeatureToggle(feat.id)}>
                          <span className="feature-icon">{feat.icon}</span><span className="feature-label">{feat.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Col>

              <Col xs={24}>
                <div className="form-card" style={{ animationDelay: '0.2s' }}>
                  <div className="form-card-header"><MapPin size={22} /><h3>Location & Media</h3><button type="button" onClick={handleGetLocation} className="btn-locate-premium"><Locate size={16} /> Auto-Detect</button></div>
                  <div className="form-card-body">
                    <Row gutter={[24, 24]}>
                      <Col xs={24} md={8}><div className="input-group"><label>Province</label><select className="input-field" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} required><option value="">Select Province</option>{Object.keys(SRI_LANKA_LOCATIONS).map(p => <option key={p} value={p}>{p}</option>)}</select></div></Col>
                      <Col xs={24} md={8}><div className="input-group"><label>District</label><select className="input-field" disabled={!form.province} value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} required><option value="">Select District</option>{form.province && SRI_LANKA_LOCATIONS[form.province].map(d => <option key={d} value={d}>{d}</option>)}</select></div></Col>
                      <Col xs={24} md={8}><div className="input-group"><label>City</label><input className="input-field" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required /></div></Col>
                      
                      <Col xs={24} md={12}><div className="input-group"><label>Description</label><textarea className="input-field" rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></div></Col>
                      <Col xs={24} md={12}>
                        <div className="input-group">
                          <label>Photos Management</label>
                          <div className="photo-preview-list mb-3">
                            {existingPhotos.map((p, i) => (
                              <div key={i} className="photo-tag"><img src={getImageUrl(p)} style={{ width: '40px', borderRadius: '4px' }} alt="" /><button type="button" onClick={() => setExistingPhotos(existingPhotos.filter((_, idx) => idx !== i))}><Trash2 size={14} /></button></div>
                            ))}
                          </div>
                          <div className="upload-dropzone" onClick={() => fileInputRef.current?.click()}><Image size={32} /><p>Add More Photos</p><input type="file" hidden multiple ref={fileInputRef} onChange={(e) => setPhotos(Array.from(e.target.files!))} accept="image/*" /></div>
                        </div>
                      </Col>
                    </Row>
                  </div>
                </div>
              </Col>
            </Row>

            <button type="submit" className="submit-vehicle-btn" disabled={saveLoading} style={{ marginTop: '2rem' }}>
              {saveLoading ? 'Saving Changes...' : <><Save size={18} /> Update Listing</>}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

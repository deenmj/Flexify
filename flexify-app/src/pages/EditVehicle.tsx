import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { vehicleApi, type VehicleMake, type VehicleModel, type Vehicle, getImageUrl } from '../api';
import { Select as AntSelect, message, Row, Col, Modal, Tag } from 'antd';
import { Car, MapPin, DollarSign, Settings, Image, ArrowRight, Locate, Save, Trash2, Users, FileText, Zap, Eye, EyeOff, ChevronLeft, ChevronRight, Menu as MenuIcon } from 'lucide-react';
import { Spin } from 'antd';
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
    title: '',
    make: '',
    model: '',
    year: '',
    pricePerDay: '',
    transmission: 'Automatic',
    fuelType: 'Petrol',
    seats: '4',
    serviceType: '',
    description: '',
    address: '',
    lat: '',
    lng: '',
    engineCapacity: '',
    fuelConsumption: '',
    features: [] as string[],
    province: '',
    district: '',
    city: '',
    pricePerWeek: '',
    pricePerMonth: '',
    kmLimitPerDay: '',
    extraKmPrice: '',
    isActive: true
  });

  const [selectedMake, setSelectedMake] = useState('');
  const [customMake, setCustomMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<any[]>([]);
  const [position, setPosition] = useState({ lat: 7.8731, lng: 80.7718 });

  const [makes, setMakes] = useState<VehicleMake[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);

  // Fetch initial data
  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const [vehicle, allMakes] = await Promise.all([
          vehicleApi.getById(id),
          vehicleApi.getMakes()
        ]);

        setMakes(allMakes);
        
        // Check if make is in approved list
        const makeExists = allMakes.find((m: any) => m.name === vehicle.make);
        if (makeExists) {
          setSelectedMake(vehicle.make);
        } else if (vehicle.make) {
          setSelectedMake('Other');
          setCustomMake(vehicle.make);
        }

        // Robust Feature Parsing for existing data
        const parseExistingFeatures = (feat: any): string[] => {
          if (!feat) return [];
          const flatten = (data: any): string[] => {
            if (Array.isArray(data)) return data.flatMap(item => flatten(item));
            if (typeof data === 'string') {
              const trimmed = data.trim();
              if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                try { return flatten(JSON.parse(trimmed)); } catch (e) { 
                  return trimmed.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
                }
              }
              return [trimmed.replace(/^["']|["']$/g, '').trim()];
            }
            return [];
          };
          return Array.from(new Set(flatten(feat)))
            .filter(s => s && s.length > 1 && !s.includes('[') && !s.includes('"'));
        };

        // Fill form
        setForm({
          title: vehicle.title,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year.toString(),
          pricePerDay: vehicle.pricePerDay.toString(),
          transmission: vehicle.transmission || 'Automatic',
          fuelType: vehicle.fuelType || 'Petrol',
          seats: (vehicle.seats || 4).toString(),
          serviceType: (vehicle.serviceType && vehicle.serviceType[0]) || '',
          description: vehicle.description || '',
          address: vehicle.location?.address || '',
          lat: (vehicle.location?.coordinates?.[1] || 7.8731).toString(),
          lng: (vehicle.location?.coordinates?.[0] || 80.7718).toString(),
          engineCapacity: vehicle.engineCapacity || '',
          fuelConsumption: vehicle.fuelConsumption || '',
          features: parseExistingFeatures(vehicle.features),
          province: vehicle.province || '',
          district: vehicle.district || '',
          city: vehicle.city || '',
          pricePerWeek: vehicle.pricePerWeek?.toString() || '',
          pricePerMonth: vehicle.pricePerMonth?.toString() || '',
          kmLimitPerDay: vehicle.kmLimitPerDay?.toString() || '',
          extraKmPrice: vehicle.extraKmPrice?.toString() || '',
          isActive: vehicle.isActive
        });

        // We'll set model after makes logic to avoid race condition with fetchModels useEffect
        setExistingPhotos(vehicle.photos || []);
        if (vehicle.location?.coordinates) {
          setPosition({ lat: vehicle.location.coordinates[1], lng: vehicle.location.coordinates[0] });
        }

      } catch (err: any) {
        setError(err.message || 'Failed to load vehicle details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Fetch models when make changes
  useEffect(() => {
    const fetchModels = async () => {
      if (!selectedMake || selectedMake === 'Other') {
        setModels([]);
        return;
      }
      const makeObj = makes.find((m: VehicleMake) => m.name === selectedMake);
      if (!makeObj) return;

      try {
        const data = await vehicleApi.getModels(makeObj._id);
        setModels(data);

        // Check if current form model is in the newly fetched list
        // This is mainly for initial load
        const modelExists = data.find((md: any) => md.name === form.model);
        if (modelExists) {
          setSelectedModel(form.model);
        } else if (form.model && selectedMake !== 'Other') {
          // If we have a model but it's not in the data, it's a custom model
          setSelectedModel('Other');
          setCustomModel(form.model);
        }
      } catch (err) {
        console.error("Failed to load models", err);
      }
    };
    if (makes.length > 0) fetchModels();
  }, [selectedMake, makes]);

  useEffect(() => {
    const finalMake = selectedMake === 'Other' ? customMake : selectedMake;
    const finalModel = selectedModel === 'Other' ? customModel : selectedModel;
    setForm(prev => ({ ...prev, make: finalMake, model: finalModel }));
  }, [selectedMake, customMake, selectedModel, customModel]);

  useEffect(() => {
    setForm(prev => ({ ...prev, lat: position.lat.toString(), lng: position.lng.toString() }));
  }, [position]);

  const handleFeatureToggle = (featureId: string) => {
    setForm(prev => ({
      ...prev,
      features: prev.features.includes(featureId)
        ? prev.features.filter(id => id !== featureId)
        : [...prev.features, featureId]
    }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeNewPhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = (index: number) => {
    setExistingPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const movePhotoLeft = (index: number) => {
    if (index === 0) return;
    setExistingPhotos(prev => {
      const newPhotos = [...prev];
      [newPhotos[index - 1], newPhotos[index]] = [newPhotos[index], newPhotos[index - 1]];
      return newPhotos;
    });
  };

  const movePhotoRight = (index: number) => {
    if (index === existingPhotos.length - 1) return;
    setExistingPhotos(prev => {
      const newPhotos = [...prev];
      [newPhotos[index], newPhotos[index + 1]] = [newPhotos[index + 1], newPhotos[index]];
      return newPhotos;
    });
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      message.loading({ content: 'Getting your location...', key: 'locate', duration: 10 });
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition({ lat: latitude, lng: longitude });
        message.success({ content: 'Location updated on map', key: 'locate', duration: 2 });
      }, () => {
        message.error({ content: 'Failed to access your location', key: 'locate', duration: 3 });
      });
    }
  };

  const handleToggleStatus = async () => {
    if (!id) return;
    try {
      await vehicleApi.toggleStatus(id);
      setForm(prev => ({ ...prev, isActive: !prev.isActive }));
      message.success(form.isActive ? 'Vehicle is now hidden' : 'Vehicle is now visible');
    } catch (err: any) {
      message.error(err.message || 'Failed to update status');
    }
  };

  const handleDeleteVehicle = () => {
    if (!id) return;
    Modal.confirm({
      title: 'Delete Vehicle',
      content: 'Are you sure you want to delete this vehicle? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await vehicleApi.delete(id);
          message.success('Vehicle deleted successfully');
          navigate('/dashboard');
        } catch (err: any) {
          message.error(err.message || 'Failed to delete vehicle');
        }
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaveLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        // Skip features here, we'll append it specifically below
        if (key !== 'features') {
          formData.append(key, value);
        }
      });
      
      // Append complex fields specifically
      formData.append('features', JSON.stringify(form.features));
      formData.append('existingPhotos', JSON.stringify(existingPhotos));

      photos.forEach(photo => {
        formData.append('photos', photo);
      });

      await vehicleApi.updateWithPhotos(id, formData);
      message.success('Vehicle details updated successfully');
      navigate(-1);
    } catch (err: any) {
      setError(err.message || 'Error updating vehicle');
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
      <Spin size="large" />
      <p style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 500 }}>Loading vehicle details...</p>
    </div>
  );

  return (
    <div className="list-vehicle-page">
      <section className="static-hero">
        <div className="container" style={{ position: 'relative' }}>
          <h1>Edit Vehicle</h1>
          <p>Update your vehicle information and pricing</p>
        </div>
      </section>

      <section className="container list-vehicle-content">
        <div className="list-vehicle-wrapper">
          {error && <div className="auth-message error">{error}</div>}
          
          <form onSubmit={handleSubmit} className="list-vehicle-form-refined">
            
            {/* SECTION 1: BASIC INFORMATION */}
            <div className="form-card animate-fade-in-up">
              <div className="form-card-header">
                <Car size={20} />
                <h3>Basic Information</h3>
              </div>
              <div className="form-card-body">
                <div className="input-group full-width">
                  <label>Vehicle Title</label>
                  <input className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
                
                <div className="form-grid-2">
                  <div className="input-group">
                    <label>Make</label>
                    <AntSelect
                      showSearch
                      optionFilterProp="children"
                      className="antd-select-full"
                      placeholder="Select Brand"
                      value={selectedMake || undefined}
                      onChange={(val: string) => { setSelectedMake(val); setSelectedModel(''); }}
                    >
                      {makes.map((m: VehicleMake) => (
                        <Option key={m._id} value={m.name}>{m.name}</Option>
                      ))}
                      <Option value="Other">Other</Option>
                    </AntSelect>
                  </div>
                  <div className="input-group">
                    <label>Model</label>
                    <AntSelect
                      showSearch
                      optionFilterProp="children"
                      className="antd-select-full"
                      placeholder="Select Model"
                      value={selectedModel || undefined}
                      onChange={(val: string) => setSelectedModel(val)}
                      disabled={!selectedMake}
                    >
                      {models.map((m: VehicleModel) => (
                        <Option key={m._id} value={m.name}>{m.name}</Option>
                      ))}
                      <Option value="Other">Other</Option>
                    </AntSelect>
                  </div>
                </div>

                <div className="form-grid-3">
                  <div className="input-group">
                    <label>Year</label>
                    <input type="number" className="input-field" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} required />
                  </div>
                  <div className="input-group">
                    <label>Category</label>
                    <select className="input-field" value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })} required>
                      <option value="Car">Car</option>
                      <option value="SUV">SUV</option>
                      <option value="Van">Van</option>
                      <option value="Bike">Bike</option>
                      <option value="Truck">Truck</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Price / Day (LKR)</label>
                    <input type="number" className="input-field" value={form.pricePerDay} onChange={(e) => setForm({ ...form, pricePerDay: e.target.value })} required />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="input-group">
                    <label>Price / Week (Optional)</label>
                    <input type="number" className="input-field" placeholder="LKR / week" value={form.pricePerWeek} onChange={(e) => setForm({ ...form, pricePerWeek: e.target.value })} />
                  </div>
                  <div className="input-group">
                    <label>Price / Month (Optional)</label>
                    <input type="number" className="input-field" placeholder="LKR / month" value={form.pricePerMonth} onChange={(e) => setForm({ ...form, pricePerMonth: e.target.value })} />
                  </div>
                </div>

                <div className="km-limit-section">
                  <div className="km-limit-header">
                    <span className="km-limit-icon">🛣️</span>
                    <div>
                      <label>Daily Km Limit (Optional)</label>
                      <p className="km-limit-hint">Set a maximum km per day renters can drive. Leave empty for unlimited.</p>
                    </div>
                  </div>
                  <div className="km-limit-input-row">
                    <div className="km-limit-presets">
                      {[100, 150, 200, 250, 300].map(km => (
                        <button
                          key={km}
                          type="button"
                          className={`km-preset-btn ${form.kmLimitPerDay === km.toString() ? 'active' : ''}`}
                          onClick={() => setForm({ ...form, kmLimitPerDay: km.toString() })}
                        >
                          {km} km
                        </button>
                      ))}
                    </div>
                    <div className="km-limit-custom">
                      <input
                        type="number"
                        className="input-field"
                        placeholder="Custom km limit"
                        value={form.kmLimitPerDay}
                        onChange={(e) => setForm({ ...form, kmLimitPerDay: e.target.value })}
                        min="0"
                      />
                      <span className="km-suffix">km/day</span>
                    </div>
                  </div>

                  {form.kmLimitPerDay && (
                    <div className="extra-km-price-row">
                      <div className="extra-km-label">
                        <span>💰</span>
                        <div>
                          <label>Extra Km Charge (LKR)</label>
                          <p className="km-limit-hint">Price per extra km beyond the {form.kmLimitPerDay} km limit</p>
                        </div>
                      </div>
                      <div className="km-limit-custom">
                        <input
                          type="number"
                          className="input-field"
                          placeholder="e.g. 50"
                          value={form.extraKmPrice}
                          onChange={(e) => setForm({ ...form, extraKmPrice: e.target.value })}
                          min="0"
                        />
                        <span className="km-suffix">LKR/km</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 2: TECHNICAL SPECS */}
            <div className="form-card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="form-card-header">
                <Settings size={20} />
                <h3>Technical Specifications</h3>
              </div>
              <div className="form-card-body">
                <div className="form-grid-2">
                  <div className="input-group">
                    <label>Transmission</label>
                    <select className="input-field" value={form.transmission} onChange={(e) => setForm({ ...form, transmission: e.target.value })} required>
                      <option value="Automatic">Automatic</option>
                      <option value="Manual">Manual</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Fuel Type</label>
                    <select className="input-field" value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value })} required>
                      <option value="Petrol">Petrol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Electric">Electric</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid-3">
                  <div className="input-group">
                    <label>Seats</label>
                    <select className="input-field" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} required>
                      <option value="2">2</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                      <option value="7">7</option>
                      <option value="8">8+</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Engine Capacity (cc)</label>
                    <input type="number" min="0" className="input-field" placeholder="e.g. 1500" value={form.engineCapacity} onChange={(e) => setForm({ ...form, engineCapacity: e.target.value })} />
                  </div>
                  <div className="input-group">
                    <label>Mileage / Fuel Consumption (km/L)</label>
                    <input type="number" min="0" step="0.1" className="input-field" placeholder="e.g. 15" value={form.fuelConsumption} onChange={(e) => setForm({ ...form, fuelConsumption: e.target.value })} />
                  </div>
                </div>

                <div className="features-group">
                  <label>Features & Amenities</label>
                  <div className="features-grid">
                    {VEHICLE_FEATURES.map(feature => (
                      <div 
                        key={feature.id} 
                        className={`feature-item ${form.features.includes(feature.id) ? 'active' : ''}`}
                        onClick={() => handleFeatureToggle(feature.id)}
                      >
                        <span className="feature-icon">{feature.icon}</span>
                        <span className="feature-label">{feature.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: LOCATION DETAILS */}
            <div className="form-card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="form-card-header">
                <MapPin size={20} />
                <h3>Location Details</h3>
                <button type="button" className="btn btn-ghost btn-sm locate-me-btn" onClick={handleGetLocation}>
                  <Locate size={14} /> Locate Me
                </button>
              </div>
              <div className="form-card-body">
                <div className="form-grid-3">
                  <div className="input-group">
                    <label>Province</label>
                    <select className="input-field" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value, district: '' })} required>
                      <option value="">Select Province</option>
                      {Object.keys(SRI_LANKA_LOCATIONS).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>District</label>
                    <select className="input-field" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} disabled={!form.province} required>
                      <option value="">Select District</option>
                      {form.province && SRI_LANKA_LOCATIONS[form.province].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>City</label>
                    <input className="input-field" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 4: PHOTO MANAGEMENT */}
            <div className="form-card animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="form-card-header">
                <Image size={20} />
                <h3>Photo Management</h3>
              </div>
              <div className="form-card-body">
                <div className="input-group full-width">
                  <label>Description</label>
                  <textarea className="input-field" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>

                {/* Existing Photos */}
                {existingPhotos.length > 0 && (
                  <div className="existing-photos-management">
                    <label>Current Photos (Drag to reorder)</label>
                    <Reorder.Group 
                      axis="y" 
                      values={existingPhotos} 
                      onReorder={setExistingPhotos}
                      className="photo-reorder-list"
                    >
                      {existingPhotos.map((photo, i) => (
                        <Reorder.Item 
                          key={photo.public_id || `photo-${i}`}
                          value={photo}
                          className="photo-reorder-item"
                        >
                          <div className="reorder-handle">
                            <MenuIcon size={18} />
                          </div>
                          <img src={getImageUrl(photo)} alt={`Vehicle ${i}`} />
                          <div className="photo-info">
                            <span>Photo {i + 1} {i === 0 && <Tag color="gold" style={{ marginLeft: '8px' }}>Cover</Tag>}</span>
                          </div>
                          <button type="button" className="photo-delete-badge-static" onClick={() => removeExistingPhoto(i)}>
                            <Trash2 size={16} />
                          </button>
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  </div>
                )}

                {/* New Photo Upload */}
                <div className="upload-dropzone" onClick={() => fileInputRef.current?.click()} style={{ marginTop: '1.5rem' }}>
                  <Image size={32} />
                  <p>Click to add more photos</p>
                  <input type="file" multiple accept="image/*" style={{ display: 'none' }} ref={fileInputRef} onChange={handlePhotoChange} />
                </div>
                
                {photos.length > 0 && (
                  <div className="photo-preview-list">
                    {photos.map((p, i) => (
                      <div key={i} className="photo-tag">
                        <span>{p.name}</span>
                        <button type="button" onClick={() => removeNewPhoto(i)}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={saveLoading} style={{ marginTop: '2rem' }}>
              {saveLoading ? 'Saving Changes...' : <><Save size={18} /> Update Vehicle Listing</>}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

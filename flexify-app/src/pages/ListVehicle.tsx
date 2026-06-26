import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { vehicleApi, type VehicleMake, type VehicleModel } from '../api';
import { Select as AntSelect, message } from 'antd';
import { Car, MapPin, DollarSign, Users, Settings, FileText, Image, ArrowRight, Locate, PenTool } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import SEO from '../components/SEO';
import imageCompression from 'browser-image-compression';
import './ListVehicle.css';

// Fix Leaflet's default icon path issues with React
L.Marker.prototype.options.icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

// Local fallback if API fails, though we primarily use dynamic data now


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

function LocationMarker({ position, setPosition }: any) {
  useMapEvents({
    click(e) {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });

  return position.lat === 0 && position.lng === 0 ? null : (
    <Marker position={[position.lat, position.lng]}></Marker>
  );
}

export default function ListVehicle() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

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
    driverOption: 'self-drive',
    driverPricePerDay: '',
    mobileNumber: '',
    weddingHiresSpecial: false
  });

  // Derived state for make/model selection
  const [selectedMake, setSelectedMake] = useState('');
  const [customMake, setCustomMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [customModel, setCustomModel] = useState('');

  const [photos, setPhotos] = useState<File[]>([]);

  // Map State defaults to Sri Lanka center
  const [position, setPosition] = useState({ lat: 7.8731, lng: 80.7718 });

  // Dynamic Makes/Models
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
      } catch (err) {
        console.error("Failed to load makes", err);
      } finally {
        setLoadingMakes(false);
      }
    };
    fetchMakes();
  }, []);

  useEffect(() => {
    const fetchModels = async () => {
      if (!selectedMake || selectedMake === 'Other') {
        setModels([]);
        return;
      }
      // Find the ID of the selected make
      const makeObj = makes.find((m: VehicleMake) => m.name === selectedMake);
      if (!makeObj) return;

      setLoadingModels(true);
      try {
        const data = await vehicleApi.getModels(makeObj._id);
        setModels(data);
      } catch (err) {
        console.error("Failed to load models", err);
      } finally {
        setLoadingModels(false);
      }
    };
    fetchModels();
  }, [selectedMake, makes]);

  // Sync internal Make/Model states to form output dynamically
  useEffect(() => {
    const finalMake = selectedMake === 'Other' ? customMake : selectedMake;
    const finalModel = selectedModel === 'Other' ? customModel : selectedModel;
    setForm(prev => ({ ...prev, make: finalMake, model: finalModel }));
  }, [selectedMake, customMake, selectedModel, customModel]);

  useEffect(() => {
    const finalAddress = [form.city, form.district, form.province, 'Sri Lanka'].filter(Boolean).join(', ');
    setForm(prev => ({ ...prev, address: finalAddress }));

    // Forward geocode when address changes (debounced)
    if (form.city || form.district) {
      const timer = setTimeout(async () => {
        try {
          const searchQuery = encodeURIComponent(finalAddress);
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}&limit=1`);
          const data = await res.json();
          if (data && data.length > 0) {
            setPosition({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
          }
        } catch (err) {
          console.error('Forward geocoding error:', err);
        }
      }, 1000); // 1-second debounce
      return () => clearTimeout(timer);
    }
  }, [form.province, form.district, form.city]);

  // Sync position to lat/lng logically
  useEffect(() => {
    setForm(prev => ({ ...prev, lat: position.lat.toString(), lng: position.lng.toString() }));
  }, [position]);

  // Pre-populate mobile number from user phone if available
  useEffect(() => {
    if (user && user.phone && !form.mobileNumber) {
      setForm(prev => ({ ...prev, mobileNumber: user.phone }));
    }
  }, [user]);

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      message.loading({ content: 'Getting your location...', key: 'locate', duration: 10 });
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition({ lat: latitude, lng: longitude });
        
        try {
          // Reverse Geocoding via Nominatim (Free OpenStreetMap API)
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
          const data = await response.json();
          
          if (data && data.address) {
            const addr = data.address;
            const city = addr.city || addr.town || addr.village || addr.suburb || '';
            const district = addr.state_district || addr.county || '';
            const state = addr.state || ''; // Province in Sri Lanka

            // Auto-fill logic
            let matchedProvince = '';
            let matchedDistrict = '';

            // Clean up district name (Nominatim often adds "District" suffix)
            const cleanDistrict = district.replace(' District', '').trim();

            Object.entries(SRI_LANKA_LOCATIONS).forEach(([prov, dists]) => {
              if (state.includes(prov) || dists.some(d => cleanDistrict.includes(d))) {
                matchedProvince = prov;
                if (dists.some(d => cleanDistrict.includes(d))) {
                  matchedDistrict = dists.find(d => cleanDistrict.includes(d)) || '';
                }
              }
            });

            setForm(prev => ({
              ...prev,
              province: matchedProvince || prev.province,
              district: matchedDistrict || prev.district,
              city: city || prev.city
            }));
            
            message.success({ content: `Location found: ${city || 'Your Area'}`, key: 'locate', duration: 3 });
          } else {
            message.success({ content: 'Location found!', key: 'locate', duration: 3 });
          }
        } catch (err) {
          console.error("Geocoding error", err);
          message.success({ content: 'Location found! (Could not determine address automatically)', key: 'locate', duration: 3 });
        }
      }, () => {
        message.error({ content: 'Failed to access your location. Please check your browser permissions.', key: 'locate', duration: 5 });
      });
    } else {
      message.error({ content: 'Geolocation is not supported by your browser.', key: 'locate', duration: 5 });
    }
  };

  const handleFeatureToggle = (featureId: string) => {
    setForm(prev => ({
      ...prev,
      features: prev.features.includes(featureId)
        ? prev.features.filter(id => id !== featureId)
        : [...prev.features, featureId]
    }));
  };

  if (!user) {
    return (
      <div className="static-page">
        <section className="static-hero">
          <div className="container">
            <h1>List Your Vehicle</h1>
            <p>Please sign in to list your vehicle</p>
          </div>
        </section>
        <div className="container" style={{ textAlign: 'center', padding: '3rem' }}>
          <a href="/auth" className="btn btn-primary btn-lg">Sign In to Continue</a>
        </div>
      </div>
    );
  }



  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const options = {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
        fileType: 'image/webp'
      };
      
      message.loading({ content: 'Compressing images to WebP for fast uploads...', key: 'compressing', duration: 10 });
      try {
        const compressedFiles = await Promise.all(
          files.map(async (file) => {
            try {
              const compressed = await imageCompression(file, options);
              // Attach metadata for size feedback
              Object.defineProperty(compressed, 'originalSize', { value: file.size, writable: true, enumerable: true });
              Object.defineProperty(compressed, 'compressedSize', { value: compressed.size, writable: true, enumerable: true });
              Object.defineProperty(compressed, 'savings', { value: Math.round(((file.size - compressed.size) / file.size) * 100), writable: true, enumerable: true });
              return compressed;
            } catch (err) {
              console.error('Compression error:', err);
              return file;
            }
          })
        );
        setPhotos(prev => [...prev, ...compressedFiles]);
        message.success({ content: 'Images compressed successfully!', key: 'compressing', duration: 3 });
      } catch (err) {
        message.error({ content: 'Error compressing some images', key: 'compressing', duration: 3 });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Quick validation
    if (!form.make || !form.model) {
      setError("Make and Model are required.");
      setLoading(false);
      return;
    }

    if (!form.mobileNumber || form.mobileNumber.trim() === '') {
      setError("Mobile Number is required.");
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        // Skip features here, we'll append it specifically
        if (key !== 'features') {
          formData.append(key, value);
        }
      });

      // Append complex fields specifically
      // Use JSON.stringify for complex objects so the backend can parse them safely
      formData.append('features', JSON.stringify(form.features));
      
      photos.forEach(photo => {
        formData.append('photos', photo);
      });

      await vehicleApi.createWithPhotos(formData);
      // Refresh user in background (non-blocking) so UI responds instantly
      refreshUser();
      message.success('Vehicle listed successfully! Redirecting to your vehicles...');

      // Redirect to dashboard vehicles tab after a brief delay
      setTimeout(() => {
        navigate('/dashboard?tab=vehicles');
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Error uploading vehicle');
      message.error(err.message || 'Error uploading vehicle');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="list-vehicle-page">
      <SEO 
        title="List Your Vehicle for Rent in Sri Lanka | Earn with Rentify"
        description="Turn your car, SUV, van or bike into an earning asset on Rentify.lk. Reach thousands of renters across Sri Lanka. Free listing, verified users, full control."
        keywords="list vehicle for rent Sri Lanka, rent out my car Colombo, earn from car rental Sri Lanka, peer to peer vehicle sharing"
        canonical="/list-vehicle"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "List Your Vehicle on Rentify",
          "description": "Register and list your vehicle for rent to start earning money.",
          "potentialAction": {
            "@type": "RegisterAction",
            "target": "https://rentify.lk/list-vehicle"
          }
        }}
      />
      <section className="static-hero">
        <div className="container" style={{ position: 'relative' }}>
          <h1>List Your Vehicle for Rent in Sri Lanka</h1>
          <p>Start earning by sharing your vehicle with renters</p>
        </div>
      </section>

      <section className="container list-vehicle-content">
        <div className="list-vehicle-wrapper">
          {error && <div className="auth-message error">{error}</div>}
          {success && <div className="auth-message success">{success}</div>}

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
                  <input className="input-field" placeholder="e.g. Spacious Family SUV" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
                
                <div className="form-grid-2">
                  <div className="input-group">
                    <label>Make</label>
                    <select
                      className="input-field"
                      value={selectedMake}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedMake(val);
                        setSelectedModel(''); 
                      }}
                      required
                    >
                      <option value="">Select Brand</option>
                      {makes.map((m: VehicleMake) => (
                        <option key={m._id} value={m.name}>{m.name}</option>
                      ))}
                      <option value="Other">Other / Suggest New</option>
                    </select>
                    {selectedMake === 'Other' && (
                      <input className="input-field mt-2" placeholder="Custom Make..." value={customMake} onChange={(e) => setCustomMake(e.target.value)} required />
                    )}
                  </div>
                  <div className="input-group">
                    <label>Model</label>
                    <select
                      className="input-field"
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      disabled={!selectedMake || (selectedMake === 'Other' && !customMake)}
                      required
                    >
                      <option value="">Select Model</option>
                      {models.map((m: VehicleModel) => (
                        <option key={m._id} value={m.name}>{m.name}</option>
                      ))}
                      <option value="Other">Other / Suggest New</option>
                    </select>
                    {(selectedModel === 'Other' || selectedMake === 'Other') && (
                      <input className="input-field mt-2" placeholder="Custom Model..." value={customModel} onChange={(e) => setCustomModel(e.target.value)} required />
                    )}
                  </div>
                </div>

                <div className="form-grid-3">
                  <div className="input-group">
                    <label>Year</label>
                    <input type="number" className="input-field" placeholder="2023" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} required />
                  </div>
                  <div className="input-group">
                    <label>Category</label>
                    <select
                      className="input-field"
                      value={form.serviceType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm(prev => ({
                          ...prev,
                          serviceType: val,
                          weddingHiresSpecial: val === 'Bike' ? false : prev.weddingHiresSpecial
                        }));
                      }}
                      required
                    >
                      <option value="">Select Category</option>
                      <option value="Car">Car</option>
                      <option value="SUV">SUV</option>
                      <option value="Van">Van</option>
                      <option value="Bike">Bike</option>
                      <option value="Truck">Truck</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Price / Day (LKR)</label>
                    <input type="number" className="input-field" placeholder="LKR / day" value={form.pricePerDay} onChange={(e) => setForm({ ...form, pricePerDay: e.target.value })} required />
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

                <div className="input-group">
                  <label>Mobile Number</label>
                  <input type="tel" className="input-field" placeholder="e.g. +94771234567" value={form.mobileNumber} onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })} required />
                </div>

                {form.serviceType !== 'Bike' && (
                  <div className="input-group">
                    <label>Wedding Special</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className={`km-preset-btn ${form.weddingHiresSpecial ? 'active' : ''}`}
                        onClick={() => setForm({ ...form, weddingHiresSpecial: !form.weddingHiresSpecial })}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1.2rem' }}
                      >
                        💍 {form.weddingHiresSpecial ? 'Yes, Available for Weddings' : 'Not for Weddings'}
                      </button>
                      <span className="km-limit-hint" style={{ margin: 0 }}>Select if this vehicle is available for premium wedding hires.</span>
                    </div>
                  </div>
                )}

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
                  {form.serviceType !== 'Bike' && (
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
                  )}
                  <div className="input-group">
                    <label>Engine Capacity</label>
                    <div className="km-limit-custom">
                      <input type="number" className="input-field" placeholder="e.g. 1500" value={form.engineCapacity} onChange={(e) => setForm({ ...form, engineCapacity: e.target.value })} min="0" inputMode="numeric" />
                      <span className="km-suffix">cc</span>
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Fuel Consumption</label>
                    <div className="km-limit-custom">
                      <input type="number" className="input-field" placeholder="e.g. 15" value={form.fuelConsumption} onChange={(e) => setForm({ ...form, fuelConsumption: e.target.value })} min="0" step="0.1" inputMode="decimal" />
                      <span className="km-suffix">km/L</span>
                    </div>
                  </div>
                </div>

                  {form.serviceType !== 'Bike' && (
                    <div className="features-group" style={{ marginBottom: '1.5rem' }}>
                      <label>Driver Options</label>
                      <p className="km-limit-hint" style={{ marginBottom: '1rem' }}>Specify if the vehicle is available for self-drive, with a driver, or both.</p>
                      
                      <div className="km-limit-input-row" style={{ marginBottom: form.driverOption !== 'self-drive' ? '1rem' : '0' }}>
                        <div className="km-limit-presets" style={{ width: '100%' }}>
                          <button
                            type="button"
                            className={`km-preset-btn ${form.driverOption === 'self-drive' ? 'active' : ''}`}
                            onClick={() => setForm({ ...form, driverOption: 'self-drive', driverPricePerDay: '' })}
                            style={{ flex: 1 }}
                          >
                            🚗 Self Drive
                          </button>
                          <button
                            type="button"
                            className={`km-preset-btn ${form.driverOption === 'with-driver' ? 'active' : ''}`}
                            onClick={() => setForm({ ...form, driverOption: 'with-driver' })}
                            style={{ flex: 1 }}
                          >
                            👨‍✈️ With Driver
                          </button>
                          <button
                            type="button"
                            className={`km-preset-btn ${form.driverOption === 'both' ? 'active' : ''}`}
                            onClick={() => setForm({ ...form, driverOption: 'both' })}
                            style={{ flex: 1 }}
                          >
                            ✅ Both Available
                          </button>
                        </div>
                      </div>

                      {form.driverOption !== 'self-drive' && (
                        <div className="extra-km-price-row" style={{ marginTop: '1rem' }}>
                          <div className="extra-km-label">
                            <span>👨‍✈️</span>
                            <div>
                              <label>Driver Price Per Day (LKR)</label>
                              <p className="km-limit-hint">Extra amount charged per day for the driver</p>
                            </div>
                          </div>
                          <div className="km-limit-custom">
                            <input
                              type="number"
                              className="input-field"
                              placeholder="e.g. 5000"
                              value={form.driverPricePerDay}
                              onChange={(e) => setForm({ ...form, driverPricePerDay: e.target.value })}
                              min="0"
                              required={form.driverOption !== 'self-drive'}
                            />
                            <span className="km-suffix">LKR/day</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

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
                  <Locate size={14} /> Use My Location
                </button>
              </div>
              <div className="form-card-body">
                <div className="form-grid-3">
                  <div className="input-group">
                    <label>Province</label>
                    <select 
                      className="input-field" 
                      value={form.province} 
                      onChange={(e) => setForm({ ...form, province: e.target.value, district: '' })} 
                      required
                    >
                      <option value="">Select Province</option>
                      {Object.keys(SRI_LANKA_LOCATIONS).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>District</label>
                    <select 
                      className="input-field" 
                      value={form.district} 
                      onChange={(e) => setForm({ ...form, district: e.target.value })} 
                      disabled={!form.province}
                      required
                    >
                      <option value="">Select District</option>
                      {form.province && SRI_LANKA_LOCATIONS[form.province].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>City / Town</label>
                    <input 
                      className="input-field" 
                      placeholder="Enter City" 
                      value={form.city} 
                      onChange={(e) => setForm({ ...form, city: e.target.value })} 
                      required 
                    />
                  </div>
                </div>
                {form.address && (
                  <p className="address-preview">
                    <strong>Full Address:</strong> {form.address}
                  </p>
                )}
              </div>
            </div>

            {/* SECTION 4: MEDIA & DESCRIPTION */}
            <div className="form-card animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="form-card-header">
                <Image size={20} />
                <h3>Media & Description</h3>
              </div>
              <div className="form-card-body">
                <div className="input-group full-width">
                  <label>Description</label>
                  <textarea className="input-field" rows={4} placeholder="Describe your vehicle's condition, features, and any other details..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>

                <div 
                  className="upload-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Image size={32} />
                  <p>Click to upload vehicle photos</p>
                  <p className="sub-text">PNG, JPG up to 10MB</p>
                  <input type="file" multiple accept="image/*" style={{ display: 'none' }} ref={fileInputRef} onChange={handlePhotoChange} />
                </div>
                
                {photos.length > 0 && (
                  <div className="photo-preview-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginTop: '1rem' }}>
                    {photos.map((p, i) => (
                      <div key={i} className="photo-tag" style={{ display: 'flex', flexDirection: 'column', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '12px', background: '#f8fafc', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px', color: '#334155' }}>
                            {p.name}
                          </span>
                          <button type="button" onClick={(e) => {
                            e.stopPropagation();
                            setPhotos(prev => prev.filter((_, index) => index !== i));
                          }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.25rem', padding: '0 4px', lineHight: 1 }}>×</button>
                        </div>
                        {((p as any).originalSize && (p as any).compressedSize) ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>
                                {Math.round((p as any).compressedSize / 1024)} KB
                              </span>
                              <span style={{ fontSize: '0.65rem', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '6px', fontWeight: 700 }}>
                                -{(p as any).savings}%
                              </span>
                            </div>
                            <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                              Original: {Math.round((p as any).originalSize / 1024)} KB (WebP converted)
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Size: {Math.round(p.size / 1024)} KB</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-full submit-vehicle-btn" disabled={loading}>
              {loading ? (
                <div className="loading-spinner-wrapper">
                  <div className="spinner-small"></div>
                  Listing Vehicle...
                </div>
              ) : (
                <>Create Listing <ArrowRight size={18} /></>
              )}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { vehicleApi } from '../api';
import { Car, MapPin, DollarSign, Users, Settings, FileText, Image, ArrowRight, Locate, PenTool, ArrowLeft } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './ListVehicle.css';

// Fix Leaflet's default icon path issues with React
L.Marker.prototype.options.icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const CAR_BRANDS: Record<string, string[]> = {
  Toyota: ['Camry', 'Corolla', 'RAV4', 'Highlander', 'Prius', 'Yaris', 'Tacoma'],
  Honda: ['Civic', 'Accord', 'CR-V', 'Pilot', 'Fit', 'HR-V'],
  Ford: ['F-150', 'Escape', 'Explorer', 'Focus', 'Mustang', 'Transit'],
  Tesla: ['Model S', 'Model 3', 'Model X', 'Model Y', 'Cybertruck'],
  BMW: ['3 Series', '4 Series', '5 Series', 'X3', 'X5', 'X7'],
  'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'GLC', 'GLE'],
  Audi: ['A3', 'A4', 'A6', 'Q3', 'Q5', 'Q7'],
  Chevrolet: ['Silverado', 'Equinox', 'Malibu', 'Cruze', 'Tahoe'],
  Nissan: ['Altima', 'Sentra', 'Rogue', 'Pathfinder', 'Leaf'],
  Hyundai: ['Elantra', 'Sonata', 'Tucson', 'Santa Fe', 'Kona'],
  Kia: ['Forte', 'Optima', 'Sportage', 'Sorento', 'Soul'],
  Volkswagen: ['Jetta', 'Passat', 'Tiguan', 'Atlas', 'Golf'],
  Other: [] // Used to show custom input
};

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
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
    description: '',
    address: '',
    lat: '',
    lng: ''
  });

  // Derived state for make/model selection
  const [selectedMake, setSelectedMake] = useState('');
  const [customMake, setCustomMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [customModel, setCustomModel] = useState('');

  const [photos, setPhotos] = useState<File[]>([]);
  
  // Map State
  const [position, setPosition] = useState({ lat: 40.7128, lng: -74.0060 }); // Default to NY or user can locate later

  // Sync internal Make/Model states to form output dynamically
  useEffect(() => {
    let finalMake = selectedMake === 'Other' ? customMake : selectedMake;
    let finalModel = selectedModel === 'Other' ? customModel : selectedModel;
    setForm(prev => ({ ...prev, make: finalMake, model: finalModel }));
  }, [selectedMake, customMake, selectedModel, customModel]);

  // Sync position to lat/lng logically
  useEffect(() => {
    setForm(prev => ({ ...prev, lat: position.lat.toString(), lng: position.lng.toString() }));
  }, [position]);

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, () => {
        alert("Failed to access your location. Please check your browser permissions.");
      });
    } else {
      alert("Geolocation is not supported by your browser.");
    }
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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos(Array.from(e.target.files));
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

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value);
      });
      
      photos.forEach(photo => {
        formData.append('photos', photo);
      });

      await vehicleApi.createWithPhotos(formData);
      
      setSuccess('Vehicle submitted successfully! Added to your dashboard as inactive (pending review).');
      
      // Reset form
      setForm({ title: '', make: '', model: '', year: '', pricePerDay: '', transmission: 'Automatic', fuelType: 'Petrol', seats: '4', description: '', address: '', lat: '', lng: '' });
      setSelectedMake('');
      setCustomMake('');
      setSelectedModel('');
      setCustomModel('');
      setPhotos([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      window.scrollTo(0, 0);

    } catch (err: any) {
      setError(err.message || 'Error uploading vehicle');
    } finally {
      setLoading(false);
    }
  };

  const modelsList = selectedMake && selectedMake !== 'Other' && CAR_BRANDS[selectedMake] ? CAR_BRANDS[selectedMake] : [];

  return (
    <div className="list-vehicle-page">
      <section className="static-hero">
        <div className="container" style={{ position: 'relative' }}>
          <button 
            onClick={() => window.history.back()} 
            className="btn btn-ghost" 
            style={{ position: 'absolute', left: '0', top: '-1rem', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ArrowLeft size={18} /> Back
          </button>
          <h1>List Your Vehicle</h1>
          <p>Start earning by sharing your vehicle with renters</p>
        </div>
      </section>
      <section className="container list-vehicle-content">
        <div className="list-vehicle-card card">
          {error && <div className="auth-message error">{error}</div>}
          {success && <div className="auth-message success">{success}</div>}
          <form onSubmit={handleSubmit} className="list-vehicle-form">
            <div className="form-row">
              <div className="input-group">
                <label><Car size={14} /> Vehicle Title</label>
                <input className="input-field" placeholder="e.g. Spacious Family SUV" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
            </div>
            
            {/* MAKE AND MODEL OVERHAUL */}
            <div className="form-row">
              <div className="input-group">
                <label><Settings size={14} /> Make</label>
                <select 
                  className="input-field" 
                  value={selectedMake} 
                  onChange={(e) => {
                    setSelectedMake(e.target.value);
                    setSelectedModel(''); // Reset model when make changes
                  }} 
                  required
                >
                  <option value="">Select Brand</option>
                  {Object.keys(CAR_BRANDS).map(brand => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
                {selectedMake === 'Other' && (
                  <input 
                    className="input-field animate-fade-in" 
                    placeholder="Enter custom Make..." 
                    value={customMake} 
                    onChange={(e) => setCustomMake(e.target.value)} 
                    style={{ marginTop: '0.5rem' }} 
                    required 
                  />
                )}
              </div>
              <div className="input-group">
                <label><PenTool size={14} /> Model</label>
                <select 
                  className="input-field" 
                  value={selectedModel} 
                  onChange={(e) => setSelectedModel(e.target.value)} 
                  required={selectedMake !== 'Other'}
                  disabled={!selectedMake || selectedMake === 'Other'}
                >
                  <option value="">Select Model</option>
                  {modelsList.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                  <option value="Other">Add Model / Other</option>
                </select>
                {(selectedModel === 'Other' || selectedMake === 'Other') && (
                  <input 
                    className="input-field animate-fade-in" 
                    placeholder="Enter custom Model..." 
                    value={customModel} 
                    onChange={(e) => setCustomModel(e.target.value)} 
                    style={{ marginTop: '0.5rem' }} 
                    required 
                  />
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="input-group">
                <label>Year</label>
                <input type="number" className="input-field" placeholder="2023" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} required />
              </div>
              <div className="input-group">
                <label><DollarSign size={14} /> Price per Day ($)</label>
                <input type="number" className="input-field" placeholder="45" value={form.pricePerDay} onChange={(e) => setForm({ ...form, pricePerDay: e.target.value })} required />
              </div>
            </div>
            
            <div className="form-row">
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
              <div className="input-group">
                <label><Users size={14} /> Seats</label>
                <select className="input-field" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} required>
                  <option value="2">2</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="7">7</option>
                  <option value="8">8+</option>
                </select>
              </div>
            </div>

            <div className="form-row" style={{ display: 'block', marginBottom: '1.5rem' }}>
              <div className="input-group" style={{ marginBottom: '1rem' }}>
                <label><MapPin size={14} /> Address Overview</label>
                <input className="input-field" placeholder="e.g. New York, NY" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleGetLocation} style={{ marginTop: '0.75rem', color: 'var(--primary-color)', alignSelf: 'flex-start' }}>
                  <Locate size={14} style={{ marginRight: '4px' }}/> Auto-Detect Location Pin
                </button>
              </div>
              
              <div className="input-group" style={{ position: 'relative' }}>
                <label style={{ marginBottom: '0.5rem' }}>Pinpoint Location <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(Tap map to drop pin)</span></label>
                <div style={{ height: '350px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative', zIndex: 0 }}>
                  <MapContainer key={`${position.lat}-${position.lng}`} center={[position.lat, position.lng]} zoom={11} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://carto.com/">CARTO</a>' />
                    <LocationMarker position={position} setPosition={setPosition} />
                  </MapContainer>
                </div>
              </div>
            </div>

            <div className="input-group">
              <label><FileText size={14} /> Description</label>
              <textarea className="input-field" rows={4} placeholder="Describe your vehicle..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            
            <div className="input-group">
              <label><Image size={14} /> Vehicle Photos</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--border-color)',
                  padding: '2.5rem',
                  borderRadius: '12px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'var(--bg-secondary)',
                  transition: 'all 0.2s ease'
                }}
                className="photo-upload-zone"
              >
                <div style={{ pointerEvents: 'none' }}>
                  <Image size={32} style={{ color: 'var(--primary-color)', marginBottom: '0.5rem', display: 'inline-block' }} />
                  <p style={{ fontWeight: '500', marginBottom: '4px' }}>Click to upload vehicle photos</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', margin: '0' }}>PNG, JPG, JPEG up to 10MB</p>
                </div>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={handlePhotoChange} 
                  ref={fileInputRef} 
                  required={photos.length === 0}
                />
              </div>
              {photos.length > 0 && (
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {photos.map((p, i) => (
                    <span key={i} className="badge badge-primary">{p.name}</span>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading} style={{ marginTop: '1rem' }}>
              {loading ? <span className="spinner" /> : <> Create Listing <ArrowRight size={18} /></>}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

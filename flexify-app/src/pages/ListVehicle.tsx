import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { vehicleApi } from '../api';
import { Car, MapPin, DollarSign, Users, Settings, FileText, Image, ArrowRight, Locate, PenTool } from 'lucide-react';
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

const SRI_LANKA_DISTRICTS: Record<string, string[]> = {
  Colombo: ['Colombo', 'Dehiwala', 'Mount Lavinia', 'Moratuwa', 'Maharagama', 'Nugegoda', 'Battaramulla', 'Malabe', 'Kottawa', 'Homagama'],
  Gampaha: ['Gampaha', 'Negombo', 'Kelaniya', 'Wattala', 'Kadawatha', 'Minuwangoda', 'Nittambuwa', 'Katunayake', 'Ragama', 'Ja-Ela'],
  Kalutara: ['Kalutara', 'Panadura', 'Horana', 'Matugama', 'Beruwala', 'Aluthgama', 'Bandaragama'],
  Kandy: ['Kandy', 'Peradeniya', 'Gampola', 'Nawalapitiya', 'Kadugannawa', 'Katugastota'],
  Galle: ['Galle', 'Hikkaduwa', 'Ambalangoda', 'Elpitiya', 'Karapitiya', 'Unawatuna'],
  Matara: ['Matara', 'Weligama', 'Dikwella', 'Akuressa', 'Deniyaya'],
  Kurunegala: ['Kurunegala', 'Kuliyapitiya', 'Narammala', 'Pannala', 'Mawathagama'],
  Jaffna: ['Jaffna', 'Chavakachcheri', 'Point Pedro', 'Nallur', 'Kopay'],
  Other: []
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
    serviceType: '',
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

  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedPlace, setSelectedPlace] = useState('');
  const [customPlace, setCustomPlace] = useState('');

  const [photos, setPhotos] = useState<File[]>([]);

  // Map State defaults to Sri Lanka center
  const [position, setPosition] = useState({ lat: 7.8731, lng: 80.7718 });

  // Sync internal Make/Model states to form output dynamically
  useEffect(() => {
    let finalMake = selectedMake === 'Other' ? customMake : selectedMake;
    let finalModel = selectedModel === 'Other' ? customModel : selectedModel;
    setForm(prev => ({ ...prev, make: finalMake, model: finalModel }));
  }, [selectedMake, customMake, selectedModel, customModel]);

  useEffect(() => {
    let finalPlace = selectedPlace === 'Other' ? customPlace : selectedPlace;
    let finalAddress = [finalPlace, selectedDistrict, 'Sri Lanka'].filter(Boolean).join(', ');
    setForm(prev => ({ ...prev, address: finalAddress }));
  }, [selectedDistrict, selectedPlace, customPlace]);

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

  if (!user.isKycVerified) {
    return (
      <div className="static-page">
        <section className="static-hero">
          <div className="container">
            <h1>Verification Required</h1>
            <p>You must verify your identity before listing a vehicle</p>
          </div>
        </section>
        <div className="container" style={{ textAlign: 'center', padding: '6rem 2rem' }}>
          <div className="card" style={{ maxWidth: '600px', margin: '0 auto', padding: '3rem' }}>
            <div style={{ color: 'var(--primary-color)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
              <Settings size={48} />
            </div>
            <h2>Account Verification Needed</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '1rem', marginBottom: '2rem' }}>
              To ensure the safety of our community, all vehicle owners must be verified by our staff.
              Please provide your identification documents to get started.
            </p>
            <Link to="/verify" className="btn btn-primary btn-full btn-lg">
              Start Verification
            </Link>
          </div>
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

      setSuccess('Vehicle submitted successfully! ' + (user.ownerType === 'VERIFIED' ? 'Your listing is now active.' : 'It will be reviewed by our team before going live.'));

      // Reset form
      setForm({ title: '', make: '', model: '', year: '', pricePerDay: '', transmission: 'Automatic', fuelType: 'Petrol', seats: '4', serviceType: '', description: '', address: '', lat: '', lng: '' });
      setSelectedMake('');
      setCustomMake('');
      setSelectedModel('');
      setCustomModel('');
      setSelectedDistrict('');
      setSelectedPlace('');
      setCustomPlace('');
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
          {/* Custom back button removed */}
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
                <label><DollarSign size={14} /> Price per Day (LKR)</label>
                <input type="number" className="input-field" placeholder="45" value={form.pricePerDay} onChange={(e) => setForm({ ...form, pricePerDay: e.target.value })} required />
              </div>
            </div>

            <div className="form-row">
              <div className="input-group">
                <label>Vehicle Category</label>
                <select className="input-field" value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })} required>
                  <option value="">Select Category</option>
                  <option value="Car">Car</option>
                  <option value="SUV">SUV</option>
                  <option value="Van">Van</option>
                  <option value="Bike">Bike</option>
                  <option value="Truck">Truck</option>
                </select>
              </div>
              <div className="input-group">
                <label>Transmission</label>
                <select className="input-field" value={form.transmission} onChange={(e) => setForm({ ...form, transmission: e.target.value })} required>
                  <option value="Automatic">Automatic</option>
                  <option value="Manual">Manual</option>
                </select>
              </div>
            </div>

            <div className="form-row">
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

            <div className="form-row" style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="input-group" style={{ flex: 1 }}>
                <label><MapPin size={14} /> District</label>
                <select
                  className="input-field"
                  value={selectedDistrict}
                  onChange={(e) => {
                    setSelectedDistrict(e.target.value);
                    setSelectedPlace('');
                  }}
                  required
                >
                  <option value="">Select District</option>
                  {Object.keys(SRI_LANKA_DISTRICTS).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="input-group" style={{ flex: 1 }}>
                <label><Locate size={14} /> City / Place</label>
                <select
                  className="input-field"
                  value={selectedPlace}
                  onChange={(e) => setSelectedPlace(e.target.value)}
                  required={selectedDistrict !== 'Other'}
                  disabled={!selectedDistrict || selectedDistrict === 'Other'}
                >
                  <option value="">Select Place</option>
                  {selectedDistrict && selectedDistrict !== 'Other' && SRI_LANKA_DISTRICTS[selectedDistrict].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                  <option value="Other">Add Place / Other</option>
                </select>
                {(selectedPlace === 'Other' || selectedDistrict === 'Other') && (
                  <input
                    className="input-field animate-fade-in"
                    placeholder="Enter custom place..."
                    value={customPlace}
                    onChange={(e) => setCustomPlace(e.target.value)}
                    style={{ marginTop: '0.5rem' }}
                    required
                  />
                )}
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: '1.5rem', position: 'relative' }}>
              <label style={{ marginBottom: '0.5rem' }}>Pinpoint EXACT Location (Sri Lanka ONLY)  <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(Tap map to drop pin)</span></label>

              <div style={{ height: '350px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative', zIndex: 0 }}>
                {/* PickMe Style Float Button */}
                <button
                  type="button"
                  onClick={handleGetLocation}
                  style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1000, background: '#fff', border: 'none', borderRadius: '8px', padding: '10px 15px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: 'var(--primary-color)' }}
                >
                  <Locate size={16} /> Locate Me
                </button>

                <MapContainer
                  key={`${position.lat === 7.8731 ? 'init' : 'located'}`}
                  center={[position.lat, position.lng]}
                  zoom={position.lat === 7.8731 ? 7 : 14}
                  style={{ height: '100%', width: '100%' }}
                  maxBounds={[[5.9, 79.5], [9.9, 81.9]]}
                  maxBoundsViscosity={1.0}
                  minZoom={7}
                >
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://carto.com/">CARTO</a>' />
                  <LocationMarker position={position} setPosition={setPosition} />
                </MapContainer>
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

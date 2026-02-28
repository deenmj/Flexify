import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { vehicleApi } from '../api';
import { Car, MapPin, DollarSign, Users, Settings, FileText, Image, ArrowRight, Locate, PenTool, ArrowLeft } from 'lucide-react';
import './ListVehicle.css';

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

  const [photos, setPhotos] = useState<File[]>([]);

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
    
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value);
      });
      
      photos.forEach(photo => {
        formData.append('photos', photo);
      });

      await vehicleApi.createWithPhotos(formData);
      
      setSuccess('Vehicle submitted successfully!');
      setForm({ title: '', make: '', model: '', year: '', pricePerDay: '', transmission: 'Automatic', fuelType: 'Petrol', seats: '4', description: '', address: '', lat: '', lng: '' });
      setPhotos([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setError(err.message || 'Error uploading vehicle');
    } finally {
      setLoading(false);
    }
  };

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
            <div className="form-row">
              <div className="input-group">
                <label><Settings size={14} /> Make</label>
                <input className="input-field" placeholder="e.g. Toyota" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} required />
              </div>
              <div className="input-group">
                <label><PenTool size={14} /> Model</label>
                <input className="input-field" placeholder="e.g. RAV4" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required />
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

            <div className="form-row">
              <div className="input-group">
                <label><MapPin size={14} /> Address / Location</label>
                <input className="input-field" placeholder="e.g. Colombo, Sri Lanka" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="input-group">
                <label><Locate size={14} /> Latitude</label>
                <input type="number" step="any" className="input-field" placeholder="6.9271" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
              </div>
              <div className="input-group">
                <label><Locate size={14} /> Longitude</label>
                <input type="number" step="any" className="input-field" placeholder="79.8612" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} />
              </div>
            </div>

            <div className="input-group">
              <label><FileText size={14} /> Description</label>
              <textarea className="input-field" rows={4} placeholder="Describe your vehicle..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="input-group">
              <label><Image size={14} /> Vehicle Photos (Upload files)</label>
              <input type="file" multiple accept="image/*" className="input-field" onChange={handlePhotoChange} ref={fileInputRef} />
              {photos.length > 0 && <span style={{fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px'}}>Selected {photos.length} files</span>}
            </div>
            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
              {loading ? <span className="spinner" /> : <> Create Listing <ArrowRight size={18} /></>}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { vehicleApi } from '../api';
import { Car, MapPin, DollarSign, Users, Settings, FileText, Image, ArrowRight } from 'lucide-react';
import './ListVehicle.css';

export default function ListVehicle() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    title: '',
    makeModel: '',
    year: '',
    pricePerDay: '',
    location: '',
    transmission: 'Auto',
    seats: '4',
    description: '',
    serviceType: 'Self Drive',
    images: '' as string,
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const images = form.images.split(',').map(s => s.trim()).filter(Boolean);
      await vehicleApi.create({
        title: form.title,
        makeModel: form.makeModel,
        year: form.year ? Number(form.year) : undefined,
        pricePerDay: Number(form.pricePerDay),
        location: { text: form.location },
        transmission: form.transmission,
        seats: Number(form.seats),
        description: form.description,
        serviceType: [form.serviceType],
        images,
      });
      setSuccess('Vehicle submitted for admin approval!');
      setForm({ title: '', makeModel: '', year: '', pricePerDay: '', location: '', transmission: 'Auto', seats: '4', description: '', serviceType: 'Self Drive', images: '' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="list-vehicle-page">
      <section className="static-hero">
        <div className="container">
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
                <input className="input-field" placeholder="e.g. Family SUV" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="input-group">
                <label><Settings size={14} /> Make & Model</label>
                <input className="input-field" placeholder="e.g. Toyota RAV4 2023" value={form.makeModel} onChange={(e) => setForm({ ...form, makeModel: e.target.value })} required />
              </div>
            </div>
            <div className="form-row">
              <div className="input-group">
                <label>Year</label>
                <input type="number" className="input-field" placeholder="2023" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
              </div>
              <div className="input-group">
                <label><DollarSign size={14} /> Price per Day ($)</label>
                <input type="number" className="input-field" placeholder="45" value={form.pricePerDay} onChange={(e) => setForm({ ...form, pricePerDay: e.target.value })} required />
              </div>
            </div>
            <div className="form-row">
              <div className="input-group">
                <label><MapPin size={14} /> Location</label>
                <input className="input-field" placeholder="e.g. Colombo, Sri Lanka" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Service Type</label>
                <select className="input-field" value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })}>
                  <option value="Self Drive">Self Drive</option>
                  <option value="Chauffeur">Chauffeur</option>
                  <option value="Transfer">Transfer</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="input-group">
                <label>Transmission</label>
                <select className="input-field" value={form.transmission} onChange={(e) => setForm({ ...form, transmission: e.target.value })}>
                  <option value="Auto">Automatic</option>
                  <option value="Manual">Manual</option>
                </select>
              </div>
              <div className="input-group">
                <label><Users size={14} /> Seats</label>
                <select className="input-field" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })}>
                  <option value="2">2</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="7">7</option>
                  <option value="8">8+</option>
                </select>
              </div>
            </div>
            <div className="input-group">
              <label><FileText size={14} /> Description</label>
              <textarea className="input-field" rows={4} placeholder="Describe your vehicle..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="input-group">
              <label><Image size={14} /> Image URLs (comma-separated)</label>
              <input className="input-field" placeholder="https://example.com/car1.jpg, https://example.com/car2.jpg" value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} />
            </div>
            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
              {loading ? <span className="spinner" /> : <> Submit for Approval <ArrowRight size={18} /></>}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

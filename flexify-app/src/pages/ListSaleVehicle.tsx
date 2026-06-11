import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { saleListingApi } from '../api';
import { Upload, X, Tag, Phone, MapPin, Gauge, Car, Fuel, Settings, Info } from 'lucide-react';
import { message } from 'antd';
import SEO from '../components/SEO';
import './ListSaleVehicle.css';

const SRI_LANKA_DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya', 'Galle', 'Matara', 'Hambantota',
  'Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla', 'Moneragala', 'Ratnapura', 'Kegalle'
];

const CONDITIONS = ['Brand New', 'Excellent', 'Good', 'Used'];
const FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Electric'];
const TRANSMISSIONS = ['Automatic', 'Manual'];

export default function ListSaleVehicle() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '',
    price: '',
    condition: '',
    mileage: '',
    city: '',
    contactPhone: user?.phone || '',
    description: '',
    fuelType: '',
    transmission: '',
    engineCapacity: '',
  });

  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalPhotos = photos.length + files.length;
    if (totalPhotos > 10) {
      message.warning('Maximum 10 photos allowed');
      return;
    }
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setPhotos(prev => [...prev, ...files]);
    setPhotoPreviews(prev => [...prev, ...newPreviews]);
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.title.trim()) newErrors.title = 'Title is required';
    if (!form.price || parseFloat(form.price) <= 0) newErrors.price = 'Valid price is required';
    if (!form.condition) newErrors.condition = 'Select a condition';
    if (!form.mileage || parseInt(form.mileage) < 0) newErrors.mileage = 'Valid mileage is required';
    if (!form.city) newErrors.city = 'Select a city/district';
    if (!form.contactPhone.trim()) newErrors.contactPhone = 'Contact phone is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('price', form.price);
      formData.append('condition', form.condition);
      formData.append('mileage', form.mileage);
      formData.append('city', form.city);
      formData.append('contactPhone', form.contactPhone);
      if (form.description) formData.append('description', form.description);
      if (form.fuelType) formData.append('fuelType', form.fuelType);
      if (form.transmission) formData.append('transmission', form.transmission);
      if (form.engineCapacity) formData.append('engineCapacity', form.engineCapacity);

      photos.forEach(photo => formData.append('photos', photo));

      await saleListingApi.create(formData);
      message.success('Vehicle listed for sale! It will be visible after admin approval.');
      navigate('/dashboard?tab=my-sales');
    } catch (err: any) {
      message.error(err.message || 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return (
    <div className="container" style={{ padding: '6rem 2rem', textAlign: 'center' }}>
      <h2>Please sign in to list a vehicle for sale</h2>
    </div>
  );

  return (
    <div className="list-sale-page">
      <SEO
        title="List Your Vehicle for Sale — Rentify.lk"
        description="Sell your vehicle on Rentify.lk completely free. List your car, van, or bike and reach thousands of buyers across Sri Lanka."
        noindex={true}
      />

      <div className="list-sale-container">
        <div className="list-sale-header">
          <div className="list-sale-badge"><Tag size={16} /> FOR SALE</div>
          <h1>Sell Your Vehicle</h1>
          <p>List your vehicle for sale completely free. Reach thousands of buyers across Sri Lanka.</p>
        </div>

        <form onSubmit={handleSubmit} className="list-sale-form">
          {/* ── Mandatory Fields ── */}
          <div className="form-section">
            <h3 className="form-section-title"><Info size={18} /> Vehicle Details</h3>

            <div className="form-group">
              <label htmlFor="sale-title">Title / Model <span className="required">*</span></label>
              <input id="sale-title" name="title" value={form.title} onChange={handleChange}
                placeholder="e.g. Toyota Corolla 2019 G Grade" className={errors.title ? 'input-error' : ''} />
              {errors.title && <span className="field-error">{errors.title}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="sale-price">Price (LKR) <span className="required">*</span></label>
                <input id="sale-price" name="price" type="number" value={form.price} onChange={handleChange}
                  placeholder="e.g. 4500000" className={errors.price ? 'input-error' : ''} />
                {errors.price && <span className="field-error">{errors.price}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="sale-condition">Condition <span className="required">*</span></label>
                <select id="sale-condition" name="condition" value={form.condition} onChange={handleChange}
                  className={errors.condition ? 'input-error' : ''}>
                  <option value="">Select condition</option>
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.condition && <span className="field-error">{errors.condition}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="sale-mileage"><Gauge size={16} /> Mileage (km) <span className="required">*</span></label>
                <input id="sale-mileage" name="mileage" type="number" value={form.mileage} onChange={handleChange}
                  placeholder="e.g. 45000" className={errors.mileage ? 'input-error' : ''} />
                {errors.mileage && <span className="field-error">{errors.mileage}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="sale-city"><MapPin size={16} /> Location / City <span className="required">*</span></label>
                <select id="sale-city" name="city" value={form.city} onChange={handleChange}
                  className={errors.city ? 'input-error' : ''}>
                  <option value="">Select district</option>
                  {SRI_LANKA_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                {errors.city && <span className="field-error">{errors.city}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="sale-phone"><Phone size={16} /> Contact Phone Number <span className="required">*</span></label>
              <input id="sale-phone" name="contactPhone" value={form.contactPhone} onChange={handleChange}
                placeholder="e.g. 0771234567" className={errors.contactPhone ? 'input-error' : ''} />
              {errors.contactPhone && <span className="field-error">{errors.contactPhone}</span>}
            </div>
          </div>

          {/* ── Optional Fields ── */}
          <div className="form-section">
            <h3 className="form-section-title"><Settings size={18} /> Additional Details <span className="optional-tag">Optional</span></h3>

            <div className="form-group">
              <label htmlFor="sale-desc">Description</label>
              <textarea id="sale-desc" name="description" value={form.description} onChange={handleChange}
                placeholder="Describe your vehicle's features, history, modifications..." rows={4} />
            </div>

            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="sale-fuel"><Fuel size={16} /> Fuel Type</label>
                <select id="sale-fuel" name="fuelType" value={form.fuelType} onChange={handleChange}>
                  <option value="">Select</option>
                  {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="sale-trans"><Car size={16} /> Transmission</label>
                <select id="sale-trans" name="transmission" value={form.transmission} onChange={handleChange}>
                  <option value="">Select</option>
                  {TRANSMISSIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="sale-engine">Engine Capacity</label>
                <input id="sale-engine" name="engineCapacity" value={form.engineCapacity} onChange={handleChange}
                  placeholder="e.g. 1500cc" />
              </div>
            </div>
          </div>

          {/* ── Photo Upload ── */}
          <div className="form-section">
            <h3 className="form-section-title"><Upload size={18} /> Photos <span className="optional-tag">Optional</span></h3>
            <p className="form-hint">Add up to 10 photos. High-quality photos attract more buyers.</p>

            <div className="photo-grid">
              {photoPreviews.map((src, i) => (
                <div key={i} className="photo-preview">
                  <img src={src} alt={`Preview ${i + 1}`} />
                  <button type="button" className="photo-remove" onClick={() => removePhoto(i)}>
                    <X size={14} />
                  </button>
                </div>
              ))}
              {photos.length < 10 && (
                <button type="button" className="photo-add" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={24} />
                  <span>Add Photo</span>
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotos} style={{ display: 'none' }} />
          </div>

          {/* ── Submit ── */}
          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? 'Publishing...' : 'Publish for Sale'}
          </button>
          <p className="submit-note">Your listing will be reviewed and approved by our team before going live.</p>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { vehicleApi, type VehicleMake, type VehicleModel, type Vehicle } from '../api';
import { Select as AntSelect, message } from 'antd';
import { Car, MapPin, DollarSign, Settings, Image, ArrowRight, Locate, Save } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
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

export default function EditVehicle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
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
    lng: '',
    engineCapacity: '',
    fuelConsumption: '',
    features: [] as string[],
    province: '',
    district: '',
    city: '',
    pricePerWeek: '',
    pricePerMonth: ''
  });

  const [selectedMake, setSelectedMake] = useState('');
  const [customMake, setCustomMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
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
        
        // Fill form
        setForm({
          title: vehicle.title,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year.toString(),
          pricePerDay: vehicle.pricePerDay.toString(),
          transmission: vehicle.transmission,
          fuelType: vehicle.fuelType,
          seats: vehicle.seats.toString(),
          serviceType: (vehicle.serviceType && vehicle.serviceType[0]) || '',
          description: vehicle.description || '',
          address: vehicle.location?.address || '',
          lat: (vehicle.location?.coordinates?.[1] || 7.8731).toString(),
          lng: (vehicle.location?.coordinates?.[0] || 80.7718).toString(),
          engineCapacity: vehicle.engineCapacity || '',
          fuelConsumption: vehicle.fuelConsumption || '',
          features: vehicle.features || [],
          province: vehicle.province || '',
          district: vehicle.district || '',
          city: vehicle.city || '',
          pricePerWeek: vehicle.pricePerWeek?.toString() || '',
          pricePerMonth: vehicle.pricePerMonth?.toString() || ''
        });

        setSelectedMake(vehicle.make);
        setSelectedModel(vehicle.model);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaveLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value);
      });
      formData.append('features', JSON.stringify(form.features));
      
      // If no new photos uploaded, we should still keep the existing ones
      // This depends on how the backend handles PUT. Usually we send existing photos as strings too.
      formData.append('existingPhotos', JSON.stringify(existingPhotos));

      photos.forEach(photo => {
        formData.append('photos', photo);
      });

      await vehicleApi.updateWithPhotos(id, formData);
      message.success('Vehicle details updated successfully');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error updating vehicle');
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) return <div className="container section-padding">Loading vehicle details...</div>;

  return (
    <div className="list-vehicle-page">
      <section className="static-hero">
        <div className="container">
          <h1>Edit Vehicle</h1>
          <p>Update your vehicle information and pricing</p>
        </div>
      </section>

      <section className="container list-vehicle-content">
        <div className="list-vehicle-wrapper">
          {error && <div className="auth-message error">{error}</div>}
          
          <form onSubmit={handleSubmit} className="list-vehicle-form-refined">
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
                      className="antd-select-full"
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
                      className="antd-select-full"
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
              </div>
            </div>

            <div className="form-card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="form-card-header">
                <Settings size={20} />
                <h3>Specifications & Description</h3>
              </div>
              <div className="form-card-body">
                <div className="input-group full-width">
                  <label>Description</label>
                  <textarea className="input-field" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                
                <div className="features-group">
                  <label>Features</label>
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

            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={saveLoading}>
              {saveLoading ? 'Saving Changes...' : <><Save size={18} /> Update Listing</>}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

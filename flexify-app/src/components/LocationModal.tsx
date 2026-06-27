import React, { useState, useEffect, useRef } from 'react';
import { Locate, Search, X, MapPin } from 'lucide-react';
import './LocationModal.css';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (lat: string, lng: string, addressName: string) => void;
}

interface SearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
}

export default function LocationModal({ isOpen, onClose, onSelect }: LocationModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState('');
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setQuery('');
      setResults([]);
      setError('');
      setIsLocating(false);
    }
  }, [isOpen]);

  const searchNominatim = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    
    setIsSearching(true);
    setError('');
    try {
      // Limit to Sri Lanka to prevent accidental global selections
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=lk&limit=5`
      );
      const data = await response.json();
      setResults(data || []);
      if (data.length === 0) {
        setError('No places found. Try another search term.');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      setError('Failed to search locations. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchNominatim(val);
    }, 500); // 500ms debounce
  };

  const handleUseCurrentLocation = () => {
    setError('');
    setIsLocating(true);
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude.toString();
        const lng = pos.coords.longitude.toString();
        
        try {
          // Reverse geocode to get a nice name for the UI
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`
          );
          const data = await response.json();
          let placeName = 'My Location';
          
          if (data && data.address) {
            placeName = data.address.city || data.address.town || data.address.village || data.address.county || 'My Location';
          }
          
          setIsLocating(false);
          onSelect(lat, lng, placeName);
        } catch (err) {
          // Fallback if reverse geocoding fails but we have coords
          setIsLocating(false);
          onSelect(lat, lng, 'My Location');
        }
      },
      (err) => {
        setIsLocating(false);
        setError('Could not get your location. Please check browser permissions or search manually.');
        console.error(err);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSelectResult = (result: SearchResult) => {
    // Simplify the display name (Nominatim results are very long)
    const parts = result.display_name.split(', ');
    const shortName = parts.length > 0 ? parts[0] : 'Selected Location';
    
    onSelect(result.lat, result.lon, shortName);
  };

  if (!isOpen) return null;

  return (
    <div className="location-modal-overlay" onClick={onClose}>
      <div className="location-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="location-modal-header">
          <h3>Set Your Location</h3>
          <button className="location-modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        
        <div className="location-modal-body">
          <button 
            className="btn-use-current-location" 
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
          >
            <Locate size={18} className={isLocating ? 'spinning' : ''} />
            {isLocating ? 'Locating...' : 'Use My Current Location'}
          </button>
          
          <div className="location-modal-divider">
            <span>OR</span>
          </div>
          
          <div className="location-search-container">
            <div className="location-input-wrapper">
              <Search size={18} className="location-search-icon" />
              <input
                type="text"
                placeholder="Search city or place (e.g., Akurana)"
                value={query}
                onChange={handleInputChange}
                className="location-search-input"
                autoFocus
              />
            </div>
            
            {error && <div className="location-error-msg">{error}</div>}
            
            <div className="location-results-list">
              {isSearching ? (
                <div className="location-searching">Searching...</div>
              ) : (
                results.map((result) => (
                  <div 
                    key={result.place_id} 
                    className="location-result-item"
                    onClick={() => handleSelectResult(result)}
                  >
                    <MapPin size={16} className="result-icon" />
                    <span className="result-text">{result.display_name}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

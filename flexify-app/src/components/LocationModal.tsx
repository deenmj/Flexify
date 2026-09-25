import React, { useState, useEffect, useRef } from 'react';
import { Locate, Search, X, MapPin } from 'lucide-react';
import './LocationModal.css';

// Sri Lanka province/district mapping for reverse geocode matching
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

export interface LocationAddressDetails {
  province: string;
  district: string;
  city: string;
  fullAddress: string;
}

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (lat: string, lng: string, addressName: string, addressDetails?: LocationAddressDetails) => void;
  title?: string;
}

interface SearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  address?: any;
}

/**
 * Given a Nominatim address object, extract province and district
 * by matching against the known Sri Lanka location map.
 * Priority for city/town: city > town > municipality > city_district > village > suburb
 */
function extractProvinceDistrict(address: any): { province: string; district: string; city: string } {
  const city =
    address.city ||
    address.town ||
    address.municipality ||
    address.city_district ||
    address.village ||
    address.suburb ||
    '';
  const rawDistrict = address.state_district || address.county || '';
  const state = address.state || '';

  const cleanDistrict = rawDistrict.replace(' District', '').trim();

  let matchedProvince = '';
  let matchedDistrict = '';

  Object.entries(SRI_LANKA_LOCATIONS).forEach(([prov, dists]) => {
    if (state.includes(prov) || dists.some(d => cleanDistrict.includes(d))) {
      matchedProvince = prov;
      const found = dists.find(d => cleanDistrict.includes(d));
      if (found) matchedDistrict = found;
    }
  });

  return { province: matchedProvince, district: matchedDistrict, city };
}

export default function LocationModal({ isOpen, onClose, onSelect, title }: LocationModalProps) {
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
      // Limit to Sri Lanka; include addressdetails=1 to get structured address in search results
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=lk&limit=5&addressdetails=1`
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
          // Reverse geocode with zoom=14 to get broader town/city instead of micro-suburb
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`
          );
          const data = await response.json();
          let placeName = 'My Location';
          let addressDetails: LocationAddressDetails | undefined;
          
          if (data && data.address) {
            const { province, district, city } = extractProvinceDistrict(data.address);
            placeName = city || district || province || 'My Location';
            
            addressDetails = {
              province,
              district,
              city,
              fullAddress: data.display_name || [city, district, province, 'Sri Lanka'].filter(Boolean).join(', ')
            };
          }
          
          setIsLocating(false);
          onSelect(lat, lng, placeName, addressDetails);
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
    // Use the search result's own name as the primary location name.
    // This avoids the bug where a redundant reverse geocode at zoom=18
    // would overwrite the user's selected place (e.g. "Akurana") with
    // a hyper-local sub-area (e.g. "Konakalagala").
    const primaryName = result.name || result.display_name.split(', ')[0] || 'Selected Location';

    if (result.address) {
      // We already have structured address data from the search (addressdetails=1)
      const { province, district, city } = extractProvinceDistrict(result.address);
      const addressDetails: LocationAddressDetails = {
        province,
        district,
        // Use the extracted city if available, otherwise fall back to the result's own name
        city: city || primaryName,
        fullAddress: result.display_name
      };
      onSelect(result.lat, result.lon, primaryName, addressDetails);
    } else {
      // Fallback: no address details available (shouldn't happen with addressdetails=1)
      onSelect(result.lat, result.lon, primaryName);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="location-modal-overlay" onClick={onClose}>
      <div className="location-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="location-modal-header">
          <h3>{title || 'Set Your Location'}</h3>
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


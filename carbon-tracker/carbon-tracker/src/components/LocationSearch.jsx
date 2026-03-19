import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { geocodeLocation } from '../utils/carbonUtils';

export default function LocationSearch({ value, onChange, placeholder = 'Ville, pays...' }) {
  const [query, setQuery] = useState(value?.shortName || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (value?.shortName) setQuery(value.shortName);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleInput(e) {
    const q = e.target.value;
    setQuery(q);
    onChange(null); // clear selected while typing

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (q.length < 2) { setSuggestions([]); setOpen(false); return; }

    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await geocodeLocation(q);
        setSuggestions(results.slice(0, 6));
        setOpen(true);
      } catch (err) {
        console.error('Geocoding error:', err);
      }
      setLoading(false);
    }, 400);
  }

  function selectSuggestion(loc) {
    setQuery(loc.shortName || loc.name.split(',').slice(0, 2).join(','));
    onChange(loc);
    setSuggestions([]);
    setOpen(false);
  }

  function clearInput() {
    setQuery('');
    onChange(null);
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div className="location-search-wrapper" ref={wrapperRef}>
      <div style={{ position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          style={{ paddingLeft: 36, paddingRight: 36 }}
        />
        {(query || value) && (
          <button
            onClick={clearInput}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className="location-suggestions">
          {loading && <div style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Recherche...</div>}
          {suggestions.map((loc, i) => (
            <div key={i} className="suggestion-item" onClick={() => selectSuggestion(loc)}>
              <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{loc.shortName || loc.name.split(',').slice(0, 2).join(',')}</div>
              <div className="suggestion-country">{loc.name.split(',').slice(2).join(',').trim()}</div>
            </div>
          ))}
        </div>
      )}

      {value && (
        <div style={{ marginTop: 4, fontSize: '0.72rem', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
          ✓ {value.lat.toFixed(4)}, {value.lon.toFixed(4)}
        </div>
      )}
    </div>
  );
}

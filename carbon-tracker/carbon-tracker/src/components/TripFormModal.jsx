import { useState, useEffect } from 'react';
import { X, ArrowRight, Zap } from 'lucide-react';
import LocationSearch from './LocationSearch';
import {
  TRANSPORT_MODES,
  FREQUENCY_OPTIONS,
  haversineDistance,
  calculateEmissions,
  formatEmissions,
} from '../utils/carbonUtils';

const defaultForm = {
  departure: null,
  arrival: null,
  transport: 'train',
  fuelType: 'essence',
  frequency: 'quotidien_5j',
  customFrequency: '',
  roundTrip: true,
  notes: '',
};

export default function TripFormModal({ onClose, onSave, initialData = null, tripType = 'daily' }) {
  const [form, setForm] = useState(initialData || defaultForm);
  const [distance, setDistance] = useState(0);
  const [emissions, setEmissions] = useState({ perTrip: 0, perYear: 0, distancePerYear: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (form.departure && form.arrival) {
      const dist = haversineDistance(
        form.departure.lat, form.departure.lon,
        form.arrival.lat, form.arrival.lon
      );
      const d = form.roundTrip ? dist * 2 : dist;
      setDistance(d);
      setEmissions(calculateEmissions(d, form.transport, form.fuelType, form.frequency, parseInt(form.customFrequency)));
    }
  }, [form]);

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.departure || !form.arrival) return;
    setSaving(true);
    const tripData = {
      ...form,
      distance,
      emissions,
      tripType,
      createdAt: new Date().toISOString(),
    };
    await onSave(tripData);
    setSaving(false);
  }

  const mode = TRANSPORT_MODES[form.transport];
  const canSave = form.departure && form.arrival && distance > 0;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <h3>
            {tripType === 'daily' ? '🏠 Trajet quotidien' : '✈️ Trajet exceptionnel'}
            {initialData ? ' — Modifier' : ' — Ajouter'}
          </h3>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '6px' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Locations */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'end' }}>
            <div className="form-group">
              <label>Point de départ</label>
              <LocationSearch
                value={form.departure}
                onChange={loc => set('departure', loc)}
                placeholder="Ville de départ..."
              />
            </div>
            <ArrowRight size={20} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
            <div className="form-group">
              <label>Destination</label>
              <LocationSearch
                value={form.arrival}
                onChange={loc => set('arrival', loc)}
                placeholder="Ville d'arrivée..."
              />
            </div>
          </div>

          {/* Round trip */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textTransform: 'none', letterSpacing: 0 }}>
            <input
              type="checkbox"
              checked={form.roundTrip}
              onChange={e => set('roundTrip', e.target.checked)}
              style={{ width: 'auto', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Aller-retour (la distance sera doublée)
            </span>
          </label>

          {/* Distance preview */}
          {distance > 0 && (
            <div style={{
              background: 'rgba(45,212,191,0.08)',
              border: '1px solid rgba(45,212,191,0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <Zap size={16} color="var(--green)" />
              <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: '0.9rem' }}>
                Distance calculée : <strong>{distance.toLocaleString('fr-FR')} km</strong>
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                (vol à vol d'oiseau)
              </span>
            </div>
          )}

          <hr className="divider" />

          {/* Transport */}
          <div className="form-group">
            <label>Mode de transport</label>
            <select value={form.transport} onChange={e => set('transport', e.target.value)}>
              {Object.entries(TRANSPORT_MODES).map(([key, m]) => (
                <option key={key} value={key}>{m.icon} {m.label}</option>
              ))}
            </select>
          </div>

          {/* Fuel type for car */}
          {mode?.needsFuel && (
            <div className="form-group">
              <label>Type de carburant</label>
              <select value={form.fuelType} onChange={e => set('fuelType', e.target.value)}>
                {mode.fuelTypes.map(f => (
                  <option key={f} value={f}>
                    {f === 'essence' ? 'Essence' :
                      f === 'diesel' ? 'Diesel' :
                        f === 'hybride' ? 'Hybride' : 'Électrique'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Frequency */}
          <div className="form-group">
            <label>Fréquence</label>
            <select value={form.frequency} onChange={e => set('frequency', e.target.value)}>
              {FREQUENCY_OPTIONS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {form.frequency === 'custom' && (
            <div className="form-group">
              <label>Nombre de fois par an</label>
              <input
                type="number"
                min="1"
                max="730"
                value={form.customFrequency}
                onChange={e => set('customFrequency', e.target.value)}
                placeholder="Ex: 30"
              />
            </div>
          )}

          {/* Notes */}
          <div className="form-group">
            <label>Notes (optionnel)</label>
            <input
              type="text"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Ex: Trajet domicile-travail"
            />
          </div>

          {/* Emissions preview */}
          {distance > 0 && (
            <div style={{
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius)',
              padding: '20px',
              border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>
                Estimation carbone
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <div>
                  <div style={{ fontSize: '1.3rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {formatEmissions(emissions.perTrip)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Par trajet</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.3rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--accent)' }}>
                    {formatEmissions(emissions.perYear)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Par an</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.3rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text-secondary)' }}>
                    {emissions.distancePerYear?.toLocaleString('fr-FR')} km
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Distance/an</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!canSave || saving}
          >
            {saving ? 'Enregistrement...' : initialData ? 'Mettre à jour' : 'Ajouter ce trajet'}
          </button>
        </div>
      </div>
    </div>
  );
}

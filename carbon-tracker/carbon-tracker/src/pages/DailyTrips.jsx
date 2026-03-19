import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { TRANSPORT_MODES, formatEmissions } from '../utils/carbonUtils';
import TripFormModal from '../components/TripFormModal';
import TripMap from '../components/TripMap';
import { Plus, Edit2, Trash2, Info } from 'lucide-react';

export default function DailyTrips() {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editTrip, setEditTrip] = useState(null);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrips();
  }, [user]);

  async function loadTrips() {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'trips'),
        where('userId', '==', user.uid),
        where('tripType', '==', 'daily')
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTrips(data);
    } catch (e) {
      console.error('Error loading trips:', e);
    }
    setLoading(false);
  }

  async function handleSave(tripData) {
    try {
      if (editTrip) {
        await updateDoc(doc(db, 'trips', editTrip.id), { ...tripData, updatedAt: new Date().toISOString() });
      } else {
        await addDoc(collection(db, 'trips'), {
          ...tripData,
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName,
        });
      }
      setShowModal(false);
      setEditTrip(null);
      loadTrips();
    } catch (e) {
      console.error('Error saving trip:', e);
    }
  }

  async function handleDelete(tripId) {
    if (!confirm('Supprimer ce trajet ?')) return;
    await deleteDoc(doc(db, 'trips', tripId));
    setTrips(trips.filter(t => t.id !== tripId));
    if (selectedTripId === tripId) setSelectedTripId(null);
  }

  const totalEmissionsPerYear = trips.reduce((sum, t) => sum + (t.emissions?.perYear || 0), 0);
  const totalDistancePerYear = trips.reduce((sum, t) => sum + (t.emissions?.distancePerYear || 0), 0);

  return (
    <div>
      <div className="flex-between mb-24">
        <div>
          <h1>Trajets quotidiens</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: '0.88rem' }}>
            Vos trajets réguliers — domicile-travail, courses, école...
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditTrip(null); setShowModal(true); }}>
          <Plus size={18} /> Ajouter un trajet
        </button>
      </div>

      {/* Stats */}
      <div className="stat-grid mb-24">
        <div className="stat-card">
          <div className="stat-label">Trajets quotidiens</div>
          <div className="stat-value">{trips.length}</div>
        </div>
        <div className="stat-card" style={{ '--accent': 'var(--orange)' }}>
          <div className="stat-label">Émissions / an</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{formatEmissions(totalEmissionsPerYear)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Distance / an</div>
          <div className="stat-value">{totalDistancePerYear.toLocaleString('fr-FR')} km</div>
        </div>
      </div>

      {/* Info banner */}
      <div className="alert alert-info mb-24" style={{ alignItems: 'flex-start' }}>
        <Info size={16} style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: '0.82rem' }}>
          <strong>Trajets récurrents</strong> — Ces trajets seront automatiquement pré-remplis au prochain formulaire semestriel.
          Exemples : domicile → bureau, maison → école, courses hebdomadaires.
        </div>
      </div>

      {/* Map */}
      {trips.length > 0 && (
        <div className="map-container mb-24">
          <TripMap trips={trips} selectedTripId={selectedTripId} height={320} />
        </div>
      )}

      {/* Trips list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : trips.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🚶</div>
          <h3>Aucun trajet quotidien</h3>
          <p>Ajoutez vos trajets réguliers pour calculer votre bilan carbone.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>
            <Plus size={16} /> Ajouter mon premier trajet
          </button>
        </div>
      ) : (
        <div>
          {trips.map(trip => {
            const mode = TRANSPORT_MODES[trip.transport];
            return (
              <div
                key={trip.id}
                className="trip-item"
                style={{ borderColor: selectedTripId === trip.id ? 'var(--border-active)' : undefined }}
                onClick={() => setSelectedTripId(selectedTripId === trip.id ? null : trip.id)}
              >
                <div className="trip-icon" style={{ background: `${mode?.color}22` }}>
                  {mode?.icon || '🚗'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="trip-route">
                    {trip.departure?.shortName || '?'} → {trip.arrival?.shortName || '?'}
                  </div>
                  <div className="trip-meta">
                    {mode?.label} · {trip.distance?.toLocaleString('fr-FR')} km
                    {trip.roundTrip ? ' (A/R)' : ''} ·{' '}
                    {FREQUENCY_OPTIONS_LABEL[trip.frequency] || trip.frequency}
                    {trip.notes ? ` · ${trip.notes}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="trip-emissions" style={{ color: 'var(--accent)' }}>
                    {formatEmissions(trip.emissions?.perYear || 0)}<span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.72rem' }}>/an</span>
                  </div>
                  <div className="trip-dist">{(trip.emissions?.distancePerYear || 0).toLocaleString('fr-FR')} km/an</div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setEditTrip(trip); setShowModal(true); }}>
                    <Edit2 size={14} />
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleDelete(trip.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <TripFormModal
          tripType="daily"
          initialData={editTrip}
          onClose={() => { setShowModal(false); setEditTrip(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

const FREQUENCY_OPTIONS_LABEL = {
  unique: 'Trajet unique',
  quotidien_5j: 'Quotidien (5j/sem)',
  quotidien_7j: 'Quotidien (7j/sem)',
  hebdo: '1×/semaine',
  bi_hebdo: '2×/semaine',
  mensuel: '1×/mois',
  trimestriel: 'Trimestriel',
  semestriel: 'Semestriel',
  annuel: 'Annuel',
};

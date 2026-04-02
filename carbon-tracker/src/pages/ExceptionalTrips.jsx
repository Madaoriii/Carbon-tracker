import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { TRANSPORT_MODES, formatEmissions } from '../utils/carbonUtils';
import TripFormModal from '../components/TripFormModal';
import TripMap from '../components/TripMap';
import { Plus, Edit2, Trash2, Globe } from 'lucide-react';

export default function ExceptionalTrips() {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editTrip, setEditTrip] = useState(null);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadTrips(); }, [user]);

  async function loadTrips() {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'trips'),
        where('userId', '==', user.uid),
        where('tripType', '==', 'exceptional')
      );
      const snap = await getDocs(q);
      setTrips(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
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
    } catch (e) { console.error(e); }
  }

  async function handleDelete(tripId) {
    if (!confirm('Supprimer ce trajet ?')) return;
    await deleteDoc(doc(db, 'trips', tripId));
    setTrips(trips.filter(t => t.id !== tripId));
    if (selectedTripId === tripId) setSelectedTripId(null);
  }

  const totalEmissions = trips.reduce((sum, t) => sum + (t.emissions?.perYear || 0), 0);
  const totalDistance = trips.reduce((sum, t) => sum + (t.emissions?.distancePerYear || t.distance || 0), 0);

  return (
    <div>
      <div className="flex-between mb-24">
        <div>
          <h1>Trajets exceptionnels</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: '0.88rem' }}>
            Voyages, déplacements professionnels, vacances...
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditTrip(null); setShowModal(true); }}>
          <Plus size={18} /> Ajouter un trajet
        </button>
      </div>

      <div className="stat-grid mb-24">
        <div className="stat-card">
          <div className="stat-label">Trajets exceptionnels</div>
          <div className="stat-value">{trips.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Émissions totales</div>
          <div className="stat-value" style={{ color: 'var(--orange)' }}>{formatEmissions(totalEmissions)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Distance totale</div>
          <div className="stat-value">{totalDistance.toLocaleString('fr-FR')} km</div>
        </div>
      </div>

      {trips.length > 0 && (
        <div className="map-container mb-24">
          <TripMap trips={trips} selectedTripId={selectedTripId} height={360} />
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : trips.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Globe size={48} color="var(--text-muted)" /></div>
          <h3>Aucun trajet exceptionnel</h3>
          <p>Ajoutez vos voyages, week-ends, déplacements professionnels...</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>
            <Plus size={16} /> Ajouter un trajet
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
                  {mode?.icon || '✈️'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="trip-route">
                    {trip.departure?.shortName || '?'} → {trip.arrival?.shortName || '?'}
                  </div>
                  <div className="trip-meta">
                    {mode?.label} · {trip.distance?.toLocaleString('fr-FR')} km{trip.roundTrip ? ' (A/R)' : ''}
                    {trip.notes ? ` · ${trip.notes}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="trip-emissions" style={{ color: 'var(--accent)' }}>
                    {formatEmissions(trip.emissions?.perYear || 0)}<span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 400 }}>/an</span>
                  </div>
                  <div className="trip-dist">{trip.distance?.toLocaleString('fr-FR')} km/trajet</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
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
          tripType="exceptional"
          initialData={editTrip}
          onClose={() => { setShowModal(false); setEditTrip(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

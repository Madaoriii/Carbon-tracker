import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { TRANSPORT_MODES, formatEmissions, getEmissionColor } from '../utils/carbonUtils';
import TripMap from '../components/TripMap';
import { MapPin, Wind, Route } from 'lucide-react';

export default function Summary() {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [globalAvg, setGlobalAvg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [user]);

  async function loadData() {
    setLoading(true);
    try {
      // User trips
      const userQ = query(collection(db, 'trips'), where('userId', '==', user.uid));
      const userSnap = await getDocs(userQ);
      const userTrips = userSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTrips(userTrips);

      // Global average - aggregate from all users
      const allSnap = await getDocs(collection(db, 'trips'));
      const allTrips = allSnap.docs.map(d => d.data());

      // Group by user
      const byUser = {};
      allTrips.forEach(t => {
        if (!byUser[t.userId]) byUser[t.userId] = 0;
        byUser[t.userId] += (t.emissions?.perYear || 0);
      });

      const totals = Object.values(byUser);
      if (totals.length > 0) {
        setGlobalAvg(totals.reduce((a, b) => a + b, 0) / totals.length);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  const dailyTrips = trips.filter(t => t.tripType === 'daily');
  const exceptionalTrips = trips.filter(t => t.tripType === 'exceptional');

  const myTotalEmissions = trips.reduce((sum, t) => sum + (t.emissions?.perYear || 0), 0);
  const myTotalDistance = trips.reduce((sum, t) => sum + (t.emissions?.distancePerYear || t.distance || 0), 0);

  const emissionColor = getEmissionColor(myTotalEmissions);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;
  }

  return (
    <div>
      <div className="mb-24">
        <h1>Récapitulatif</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: '0.88rem' }}>
          Vue d'ensemble de tous vos déplacements
        </p>
      </div>

      {/* Stats */}
      <div className="stat-grid mb-24">
        <div className="stat-card" style={{ '--accent': emissionColor }}>
          <div className="stat-label">Mon bilan carbone / an</div>
          <div className="stat-value" style={{ color: emissionColor }}>{formatEmissions(myTotalEmissions)}</div>
          <div className="stat-sub">Tous transports confondus</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Distance totale / an</div>
          <div className="stat-value">{myTotalDistance.toLocaleString('fr-FR')} km</div>
          <div className="stat-sub">{trips.length} trajets enregistrés</div>
        </div>

        {globalAvg !== null && (
          <div className="stat-card">
            <div className="stat-label">Moyenne des répondants</div>
            <div className="stat-value" style={{ color: 'var(--text-secondary)' }}>{formatEmissions(globalAvg)}</div>
            <div className="stat-sub" style={{ color: myTotalEmissions < globalAvg ? 'var(--green)' : 'var(--red)' }}>
              {myTotalEmissions < globalAvg ? '✓ En dessous de la moyenne' : '↑ Au-dessus de la moyenne'}
            </div>
          </div>
        )}
      </div>

      {/* Full map */}
      {trips.length > 0 ? (
        <>
          <div className="card mb-24" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <MapPin size={18} color="var(--accent)" />
              <span style={{ fontWeight: 600 }}>Carte de vos déplacements</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                {selectedTripId ? 'Cliquez à nouveau pour voir tous les trajets' : 'Cliquez sur un trajet pour le sélectionner'}
              </span>
            </div>
            <TripMap trips={trips} selectedTripId={selectedTripId} height={480} />
          </div>

          {/* Trip list */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Daily */}
            <div className="card">
              <div className="card-header">
                <h3>🏠 Trajets quotidiens ({dailyTrips.length})</h3>
                <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                  {formatEmissions(dailyTrips.reduce((s, t) => s + (t.emissions?.perYear || 0), 0))}/an
                </span>
              </div>
              {dailyTrips.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Aucun trajet quotidien</p>
              ) : (
                dailyTrips.map(trip => {
                  const mode = TRANSPORT_MODES[trip.transport];
                  return (
                    <div
                      key={trip.id}
                      className="trip-item"
                      style={{ borderColor: selectedTripId === trip.id ? 'var(--border-active)' : undefined, cursor: 'pointer' }}
                      onClick={() => setSelectedTripId(selectedTripId === trip.id ? null : trip.id)}
                    >
                      <span style={{ fontSize: '1.2rem' }}>{mode?.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div className="trip-route" style={{ fontSize: '0.85rem' }}>
                          {trip.departure?.shortName} → {trip.arrival?.shortName}
                        </div>
                        <div className="trip-meta">{trip.distance} km</div>
                      </div>
                      <div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.85rem' }}>
                        {formatEmissions(trip.emissions?.perYear || 0)}/an
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Exceptional */}
            <div className="card">
              <div className="card-header">
                <h3>✈️ Trajets exceptionnels ({exceptionalTrips.length})</h3>
                <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                  {formatEmissions(exceptionalTrips.reduce((s, t) => s + (t.emissions?.perYear || 0), 0))}/an
                </span>
              </div>
              {exceptionalTrips.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Aucun trajet exceptionnel</p>
              ) : (
                exceptionalTrips.map(trip => {
                  const mode = TRANSPORT_MODES[trip.transport];
                  return (
                    <div
                      key={trip.id}
                      className="trip-item"
                      style={{ borderColor: selectedTripId === trip.id ? 'var(--border-active)' : undefined }}
                      onClick={() => setSelectedTripId(selectedTripId === trip.id ? null : trip.id)}
                    >
                      <span style={{ fontSize: '1.2rem' }}>{mode?.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div className="trip-route" style={{ fontSize: '0.85rem' }}>
                          {trip.departure?.shortName} → {trip.arrival?.shortName}
                        </div>
                        <div className="trip-meta">{trip.distance?.toLocaleString('fr-FR')} km · {mode?.label}</div>
                      </div>
                      <div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.85rem' }}>
                        {formatEmissions(trip.emissions?.perYear || 0)}/an
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon"><Route size={48} color="var(--text-muted)" /></div>
          <h3>Aucun trajet enregistré</h3>
          <p>Ajoutez des trajets dans les onglets "Quotidiens" et "Exceptionnels".</p>
        </div>
      )}
    </div>
  );
}

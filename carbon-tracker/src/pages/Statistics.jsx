import { useState, useEffect, useRef } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { TRANSPORT_MODES, formatEmissions } from '../utils/carbonUtils';
import { BarChart2, Users, Globe } from 'lucide-react';

export default function Statistics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'trips'));
      const allTrips = snap.docs.map(d => d.data());

      // Users set
      const users = new Set(allTrips.map(t => t.userId));
      const userCount = users.size;

      // Per-user totals
      const byUser = {};
      allTrips.forEach(t => {
        if (!byUser[t.userId]) byUser[t.userId] = { emissions: 0, distance: 0 };
        byUser[t.userId].emissions += t.emissions?.perYear || 0;
        byUser[t.userId].distance += t.emissions?.distancePerYear || t.distance || 0;
      });

      const userTotals = Object.values(byUser);
      const avgEmissions = userCount > 0 ? userTotals.reduce((s, u) => s + u.emissions, 0) / userCount : 0;
      const avgDistance = userCount > 0 ? userTotals.reduce((s, u) => s + u.distance, 0) / userCount : 0;

      // By transport mode
      const byMode = {};
      allTrips.forEach(t => {
        if (!byMode[t.transport]) byMode[t.transport] = { count: 0, distance: 0, emissions: 0 };
        byMode[t.transport].count++;
        byMode[t.transport].distance += t.emissions?.distancePerYear || t.distance || 0;
        byMode[t.transport].emissions += t.emissions?.perYear || 0;
      });

      const modeStats = Object.entries(byMode)
        .map(([key, val]) => ({
          key,
          mode: TRANSPORT_MODES[key],
          ...val,
          avgDistance: val.count > 0 ? Math.round(val.distance / val.count) : 0,
        }))
        .sort((a, b) => b.emissions - a.emissions);

      // Countries visited
      const countryCounts = {};
      allTrips.forEach(t => {
        if (t.departure?.country) {
          countryCounts[t.departure.country] = (countryCounts[t.departure.country] || 0) + 1;
        }
        if (t.arrival?.country) {
          countryCounts[t.arrival.country] = (countryCounts[t.arrival.country] || 0) + 1;
        }
      });

      // Country coordinates (approximate centroids for major countries)
      const countryCoords = getCountryCoords();
      const countriesWithCoords = Object.entries(countryCounts)
  .map(([country, count]) => ({
    country,
    count,
    coords: countryCoords[country] || [20, 0], // fallback
  }))
  .sort((a, b) => b.count - a.count);

      setStats({ userCount, avgEmissions, avgDistance, modeStats, countriesWithCoords, totalTrips: allTrips.length });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  // Initialize map for country bubbles
  useEffect(() => {
    if (!stats || !mapRef.current || mapInstanceRef.current) return;

    import('leaflet').then(leaflet => {
      const L = leaflet.default;

      const map = L.map(mapRef.current, {
        center: [20, 10],
        zoom: 2,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
        maxZoom: 10,
        subdomains: 'abcd',
      }).addTo(map);

      const maxCount = Math.max(...stats.countriesWithCoords.map(c => c.count), 1);

      stats.countriesWithCoords.forEach(({ country, count, coords }) => {
        const size = Math.max(30, Math.min(80, 30 + (count / maxCount) * 50));
        const alpha = 0.3 + (count / maxCount) * 0.5;

        const icon = L.divIcon({
          html: `
            <div style="
              width: ${size}px;
              height: ${size}px;
              border-radius: 50%;
              background: rgba(232, 160, 32, ${alpha});
              border: 2px solid rgba(232, 160, 32, 0.6);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: ${size > 50 ? 12 : 10}px;
              font-weight: 700;
              font-family: 'Syne', sans-serif;
              text-align: center;
              cursor: pointer;
              box-shadow: 0 0 ${size/2}px rgba(232,160,32,0.3);
              line-height: 1.2;
            ">
              <div>${count}<br><span style="font-size:8px;font-weight:400;">${count > 1 ? 'fois' : 'fois'}</span></div>
            </div>
          `,
          className: '',
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        L.marker(coords, { icon })
          .bindPopup(`<div style="color:#e8edf5;background:#162032;padding:8px;border-radius:6px;font-family:'DM Sans',sans-serif;"><strong>${country}</strong><br>${count} passage${count > 1 ? 's' : ''}</div>`)
          .addTo(map);
      });

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [stats]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;
  }

  if (!stats || stats.userCount === 0) {
    return (
      <div>
        <h1 className="mb-24">Statistiques globales</h1>
        <div className="empty-state">
          <BarChart2 size={48} color="var(--text-muted)" />
          <h3>Pas encore de données</h3>
          <p>Les statistiques apparaîtront quand des utilisateurs auront renseigné des trajets.</p>
        </div>
      </div>
    );
  }

  const maxModeEmissions = Math.max(...stats.modeStats.map(m => m.emissions), 1);

  return (
    <div>
      <div className="mb-24">
        <h1>Statistiques globales</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: '0.88rem' }}>
          Données agrégées et anonymisées de tous les répondants
        </p>
      </div>

      {/* Key stats */}
      <div className="stat-grid mb-24">
        <div className="stat-card">
          <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}><Users size={18} /></div>
          <div className="stat-label">Répondants</div>
          <div className="stat-value">{stats.userCount}</div>
          <div className="stat-sub">{stats.totalTrips} trajets au total</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Bilan carbone moyen</div>
          <div className="stat-value" style={{ color: 'var(--orange)' }}>{formatEmissions(stats.avgEmissions)}</div>
          <div className="stat-sub">par personne / an</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Distance moyenne</div>
          <div className="stat-value">{Math.round(stats.avgDistance).toLocaleString('fr-FR')} km</div>
          <div className="stat-sub">par personne / an</div>
        </div>
      </div>

      {/* By transport mode */}
      <div className="card mb-24">
        <div className="card-header">
          <h3>Émissions par mode de transport</h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Cumulées tous répondants</span>
        </div>
        {stats.modeStats.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Aucune donnée</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {stats.modeStats.map(m => {
              const pct = (m.emissions / maxModeEmissions) * 100;
              return (
                <div key={m.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.85rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{m.mode?.icon || '?'}</span>
                      <span>{m.mode?.label || m.key}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({m.count} trajet{m.count > 1 ? 's' : ''})</span>
                    </span>
                    <span style={{ fontWeight: 600, color: m.mode?.color || 'var(--accent)' }}>
                      {formatEmissions(m.emissions)}
                    </span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: m.mode?.color || 'var(--accent)',
                      borderRadius: 3,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Distance moy. : {m.avgDistance.toLocaleString('fr-FR')} km/trajet
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Country map */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Globe size={18} color="var(--accent)" />
            <h3>Pays visités par les répondants</h3>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Taille des bulles proportionnelle au nombre de passages
          </span>
        </div>
        <div ref={mapRef} style={{ height: 440, borderRadius: 8, overflow: 'hidden' }} />

        {/* Country list */}
        {stats.countriesWithCoords.length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {stats.countriesWithCoords.slice(0, 20).map(c => (
              <div key={c.country} style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 100,
                padding: '4px 10px',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{c.count}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{c.country}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Approximate centroids for common countries
function getCountryCoords() {
  return {
    // EUROPE
    France: [46.2, 2.2],
    Allemagne: [51.2, 10.4],
    Germany: [51.2, 10.4],
    Espagne: [40.0, -3.7],
    Spain: [40.0, -3.7],
    Italie: [42.8, 12.8],
    Italy: [42.8, 12.8],
    Belgique: [50.5, 4.5],
    Belgium: [50.5, 4.5],
    Suisse: [46.8, 8.2],
    Switzerland: [46.8, 8.2],
    Pays-Bas: [52.1, 5.3],
    Netherlands: [52.1, 5.3],
    Portugal: [39.4, -8.2],
    Royaume-Uni: [55.4, -3.4],
    "United Kingdom": [55.4, -3.4],
    Irlande: [53.4, -8.0],
    Ireland: [53.4, -8.0],
    Pologne: [51.9, 19.1],
    Poland: [51.9, 19.1],
    Autriche: [47.5, 14.6],
    Austria: [47.5, 14.6],
    Danemark: [56.3, 9.5],
    Denmark: [56.3, 9.5],
    Suède: [60.1, 18.6],
    Sweden: [60.1, 18.6],
    Norvège: [60.5, 8.5],
    Norway: [60.5, 8.5],
    Finlande: [61.9, 25.7],
    Finland: [61.9, 25.7],
    Grèce: [39.1, 21.8],
    Greece: [39.1, 21.8],

    // AFRIQUE
    Maroc: [31.8, -7.1],
    Morocco: [31.8, -7.1],
    Tunisie: [34.0, 9.0],
    Tunisia: [34.0, 9.0],
    Algérie: [28.0, 1.6],
    Algeria: [28.0, 1.6],
    Sénégal: [14.5, -14.4],
    Senegal: [14.5, -14.4],
    Égypte: [26.8, 30.8],
    Egypt: [26.8, 30.8],
    Afrique_du_Sud: [-30.6, 22.9],
    "South Africa": [-30.6, 22.9],

    // AMÉRIQUE
    "États-Unis": [37.1, -95.7],
    "United States": [37.1, -95.7],
    Canada: [56.1, -106.3],
    Mexique: [23.6, -102.5],
    Mexico: [23.6, -102.5],
    Brésil: [-10.8, -52.9],
    Brazil: [-10.8, -52.9],
    Argentine: [-38.4, -63.6],
    Argentina: [-38.4, -63.6],
    Chili: [-35.7, -71.5],
    Chile: [-35.7, -71.5],

    // ASIE
    Chine: [35.9, 104.2],
    China: [35.9, 104.2],
    Japon: [36.2, 138.3],
    Japan: [36.2, 138.3],
    Inde: [20.6, 78.9],
    India: [20.6, 78.9],
    Thaïlande: [15.9, 100.9],
    Thailand: [15.9, 100.9],
    Vietnam: [14.1, 108.3],
    "Viêt Nam": [14.1, 108.3],
    "Viet Nam": [14.1, 108.3],
    Indonésie: [-0.8, 113.9],
    Indonesia: [-0.8, 113.9],
    Corée_du_Sud: [36.5, 127.8],
    "South Korea": [36.5, 127.8],
    Turquie: [38.9, 35.2],
    Turkey: [38.9, 35.2],
    Arabie_Saoudite: [23.9, 45.0],
    "Saudi Arabia": [23.9, 45.0],

    // OCÉANIE
    Australie: [-25.3, 133.8],
    Australia: [-25.3, 133.8],
    Nouvelle_Zélande: [-40.9, 174.9],
    "New Zealand": [-40.9, 174.9],
  };
}


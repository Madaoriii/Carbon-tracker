import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { TRANSPORT_MODES, formatEmissions } from '../utils/carbonUtils';
import {
  Download, Trash2, ChevronUp, ChevronDown, ArrowLeft,
  Users, Route, Wind, Search, Shield
} from 'lucide-react';
import * as XLSX from 'xlsx';

const COLUMNS = [
  { key: 'userName', label: 'Utilisateur' },
  { key: 'userEmail', label: 'Email' },
  { key: 'tripType', label: 'Type de trajet' },
  { key: 'departureName', label: 'Départ' },
  { key: 'arrivalName', label: 'Arrivée' },
  { key: 'transport', label: 'Transport' },
  { key: 'distance', label: 'Distance (km)' },
  { key: 'frequency', label: 'Fréquence' },
  { key: 'roundTrip', label: 'Aller-retour' },
  { key: 'emissionsPerTrip', label: 'Émissions/trajet (kg)' },
  { key: 'emissionsPerYear', label: 'Émissions/an (kg)' },
  { key: 'distancePerYear', label: 'Distance/an (km)' },
  { key: 'notes', label: 'Notes' },
  { key: 'createdAt', label: 'Date création' },
];

const FREQ_LABELS = {
  unique: 'Unique', quotidien_5j: 'Quotidien (5j)', quotidien_7j: 'Quotidien (7j)',
  hebdo: '1×/semaine', bi_hebdo: '2×/semaine', mensuel: '1×/mois',
  trimestriel: 'Trimestriel', semestriel: 'Semestriel', annuel: '1×/an',
};

export default function AdminPanel() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortCol, setSortCol] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterTransport, setFilterTransport] = useState('all');
  const [stats, setStats] = useState({ users: 0, trips: 0, totalEmissions: 0, totalDistance: 0 });
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const tripsSnap = await getDocs(collection(db, 'trips'));
      const usersSnap = await getDocs(collection(db, 'users'));

      const rawRows = tripsSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          userName: data.userName || '—',
          userEmail: data.userEmail || '—',
          userId: data.userId,
          tripType: data.tripType === 'daily' ? 'Quotidien' : 'Exceptionnel',
          tripTypeRaw: data.tripType,
          departureName: data.departure?.shortName || data.departure?.name || '—',
          departureCountry: data.departure?.country || '',
          arrivalName: data.arrival?.shortName || data.arrival?.name || '—',
          arrivalCountry: data.arrival?.country || '',
          transport: data.transport,
          transportLabel: TRANSPORT_MODES[data.transport]?.label || data.transport,
          transportIcon: TRANSPORT_MODES[data.transport]?.icon || '?',
          distance: data.distance || 0,
          frequency: FREQ_LABELS[data.frequency] || data.frequency || '—',
          roundTrip: data.roundTrip ? 'Oui' : 'Non',
          emissionsPerTrip: data.emissions?.perTrip ?? 0,
          emissionsPerYear: data.emissions?.perYear ?? 0,
          distancePerYear: data.emissions?.distancePerYear ?? data.distance ?? 0,
          notes: data.notes || '',
          createdAt: data.createdAt ? new Date(data.createdAt).toLocaleDateString('fr-FR') : '—',
          createdAtRaw: data.createdAt || '',
          fuelType: data.fuelType || '',
        };
      });

      setRows(rawRows);
      setStats({
        users: usersSnap.size,
        trips: rawRows.length,
        totalEmissions: rawRows.reduce((s, r) => s + r.emissionsPerYear, 0),
        totalDistance: rawRows.reduce((s, r) => s + r.distancePerYear, 0),
      });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  function handleSort(col) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer définitivement ce trajet ?')) return;
    setDeleting(id);
    await deleteDoc(doc(db, 'trips', id));
    setRows(r => r.filter(row => row.id !== id));
    setDeleting(null);
  }

  function exportToExcel() {
    const exportData = filteredRows.map(r => ({
      'Utilisateur': r.userName,
      'Email': r.userEmail,
      'Type de trajet': r.tripType,
      'Départ': r.departureName,
      'Pays départ': r.departureCountry,
      'Arrivée': r.arrivalName,
      'Pays arrivée': r.arrivalCountry,
      'Mode de transport': r.transportLabel,
      'Carburant': r.fuelType || '—',
      'Distance (km)': r.distance,
      'Aller-retour': r.roundTrip,
      'Fréquence': r.frequency,
      'Émissions/trajet (kgCO₂e)': r.emissionsPerTrip,
      'Émissions/an (kgCO₂e)': r.emissionsPerYear,
      'Distance/an (km)': r.distancePerYear,
      'Notes': r.notes,
      'Date création': r.createdAt,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);

    // Style header row
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws[addr]) continue;
      ws[addr].s = {
        font: { bold: true, color: { rgb: '0A0F1E' } },
        fill: { fgColor: { rgb: 'E8A020' } },
        alignment: { horizontal: 'center' },
      };
    }

    // Auto column widths
    ws['!cols'] = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.max(key.length, 15),
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Trajets');

    // Summary sheet
    const summaryData = [
      ['Rapport TraceCarbone', ''],
      ['Date export', new Date().toLocaleDateString('fr-FR')],
      ['', ''],
      ['Nb utilisateurs', stats.users],
      ['Nb trajets total', stats.trips],
      ['Émissions totales (kgCO₂e/an)', Math.round(stats.totalEmissions)],
      ['Distance totale (km/an)', Math.round(stats.totalDistance)],
      ['Émissions moyennes/utilisateur', stats.users > 0 ? Math.round(stats.totalEmissions / stats.users) : 0],
      ['Distance moyenne/utilisateur', stats.users > 0 ? Math.round(stats.totalDistance / stats.users) : 0],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 35 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé');

    XLSX.writeFile(wb, `TraceCarbone_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  // Filter & sort
  const filteredRows = rows
    .filter(r => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        r.userName.toLowerCase().includes(q) ||
        r.userEmail.toLowerCase().includes(q) ||
        r.departureName.toLowerCase().includes(q) ||
        r.arrivalName.toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q);
      const matchType = filterType === 'all' || r.tripTypeRaw === filterType;
      const matchTransport = filterTransport === 'all' || r.transport === filterTransport;
      return matchSearch && matchType && matchTransport;
    })
    .sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol];
      if (sortCol === 'createdAt') { va = a.createdAtRaw; vb = b.createdAtRaw; }
      if (typeof va === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc'
        ? String(va).localeCompare(String(vb), 'fr')
        : String(vb).localeCompare(String(va), 'fr');
    });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            <ArrowLeft size={16} /> Retour
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Shield size={20} color="var(--accent)" />
              <h2 style={{ margin: 0 }}>Back-office administrateur</h2>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Connecté en tant que {user?.email}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary" onClick={exportToExcel} disabled={filteredRows.length === 0}>
            <Download size={16} />
            Exporter Excel ({filteredRows.length} lignes)
          </button>
          <button className="btn btn-secondary" onClick={async () => { await logout(); navigate('/auth'); }}>
            Déconnexion
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <Users size={16} color="var(--text-muted)" />
          <div className="stat-label">Utilisateurs inscrits</div>
          <div className="stat-value">{stats.users}</div>
        </div>
        <div className="stat-card">
          <Route size={16} color="var(--text-muted)" />
          <div className="stat-label">Trajets enregistrés</div>
          <div className="stat-value">{stats.trips}</div>
        </div>
        <div className="stat-card">
          <Wind size={16} color="var(--text-muted)" />
          <div className="stat-label">Émissions totales/an</div>
          <div className="stat-value" style={{ color: 'var(--orange)' }}>{formatEmissions(stats.totalEmissions)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Distance totale/an</div>
          <div className="stat-value">{Math.round(stats.totalDistance / 1000).toLocaleString('fr-FR')} Mkm</div>
          <div className="stat-sub">Moy. {stats.users > 0 ? Math.round(stats.totalDistance / stats.users).toLocaleString('fr-FR') : 0} km/pers.</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher utilisateur, lieu, note..."
              style={{ paddingLeft: 32 }}
            />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ flex: '0 0 180px' }}>
            <option value="all">Tous les types</option>
            <option value="daily">Quotidiens</option>
            <option value="exceptional">Exceptionnels</option>
          </select>
          <select value={filterTransport} onChange={e => setFilterTransport(e.target.value)} style={{ flex: '0 0 220px' }}>
            <option value="all">Tous les transports</option>
            {Object.entries(TRANSPORT_MODES).map(([k, m]) => (
              <option key={k} value={k}>{m.icon} {m.label}</option>
            ))}
          </select>
          {(search || filterType !== 'all' || filterTransport !== 'all') && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterType('all'); setFilterTransport('all'); }}>
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : filteredRows.length === 0 ? (
            <div className="empty-state"><p>Aucun résultat</p></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  {COLUMNS.map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={sortCol === col.key ? 'sorted' : ''}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {col.label}
                        {sortCol === col.key
                          ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
                          : <ChevronDown size={12} style={{ opacity: 0.3 }} />
                        }
                      </span>
                    </th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(row => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{row.userName}</td>
                    <td style={{ fontSize: '0.78rem' }}>{row.userEmail}</td>
                    <td>
                      <span className={`badge ${row.tripTypeRaw === 'daily' ? 'badge-green' : 'badge-accent'}`}>
                        {row.tripType}
                      </span>
                    </td>
                    <td>{row.departureName}</td>
                    <td>{row.arrivalName}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{row.transportIcon}</span>
                        <span style={{ fontSize: '0.78rem' }}>{row.transportLabel}</span>
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>{row.distance.toLocaleString('fr-FR')}</td>
                    <td style={{ fontSize: '0.78rem' }}>{row.frequency}</td>
                    <td style={{ textAlign: 'center' }}>{row.roundTrip}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{row.emissionsPerTrip.toFixed(1)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent)' }}>{row.emissionsPerYear.toFixed(1)}</td>
                    <td style={{ textAlign: 'right' }}>{row.distancePerYear.toLocaleString('fr-FR')}</td>
                    <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>{row.notes || '—'}</td>
                    <td style={{ fontSize: '0.78rem' }}>{row.createdAt}</td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(row.id)}
                        disabled={deleting === row.id}
                        style={{ padding: '4px 8px' }}
                      >
                        {deleting === row.id ? '...' : <Trash2 size={13} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {filteredRows.length > 0 && (
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border)',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <span>{filteredRows.length} trajet{filteredRows.length > 1 ? 's' : ''} affiché{filteredRows.length > 1 ? 's' : ''}</span>
            <span>
              Total filtré : {formatEmissions(filteredRows.reduce((s, r) => s + r.emissionsPerYear, 0))}/an ·{' '}
              {filteredRows.reduce((s, r) => s + r.distancePerYear, 0).toLocaleString('fr-FR')} km/an
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

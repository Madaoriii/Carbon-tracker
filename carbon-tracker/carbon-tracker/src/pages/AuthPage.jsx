import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle, Leaf } from 'lucide-react';

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        if (!displayName.trim()) {
          setError('Veuillez entrer votre prénom ou nom.');
          setLoading(false);
          return;
        }
        await register(email, password, displayName);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err) {
      const messages = {
        'auth/email-already-in-use': 'Cette adresse email est déjà utilisée.',
        'auth/invalid-email': 'Adresse email invalide.',
        'auth/weak-password': 'Mot de passe trop court (6 caractères min).',
        'auth/user-not-found': 'Aucun compte avec cette adresse email.',
        'auth/wrong-password': 'Mot de passe incorrect.',
        'auth/invalid-credential': 'Email ou mot de passe incorrect.',
        'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard.',
      };
      setError(messages[err.code] || 'Une erreur est survenue. Réessayez.');
    }
    setLoading(false);
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" />

      <div className="auth-card">
        <div className="auth-logo">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #b07010, #e8a020)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Leaf size={22} color="#0a0f1e" />
            </div>
          </div>
          <div className="auth-logo-title">TraceCarbone</div>
          <div className="auth-logo-sub">Suivez l'empreinte carbone de vos déplacements</div>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 24 }}>
          <button className={`tab ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setError(''); }}>
            Connexion
          </button>
          <button className={`tab ${mode === 'register' ? 'active' : ''}`} onClick={() => { setMode('register'); setError(''); }}>
            Créer un compte
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mode === 'register' && (
            <div className="form-group">
              <label>Prénom & Nom</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Jean Dupont"
                  style={{ paddingLeft: 38 }}
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Adresse email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                style={{ paddingLeft: 38 }}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Au moins 6 caractères' : '••••••••'}
                style={{ paddingLeft: 38 }}
                required
              />
            </div>
          </div>

          {error && (
            <div className="alert alert-error">
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                {mode === 'register' ? 'Création...' : 'Connexion...'}
              </span>
            ) : (
              mode === 'register' ? 'Créer mon compte' : 'Se connecter'
            )}
          </button>
        </form>

        {mode === 'register' && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 16, textAlign: 'center', lineHeight: 1.5 }}>
            Vos données sont utilisées uniquement pour calculer votre bilan carbone.<br />
            Un nouveau formulaire vous sera proposé tous les 6 mois.
          </p>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { getAuthStatus, login, logout } from './api';
import { MapsScreen } from './MapsScreen';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [gateEnabled, setGateEnabled] = useState(false);

  useEffect(() => {
    getAuthStatus()
      .then((s) => {
        setAuthed(s.authed);
        setGateEnabled(s.gateEnabled);
      })
      .catch(() => setAuthed(false))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <main className="shell"><p>Loading…</p></main>;
  }

  if (!authed) {
    return <LoginScreen onSuccess={() => setAuthed(true)} />;
  }

  return (
    <MapsScreen
      gateEnabled={gateEnabled}
      onLogout={async () => {
        await logout();
        setAuthed(false);
      }}
    />
  );
}

function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <form className="card" onSubmit={submit}>
        <h1>Eem Map Editor</h1>
        <p className="muted">Enter the shared password to continue.</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? 'Checking…' : 'Enter'}
        </button>
      </form>
    </main>
  );
}

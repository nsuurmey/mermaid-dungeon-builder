import { useEffect, useState } from 'react';
import { getAuthStatus, login, logout } from './api';
import { MapsScreen } from './MapsScreen';
import { EditorScreen } from './editor/EditorScreen';
import { PrintView } from './print/PrintView';

const PRINT_PATH = /^\/print\/(.+)$/;

export default function App() {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [gateEnabled, setGateEnabled] = useState(false);
  const [openMapId, setOpenMapId] = useState<string | null>(null);

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

  // Dedicated print route (opened in its own tab from the editor).
  const printMatch = PRINT_PATH.exec(window.location.pathname);
  if (printMatch) {
    return <PrintView mapId={decodeURIComponent(printMatch[1])} />;
  }

  if (openMapId) {
    return <EditorScreen mapId={openMapId} onBack={() => setOpenMapId(null)} />;
  }

  return (
    <MapsScreen
      gateEnabled={gateEnabled}
      onOpen={setOpenMapId}
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

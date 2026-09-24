import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchSystemStatus } from '../services/adminApi';

export default function Auth() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('admin_api_key') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('Please enter the Admin API Key');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      localStorage.setItem('admin_api_key', apiKey.trim());
      await fetchSystemStatus();
      navigate('/admin');
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Invalid API Key. Access denied.');
      } else {
        setError(err.message || 'Failed to authenticate with backend.');
      }
      localStorage.removeItem('admin_api_key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6">
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 rounded-3xl shadow-2xl p-8 text-white">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 text-2xl mb-3 shadow-lg shadow-blue-500/10">
            🛡️
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
            Admin Access
          </h1>
          <p className="text-xs text-slate-400">
            Fremtidsbarometer Orchestrator Control
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
              Secret Admin API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter ADMIN_API_KEY from .env"
              className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-mono"
              autoFocus
            />
            <p className="text-[11px] text-slate-500 mt-2">
              Default local dev key: <code className="text-blue-400">admin_dev_key_12345</code>
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/25 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Unlock Admin Panel →</span>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <Link
            to="/"
            className="text-xs text-slate-400 hover:text-white transition inline-flex items-center gap-1.5"
          >
            <span>←</span>
            <span>Back to Live Radar</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
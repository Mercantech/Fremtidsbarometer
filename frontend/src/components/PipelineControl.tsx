import React, { useState } from 'react';
import { triggerPipeline } from '../services/adminApi';
import '../styles/admin.css';

type SweepType = 'all' | 'social' | 'tech' | 'jobs' | 'synthesis' | 'news';

export const PipelineControl: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSweep, setSelectedSweep] = useState<SweepType>('all');
  const [forceRun, setForceRun] = useState(false);

  const handleTrigger = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const result = await triggerPipeline(selectedSweep, forceRun);

      if (result.status === 'dispatched') {
        setSuccess(result.message);
      } else {
        setError('Failed to dispatch pipeline');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger pipeline');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pipeline-control-card">
      <h2>Pipeline Control</h2>
      
      <div className="control-section">
        <label className="control-label">
          <span>Data Collection Scope:</span>
          <select
            value={selectedSweep}
            onChange={(e) => setSelectedSweep(e.target.value as SweepType)}
            disabled={loading}
            className="control-select"
          >
            <option value="all">Full Cycle (All Sources)</option>
            <option value="social">Social Media Only (Reddit, Threads)</option>
            <option value="tech">Tech News Only (HackerNews, GitHub)</option>
            <option value="jobs">Jobs Only (TeamTailor, LinkedIn)</option>
            <option value="synthesis">Synthesis Only (AI Processing)</option>
            <option value="news">News Only (Google News, RSS)</option>
          </select>
        </label>
      </div>

      <div className="control-section">
        <label className="control-checkbox">
          <input
            type="checkbox"
            checked={forceRun}
            onChange={(e) => setForceRun(e.target.checked)}
            disabled={loading}
          />
          <span>Force Run (ignore cache, use real-time data)</span>
        </label>
      </div>

      <button
        onClick={handleTrigger}
        disabled={loading}
        className={`trigger-button ${loading ? 'loading' : ''}`}
      >
        {loading ? 'Triggering Pipeline...' : '▶ Start Pipeline'}
      </button>

      {success && (
        <div className="message-box success-message">
          <strong>✓ Success:</strong> {success}
        </div>
      )}

      {error && (
        <div className="message-box error-message">
          <strong>✗ Error:</strong> {error}
        </div>
      )}

      <div className="help-text">
        <p>
          <strong>Tip:</strong> Uncheck "Force Run" to use cached data if available. This saves
          API quota and improves performance.
        </p>
      </div>
    </div>
  );
};

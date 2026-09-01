import React, { useState } from 'react';
import { SystemStatusDisplay } from '../components/SystemStatusDisplay';
import { PipelineControl } from '../components/PipelineControl';
import { AIModelManager } from '../components/AIModelManager';
import { DataSourceManager } from '../components/DataSourceManager';
import { LogsViewer } from '../components/LogsViewer';
import '../styles/admin.css';

export default function Admin() {
  const [activeSection, setActiveSection] = useState<
    'overview' | 'pipeline' | 'ai-models' | 'data-sources' | 'logs'
  >('overview');

  return (
    <div className="admin-panel">
      <header className="admin-header">
        <div className="header-content">
          <h1>Administration Panel</h1>
          <p>Manage system configuration, monitor health, and control data collection pipelines</p>
        </div>
      </header>

      <div className="admin-container">
        <aside className="admin-sidebar">
          <nav className="admin-nav">
            <button
              className={`nav-item ${activeSection === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveSection('overview')}
            >
              📊 Overview & Status
            </button>
            <button
              className={`nav-item ${activeSection === 'pipeline' ? 'active' : ''}`}
              onClick={() => setActiveSection('pipeline')}
            >
              ▶️ Pipeline Control
            </button>
            <button
              className={`nav-item ${activeSection === 'ai-models' ? 'active' : ''}`}
              onClick={() => setActiveSection('ai-models')}
            >
              🤖 AI Models
            </button>
            <button
              className={`nav-item ${activeSection === 'data-sources' ? 'active' : ''}`}
              onClick={() => setActiveSection('data-sources')}
            >
              📡 Data Sources
            </button>
            <button
              className={`nav-item ${activeSection === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveSection('logs')}
            >
              📋 Logs
            </button>
          </nav>
        </aside>

        <main className="admin-content">
          {activeSection === 'overview' && (
            <div className="section-overview">
              <SystemStatusDisplay />
            </div>
          )}

          {activeSection === 'pipeline' && (
            <div className="section-pipeline">
              <PipelineControl />
            </div>
          )}

          {activeSection === 'ai-models' && (
            <div className="section-ai-models">
              <AIModelManager />
            </div>
          )}

          {activeSection === 'data-sources' && (
            <div className="section-data-sources">
              <DataSourceManager />
            </div>
          )}

          {activeSection === 'logs' && (
            <div className="section-logs">
              <LogsViewer />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
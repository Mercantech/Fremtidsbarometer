import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity,
  Terminal,
  Cpu,
  Radio,
  ScrollText,
  Compass,
  LogOut,
  SlidersHorizontal,
} from 'lucide-react';
import { SystemStatusDisplay } from '../components/SystemStatusDisplay';
import { PipelineControl } from '../components/PipelineControl';
import { AIModelManager } from '../components/AIModelManager';
import { DataSourceManager } from '../components/DataSourceManager';
import { LogsViewer } from '../components/LogsViewer';
import '../styles/admin.css';

type SectionType = 'overview' | 'pipeline' | 'ai-models' | 'data-sources' | 'logs';
const VALID_SECTIONS: SectionType[] = ['overview', 'pipeline', 'ai-models', 'data-sources', 'logs'];

export default function Admin() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const getInitialSection = (): SectionType => {
    const tabParam = searchParams.get('tab') as SectionType;
    if (tabParam && VALID_SECTIONS.includes(tabParam)) {
      return tabParam;
    }
    const hash = window.location.hash.replace('#', '') as SectionType;
    if (hash && VALID_SECTIONS.includes(hash)) {
      return hash;
    }
    const saved = localStorage.getItem('admin_active_section') as SectionType;
    if (saved && VALID_SECTIONS.includes(saved)) {
      return saved;
    }
    return 'overview';
  };

  const [activeSection, setActiveSectionState] = useState<SectionType>(getInitialSection);

  const setActiveSection = (section: SectionType) => {
    setActiveSectionState(section);
    setSearchParams({ tab: section }, { replace: true });
    localStorage.setItem('admin_active_section', section);
  };

  useEffect(() => {
    const tabParam = searchParams.get('tab') as SectionType;
    if (tabParam && VALID_SECTIONS.includes(tabParam) && tabParam !== activeSection) {
      setActiveSectionState(tabParam);
      localStorage.setItem('admin_active_section', tabParam);
    }
  }, [searchParams, activeSection]);


  return (
    <div className="admin-panel">
      <header className="admin-header flex justify-between items-center">
        <div className="header-content flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h1>Administration Center</h1>
            <p>Mission control, agentic pipelines, AI inference matrix & real-time telemetry</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 text-xs font-semibold transition flex items-center gap-2 shadow-sm"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Live Radar</span>
          </Link>
          <button
            onClick={() => {
              localStorage.removeItem('admin_api_key');
              navigate('/login');
            }}
            className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
            title="Log out and clear stored API key"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <div className="admin-container">
        <aside className="admin-sidebar">
          <nav className="admin-nav">
            <button
              className={`nav-item flex items-center gap-2.5 ${activeSection === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveSection('overview')}
            >
              <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Overview & Health</span>
            </button>
            <button
              className={`nav-item flex items-center gap-2.5 ${activeSection === 'pipeline' ? 'active' : ''}`}
              onClick={() => setActiveSection('pipeline')}
            >
              <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Pipeline Control</span>
            </button>
            <button
              className={`nav-item flex items-center gap-2.5 ${activeSection === 'ai-models' ? 'active' : ''}`}
              onClick={() => setActiveSection('ai-models')}
            >
              <Cpu className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>AI Models & Engines</span>
            </button>
            <button
              className={`nav-item flex items-center gap-2.5 ${activeSection === 'data-sources' ? 'active' : ''}`}
              onClick={() => setActiveSection('data-sources')}
            >
              <Radio className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Data Sources</span>
            </button>
            <button
              className={`nav-item flex items-center gap-2.5 ${activeSection === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveSection('logs')}
            >
              <ScrollText className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Logs & Telemetry</span>
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
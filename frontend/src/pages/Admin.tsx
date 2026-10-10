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
  Globe,
  Calendar,
  Eye,
  Briefcase,
  Megaphone,
  Database,
  ShieldCheck,
} from 'lucide-react';
import { SystemStatusDisplay } from '../components/SystemStatusDisplay';
import { PipelineControl } from '../components/PipelineControl';
import { AIModelManager } from '../components/AIModelManager';
import { DataSourceManager } from '../components/DataSourceManager';
import { LogsViewer } from '../components/LogsViewer';
import { GlobeConfigManager } from '../components/GlobeConfigManager';
import { ErasManager } from '../components/ErasManager';
import { PinsModerationManager } from '../components/PinsModerationManager';
import { JobsInspector } from '../components/JobsInspector';
import { BroadcastPinsManager } from '../components/BroadcastPinsManager';
import { BackupManagerModal } from '../components/BackupManagerModal';
import { AuditLogViewer } from '../components/AuditLogViewer';
import '../styles/admin.css';

type SectionType =
  | 'overview'
  | 'pipeline'
  | 'ai-models'
  | 'data-sources'
  | '3d-radar'
  | 'eras'
  | 'pins'
  | 'broadcasts'
  | 'jobs'
  | 'audit'
  | 'logs';

const VALID_SECTIONS: SectionType[] = [
  'overview',
  'pipeline',
  'ai-models',
  'data-sources',
  '3d-radar',
  'eras',
  'pins',
  'broadcasts',
  'jobs',
  'audit',
  'logs',
];

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
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

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
          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h1>Admin Console</h1>
            <p>System status, automated pipelines, AI models & data channels</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsBackupModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
            title="Export or restore system JSON snapshots"
          >
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>Backup & Restore</span>
          </button>
          <Link
            to="/"
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-medium transition flex items-center gap-1.5"
          >
            <Compass className="w-3.5 h-3.5 text-slate-400" />
            <span>Live Radar</span>
          </Link>
          <button
            onClick={() => {
              localStorage.removeItem('admin_api_key');
              navigate('/login');
            }}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/10 text-slate-300 hover:text-rose-400 border border-white/10 hover:border-rose-500/20 text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
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
            {/* 1. Radar & Spatial Content */}
            <div className="nav-group-header">Radar & Content</div>
            <button
              className={`nav-item flex items-center gap-2.5 ${activeSection === '3d-radar' ? 'active' : ''}`}
              onClick={() => setActiveSection('3d-radar')}
            >
              <Globe className={`w-4 h-4 shrink-0 ${activeSection === '3d-radar' ? 'text-blue-400' : 'text-slate-400'}`} />
              <span>3D Radar Settings</span>
            </button>
            <button
              className={`nav-item flex items-center gap-2.5 ${activeSection === 'pins' ? 'active' : ''}`}
              onClick={() => setActiveSection('pins')}
            >
              <Eye className={`w-4 h-4 shrink-0 ${activeSection === 'pins' ? 'text-blue-400' : 'text-slate-400'}`} />
              <span>Live Pins Moderation</span>
            </button>
            <button
              className={`nav-item flex items-center gap-2.5 ${activeSection === 'broadcasts' ? 'active' : ''}`}
              onClick={() => setActiveSection('broadcasts')}
            >
              <Megaphone className={`w-4 h-4 shrink-0 ${activeSection === 'broadcasts' ? 'text-blue-400' : 'text-slate-400'}`} />
              <span>Broadcast Pins</span>
            </button>
            <button
              className={`nav-item flex items-center gap-2.5 ${activeSection === 'eras' ? 'active' : ''}`}
              onClick={() => setActiveSection('eras')}
            >
              <Calendar className={`w-4 h-4 shrink-0 ${activeSection === 'eras' ? 'text-blue-400' : 'text-slate-400'}`} />
              <span>Eras & Timeline CMS</span>
            </button>

            {/* 2. Labor Intelligence */}
            <div className="nav-group-header">Labor Intelligence</div>
            <button
              className={`nav-item flex items-center gap-2.5 ${activeSection === 'jobs' ? 'active' : ''}`}
              onClick={() => setActiveSection('jobs')}
            >
              <Briefcase className={`w-4 h-4 shrink-0 ${activeSection === 'jobs' ? 'text-blue-400' : 'text-slate-400'}`} />
              <span>Jobs Directory</span>
            </button>
            <button
              className={`nav-item flex items-center gap-2.5 ${activeSection === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveSection('overview')}
            >
              <Activity className={`w-4 h-4 shrink-0 ${activeSection === 'overview' ? 'text-blue-400' : 'text-slate-400'}`} />
              <span>Overview & Health</span>
            </button>

            {/* 3. System Operations */}
            <div className="nav-group-header">System Operations</div>
            <button
              className={`nav-item flex items-center gap-2.5 ${activeSection === 'pipeline' ? 'active' : ''}`}
              onClick={() => setActiveSection('pipeline')}
            >
              <Terminal className={`w-4 h-4 shrink-0 ${activeSection === 'pipeline' ? 'text-blue-400' : 'text-slate-400'}`} />
              <span>Pipeline Control</span>
            </button>
            <button
              className={`nav-item flex items-center gap-2.5 ${activeSection === 'ai-models' ? 'active' : ''}`}
              onClick={() => setActiveSection('ai-models')}
            >
              <Cpu className={`w-4 h-4 shrink-0 ${activeSection === 'ai-models' ? 'text-blue-400' : 'text-slate-400'}`} />
              <span>AI Models & Engines</span>
            </button>
            <button
              className={`nav-item flex items-center gap-2.5 ${activeSection === 'data-sources' ? 'active' : ''}`}
              onClick={() => setActiveSection('data-sources')}
            >
              <Radio className={`w-4 h-4 shrink-0 ${activeSection === 'data-sources' ? 'text-blue-400' : 'text-slate-400'}`} />
              <span>Data Sources</span>
            </button>

            {/* 4. Security & Governance */}
            <div className="nav-group-header">Security & Governance</div>
            <button
              className={`nav-item flex items-center gap-2.5 ${activeSection === 'audit' ? 'active' : ''}`}
              onClick={() => setActiveSection('audit')}
            >
              <ShieldCheck className={`w-4 h-4 shrink-0 ${activeSection === 'audit' ? 'text-blue-400' : 'text-slate-400'}`} />
              <span>Audit Trail</span>
            </button>
            <button
              className={`nav-item flex items-center gap-2.5 ${activeSection === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveSection('logs')}
            >
              <ScrollText className={`w-4 h-4 shrink-0 ${activeSection === 'logs' ? 'text-blue-400' : 'text-slate-400'}`} />
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

          {activeSection === '3d-radar' && (
            <div className="section-3d-radar">
              <GlobeConfigManager />
            </div>
          )}

          {activeSection === 'pins' && (
            <div className="section-pins">
              <PinsModerationManager />
            </div>
          )}

          {activeSection === 'broadcasts' && (
            <div className="section-broadcasts">
              <BroadcastPinsManager />
            </div>
          )}

          {activeSection === 'eras' && (
            <div className="section-eras">
              <ErasManager />
            </div>
          )}

          {activeSection === 'jobs' && (
            <div className="section-jobs">
              <JobsInspector />
            </div>
          )}

          {activeSection === 'audit' && (
            <div className="section-audit">
              <AuditLogViewer />
            </div>
          )}

          {activeSection === 'logs' && (
            <div className="section-logs">
              <LogsViewer />
            </div>
          )}
        </main>
      </div>

      <BackupManagerModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onRestoreSuccess={() => window.location.reload()}
      />
    </div>
  );
}
import React, { useState } from 'react';
import {
  Download,
  Upload,
  Database,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  FileJson,
  ShieldCheck,
} from 'lucide-react';
import {
  exportAdminBackup,
  importAdminBackup,
  getAdminErrorMessage,
} from '../services/adminApi';

interface BackupManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreSuccess?: () => void;
}

export const BackupManagerModal: React.FC<BackupManagerModalProps> = ({
  isOpen,
  onClose,
  onRestoreSuccess,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // File import state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setFeedback(null);
      const data = await exportAdminBackup();

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `fremtidsbarometer_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setFeedback({
        type: 'success',
        message: `Backup downloaded: ${data.eras_count} eras and 3D radar settings exported.`,
      });
    } catch (err) {
      console.error('Failed to export backup:', err);
      setFeedback({
        type: 'error',
        message: getAdminErrorMessage(err, 'Failed to generate backup export'),
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setFeedback(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text);
        if (!json.eras && !json.globe_config) {
          throw new Error('JSON file is missing "eras" or "globe_config" objects');
        }
        setParsedData(json);
      } catch (err: any) {
        setFeedback({
          type: 'error',
          message: `Invalid backup file: ${err.message || 'Syntax error'}`,
        });
        setSelectedFile(null);
        setParsedData(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!parsedData) return;
    const confirmed = window.confirm(
      `Restore database snapshot from "${selectedFile?.name}"?\nExisting eras with matching years will be updated in PostgreSQL.`
    );
    if (!confirmed) return;

    try {
      setIsImporting(true);
      setFeedback(null);
      const res = await importAdminBackup(parsedData);
      setFeedback({
        type: 'success',
        message: `Restore complete: ${res.eras_imported} eras imported, 3D radar settings updated.`,
      });
      setSelectedFile(null);
      setParsedData(null);
      if (onRestoreSuccess) {
        onRestoreSuccess();
      }
    } catch (err) {
      console.error('Failed to import backup:', err);
      setFeedback({
        type: 'error',
        message: getAdminErrorMessage(err, 'Failed to import backup snapshot'),
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-[#181622] border border-white/15 p-6 shadow-2xl space-y-5 text-xs text-slate-200">
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Database Backup & Restore</h3>
              <p className="text-[11px] text-slate-400">
                1-click JSON snapshot of Eras CMS, 3D Radar configuration & Broadcast Pins
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* ── Section 1: Export Snapshot ── */}
        <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Download className="w-4 h-4 text-cyan-400" />
                <span>Export Current Database State</span>
              </span>
              <p className="text-[11px] text-slate-400">
                Exports all timeline eras, custom dossiers, broadcast pins, and radar weights.
              </p>
            </div>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-lg shadow-cyan-600/20"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Download JSON</span>
            </button>
          </div>
        </div>

        {/* ── Section 2: Import Snapshot ── */}
        <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
          <div className="space-y-0.5">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-purple-400" />
              <span>Restore from Snapshot File</span>
            </span>
            <p className="text-[11px] text-slate-400">
              Upload a valid <code className="text-slate-300">.json</code> backup to restore eras and settings into PostgreSQL.
            </p>
          </div>

          <div className="relative border border-dashed border-white/15 rounded-xl p-4 text-center hover:border-purple-500/50 transition">
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center justify-center gap-1 text-slate-400">
              <FileJson className="w-6 h-6 text-purple-400" />
              <span className="font-medium text-slate-200">
                {selectedFile ? selectedFile.name : 'Click or drop backup JSON file here'}
              </span>
              <span className="text-[10px] text-slate-500">
                {selectedFile
                  ? `${(selectedFile.size / 1024).toFixed(1)} KB — ready to restore`
                  : 'Requires valid fremtidsbarometer_backup_*.json'}
              </span>
            </div>
          </div>

          {parsedData && (
            <div className="p-3 rounded-lg bg-purple-950/20 border border-purple-500/30 flex items-center justify-between">
              <div className="text-[11px] text-purple-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                <span>
                  Valid snapshot: {parsedData.eras?.length || 0} Eras, Radar Config verified
                </span>
              </div>
              <button
                onClick={handleImport}
                disabled={isImporting}
                className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                {isImporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>Confirm Restore</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition cursor-pointer font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

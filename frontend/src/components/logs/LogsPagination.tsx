import { ChevronLeft, ChevronRight } from 'lucide-react';

interface LogsPaginationProps {
  page: number;
  currentCount: number;
  pageSize: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}

export function LogsPagination({
  page,
  currentCount,
  pageSize,
  loading,
  onPageChange,
}: LogsPaginationProps) {
  return (
    <div className="flex justify-between items-center mt-5 pt-3.5 border-t border-slate-800 text-xs text-slate-400">
      <div>
        Showing page <span className="font-semibold text-slate-200">{page}</span>{' '}
        {currentCount > 0 ? `(${currentCount} entries)` : ''}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1 || loading}
          className="btn-secondary px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>
        <span className="font-semibold px-2 text-slate-200">Page {page}</span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={currentCount < pageSize || loading}
          className="btn-secondary px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

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
    <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-200 text-xs text-slate-600">
      <div>
        Showing page {page} {currentCount > 0 ? `(${currentCount} entries)` : ''}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1 || loading}
          className="btn-secondary px-3 py-1 rounded cursor-pointer disabled:opacity-40"
        >
          Previous
        </button>
        <span className="font-semibold px-1">Page {page}</span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={currentCount < pageSize || loading}
          className="btn-secondary px-3 py-1 rounded cursor-pointer disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

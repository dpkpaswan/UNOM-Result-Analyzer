export default function Sidebar({
  batches,
  activeBatchId,
  isOpen,
  onToggle,
  onSelectBatch,
  onDeleteBatch,
  onNewAnalysis,
  onCompare,
  onAdmin,
  currentPage,
  isAdmin,
}) {
  const formatDate = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'collapsed'}`}>
      <div className="sidebar-header">
        {isOpen && (
          <div className="sidebar-brand">
            <span className="brand-text">Navigation</span>
          </div>
        )}
        <button className="sidebar-toggle" onClick={onToggle} id="sidebar-toggle">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            {isOpen ? (
              <path d="M13 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            ) : (
              <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            )}
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="sidebar-content">
          {/* New Analysis Button */}
          <button
            className={`sidebar-action-btn ${currentPage === 'upload' ? 'active' : ''}`}
            onClick={onNewAnalysis}
            id="new-analysis-btn"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M9 6v6M6 9h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>New Analysis</span>
          </button>

          {/* Compare Button */}
          <button
            className={`sidebar-action-btn sidebar-compare-btn ${currentPage === 'compare' ? 'active' : ''}`}
            onClick={onCompare}
            disabled={batches.length < 2}
            id="compare-btn"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="1" y="3" width="6" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="11" y="3" width="6" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8.5 7l1.5 2-1.5 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Compare Batches</span>
          </button>

          {/* Admin Button */}
          {isAdmin && (
            <button
              className={`sidebar-action-btn sidebar-admin-btn ${currentPage === 'admin' ? 'active' : ''}`}
              onClick={onAdmin}
              id="admin-btn"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2L2 5.5v7L9 16l7-3.5v-7L9 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              <span>Admin Panel</span>
            </button>
          )}

          {/* Batch List */}
          <div className="sidebar-section-label">Past Exams</div>
          <div className="sidebar-batch-list">
            {batches.length === 0 && (
              <p className="sidebar-empty">No batches yet. Upload a CSV to get started.</p>
            )}
            {batches.map((batch) => (
              <div
                key={batch.id}
                className={`sidebar-batch-item ${activeBatchId === batch.id && currentPage === 'dashboard' ? 'active' : ''}`}
                onClick={() => onSelectBatch(batch)}
              >
                <div className="batch-item-info">
                  <span className="batch-label">{batch.label}</span>
                  <span className="batch-meta">
                    {formatDate(batch.created_at)} · {batch.total_students} students
                  </span>
                </div>
                <button
                  className="batch-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete "${batch.label}"?`)) {
                      onDeleteBatch(batch.id);
                    }
                  }}
                  title="Delete batch"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 3.5h8M5.5 3.5V2.5a1 1 0 011-1h1a1 1 0 011 1v1M9.5 6v4.5a1 1 0 01-1 1h-3a1 1 0 01-1-1V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

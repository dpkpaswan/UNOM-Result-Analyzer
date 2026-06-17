import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ComparePage({ batches }) {
  const { authFetch, API_BASE } = useAuth();
  const [batch1Id, setBatch1Id] = useState('');
  const [batch2Id, setBatch2Id] = useState('');
  const [compareData, setCompareData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCompare = async () => {
    if (!batch1Id || !batch2Id) {
      setError('Please select two batches to compare');
      return;
    }
    if (batch1Id === batch2Id) {
      setError('Please select two different batches');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await authFetch(`${API_BASE}/compare?batch1=${batch1Id}&batch2=${batch2Id}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setCompareData(data);
      }
    } catch (err) {
      setError('Failed to fetch comparison data');
    } finally {
      setLoading(false);
    }
  };

  // Get all subject codes from both batches
  const allSubjects = compareData
    ? [...new Set([
        ...Object.keys(compareData.batch1.subjects),
        ...Object.keys(compareData.batch2.subjects),
      ])].sort()
    : [];

  const getDiffClass = (v1, v2) => {
    if (v1 === undefined || v2 === undefined) return '';
    if (v1 > v2) return 'diff-positive';
    if (v1 < v2) return 'diff-negative';
    return 'diff-neutral';
  };

  const getDiffArrow = (v1, v2) => {
    if (v1 === undefined || v2 === undefined) return '';
    const diff = v2 - v1;
    if (diff > 0) return `▲ +${diff.toFixed(1)}%`;
    if (diff < 0) return `▼ ${diff.toFixed(1)}%`;
    return '— 0%';
  };

  return (
    <div className="compare-page">
      <div className="compare-container">
        <div className="compare-header">
          <h1 className="compare-title">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="5" width="9" height="18" rx="2" stroke="url(#cg)" strokeWidth="2"/>
              <rect x="17" y="5" width="9" height="18" rx="2" stroke="url(#cg)" strokeWidth="2"/>
              <path d="M12.5 11l2 3-2 3" stroke="url(#cg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <defs><linearGradient id="cg" x1="0" y1="0" x2="28" y2="28"><stop stopColor="#818cf8"/><stop offset="1" stopColor="#c084fc"/></linearGradient></defs>
            </svg>
            Compare Batches
          </h1>
          <p className="compare-subtitle">Select two exam batches to compare pass rates side-by-side</p>
        </div>

        {/* Selector */}
        <div className="compare-selectors">
          <div className="compare-selector-card">
            <label className="selector-label">Batch 1</label>
            <select
              value={batch1Id}
              onChange={(e) => setBatch1Id(e.target.value)}
              className="batch-select"
              id="batch1-select"
            >
              <option value="">Select a batch...</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label} ({b.total_students} students)
                </option>
              ))}
            </select>
          </div>

          <div className="compare-vs">
            <span>VS</span>
          </div>

          <div className="compare-selector-card">
            <label className="selector-label">Batch 2</label>
            <select
              value={batch2Id}
              onChange={(e) => setBatch2Id(e.target.value)}
              className="batch-select"
              id="batch2-select"
            >
              <option value="">Select a batch...</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label} ({b.total_students} students)
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="error-message" style={{ maxWidth: 600, margin: '0 auto 1rem' }}>{error}</div>}

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <button
            className="start-btn"
            style={{ maxWidth: 300, margin: '0 auto' }}
            onClick={handleCompare}
            disabled={loading || !batch1Id || !batch2Id}
            id="compare-submit-btn"
          >
            {loading ? (
              <><div className="spinner" style={{ width: 18, height: 18 }} /> Comparing...</>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10h12M12 6l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Compare Now
              </>
            )}
          </button>
        </div>

        {/* Results */}
        {compareData && (
          <div className="compare-results">
            {/* Overall Stats */}
            <div className="compare-overall">
              <div className="compare-overall-card">
                <span className="compare-batch-label">{compareData.batch1.label}</span>
                <span className="compare-overall-value">{compareData.batch1.overall.pass_percent}%</span>
                <span className="compare-overall-detail">
                  {compareData.batch1.overall.passed}/{compareData.batch1.overall.total} passed
                </span>
              </div>

              <div className="compare-diff-center">
                <span className={`compare-diff-badge ${getDiffClass(compareData.batch1.overall.pass_percent, compareData.batch2.overall.pass_percent)}`}>
                  {getDiffArrow(compareData.batch1.overall.pass_percent, compareData.batch2.overall.pass_percent)}
                </span>
              </div>

              <div className="compare-overall-card">
                <span className="compare-batch-label">{compareData.batch2.label}</span>
                <span className="compare-overall-value">{compareData.batch2.overall.pass_percent}%</span>
                <span className="compare-overall-detail">
                  {compareData.batch2.overall.passed}/{compareData.batch2.overall.total} passed
                </span>
              </div>
            </div>

            {/* Subject-wise comparison */}
            <h2 className="section-title" style={{ marginTop: '2rem' }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M3 18V8l4-5h8l4 5v10a1 1 0 01-1 1H4a1 1 0 01-1-1z" stroke="#818cf8" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M8 19v-5h6v5" stroke="#818cf8" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
              Subject-wise Pass Rate Comparison
            </h2>

            <div className="compare-table-wrapper">
              <table className="results-table compare-table" id="compare-table">
                <thead>
                  <tr>
                    <th>Subject Code</th>
                    <th className="compare-th-batch1">{compareData.batch1.label}</th>
                    <th className="compare-th-batch2">{compareData.batch2.label}</th>
                    <th>Change</th>
                  </tr>
                </thead>
                <tbody>
                  {allSubjects.map((code) => {
                    const s1 = compareData.batch1.subjects[code];
                    const s2 = compareData.batch2.subjects[code];
                    const p1 = s1?.pass_percent ?? null;
                    const p2 = s2?.pass_percent ?? null;

                    return (
                      <tr key={code}>
                        <td className="td-subject-code">{code}</td>
                        <td className="td-compare-value">
                          {p1 !== null ? (
                            <div className="compare-cell">
                              <div className="compare-bar-bg">
                                <div className="compare-bar compare-bar-1" style={{ width: `${p1}%` }} />
                              </div>
                              <span className="compare-pct">{p1}%</span>
                              <span className="compare-detail">{s1.passed}/{s1.total}</span>
                            </div>
                          ) : <span className="td-empty">—</span>}
                        </td>
                        <td className="td-compare-value">
                          {p2 !== null ? (
                            <div className="compare-cell">
                              <div className="compare-bar-bg">
                                <div className="compare-bar compare-bar-2" style={{ width: `${p2}%` }} />
                              </div>
                              <span className="compare-pct">{p2}%</span>
                              <span className="compare-detail">{s2.passed}/{s2.total}</span>
                            </div>
                          ) : <span className="td-empty">—</span>}
                        </td>
                        <td className="td-compare-change">
                          {p1 !== null && p2 !== null ? (
                            <span className={`compare-change-badge ${getDiffClass(p1, p2)}`}>
                              {getDiffArrow(p1, p2)}
                            </span>
                          ) : <span className="td-empty">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

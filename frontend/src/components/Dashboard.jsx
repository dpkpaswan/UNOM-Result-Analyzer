import React, { useState, useMemo } from 'react';
import XLSX from 'xlsx-js-style';

export default function Dashboard({ results, batchInfo, onBack }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Compute stats
  const stats = useMemo(() => {
    const total = results.length;
    const passed = results.filter((s) => s.overall === 'PASS').length;
    const failed = results.filter((s) => s.overall === 'FAIL').length;
    const errors = results.filter((s) => s.overall === 'ERROR').length;
    const passPercent = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
    return { total, passed, failed, errors, passPercent };
  }, [results]);

  // Filter and search
  const filteredResults = useMemo(() => {
    let data = [...results];
    if (filter === 'pass') data = data.filter((s) => s.overall === 'PASS');
    if (filter === 'fail') data = data.filter((s) => s.overall === 'FAIL');
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      data = data.filter(
        (s) =>
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.regno && s.regno.toLowerCase().includes(q))
      );
    }
    return data;
  }, [results, filter, search]);

  // Failed students with their failed subjects
  const failedStudents = useMemo(() => {
    return results
      .filter((s) => s.overall === 'FAIL')
      .map((s) => ({
        ...s,
        failedSubjects: s.subjects.filter(
          (sub) => sub.result === 'RA' || sub.result === 'AAA' || sub.result === 'W'
        ),
      }));
  }, [results]);

  // Toggle row expansion
  const toggleRow = (regno) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(regno)) {
        next.delete(regno);
      } else {
        next.add(regno);
      }
      return next;
    });
  };

  // Count passed/failed subjects for a student
  const getSubjectCounts = (student) => {
    const passed = student.subjects.filter((s) => s.result === 'PASS').length;
    const failed = student.subjects.length - passed;
    return { passed, failed };
  };

  // Sanitize batch label for filename
  const safeLabel = batchInfo?.label
    ? batchInfo.label.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_')
    : 'Results';

  const students = filteredResults;

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Collect all unique subject codes across all students
    const allCodes = [];
    students.forEach(student => {
      student.subjects.forEach(sub => {
        if (!allCodes.includes(sub.code)) allCodes.push(sub.code);
      });
    });

    // Build header row
    const header = ["S.No", "Register Number", "Name"];
    allCodes.forEach(code => {
      header.push(`${code} UE`, `${code} IA`, `${code} Total`, `${code} Result`);
    });
    header.push("Overall");

    const rows = [header];

    // Build one row per student
    students.forEach((student, index) => {
      const row = [index + 1, student.regno, student.name];
      allCodes.forEach(code => {
        const sub = student.subjects.find(s => s.code === code);
        if (sub) {
          row.push(sub.ue, sub.ia, sub.total, sub.result);
        } else {
          row.push("", "", "", "");
        }
      });
      row.push(student.overall);
      rows.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Results");
    XLSX.writeFile(wb, "results.xlsx");
  };


  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-left">
            <h1 className="dashboard-title">
              {batchInfo?.label || 'Result Dashboard'}
            </h1>
            {batchInfo?.label && (
              <span className="batch-label-badge">{batchInfo.label}</span>
            )}
          </div>
          <button className="export-btn" onClick={exportToExcel} id="export-btn">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 3v9m0 0l-3.5-3.5M9 12l3.5-3.5M3 15h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Export Excel
          </button>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card stat-total">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Total Students</span>
            </div>
          </div>

          <div className="stat-card stat-pass">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.passed}</span>
              <span className="stat-label">Passed</span>
            </div>
          </div>

          <div className="stat-card stat-fail">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.failed}</span>
              <span className="stat-label">Failed</span>
            </div>
          </div>

          <div className="stat-card stat-percent">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.passPercent}%</span>
              <span className="stat-label">Pass Rate</span>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="controls-bar">
          <div className="filter-group">
            <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')} id="filter-all">
              All ({stats.total})
            </button>
            <button className={`filter-btn filter-pass-btn ${filter === 'pass' ? 'active' : ''}`} onClick={() => setFilter('pass')} id="filter-pass">
              Pass ({stats.passed})
            </button>
            <button className={`filter-btn filter-fail-btn ${filter === 'fail' ? 'active' : ''}`} onClick={() => setFilter('fail')} id="filter-fail">
              Fail ({stats.failed})
            </button>
          </div>

          <div className="search-box">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or register number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              id="search-input"
            />
          </div>
        </div>

        {/* Results Table — Expandable Rows */}
        <div className="table-wrapper">
          <table className="results-table" id="results-table">
            <thead>
              <tr>
                <th className="th-sno">S.No</th>
                <th className="th-regno">Register No.</th>
                <th className="th-name">Name</th>
                <th className="th-count">Passed</th>
                <th className="th-count">Failed</th>
                <th className="th-overall">Overall</th>
                <th className="th-expand"></th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((student, idx) => {
                const counts = getSubjectCounts(student);
                const isExpanded = expandedRows.has(student.regno || idx);
                return (
                  <React.Fragment key={student.regno || idx}>
                    <tr
                      className={`row-${student.overall.toLowerCase()} expandable-row ${isExpanded ? 'expanded' : ''}`}
                      onClick={() => toggleRow(student.regno || idx)}
                    >
                      <td className="td-sno">{idx + 1}</td>
                      <td className="td-regno">{student.regno}</td>
                      <td className="td-name">{student.name}</td>
                      <td className="td-count">
                        <span className="count-chip count-pass">{counts.passed}</span>
                      </td>
                      <td className="td-count">
                        <span className={`count-chip count-fail ${counts.failed === 0 ? 'count-zero' : ''}`}>{counts.failed}</span>
                      </td>
                      <td className="td-overall">
                        <span className={`overall-badge ${student.overall === 'PASS' ? 'badge-pass' : student.overall === 'FAIL' ? 'badge-fail' : 'badge-error'}`}>
                          {student.overall}
                        </span>
                      </td>
                      <td className="td-expand">
                        <span className={`expand-icon ${isExpanded ? 'rotated' : ''}`}>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="expanded-detail-row">
                        <td colSpan={7}>
                          <div className="subject-detail-wrapper">
                            <table className="subject-detail-table">
                              <thead>
                                <tr>
                                  <th>Subject Code</th>
                                  <th>UE</th>
                                  <th>IA</th>
                                  <th>Total</th>
                                  <th>Result</th>
                                </tr>
                              </thead>
                              <tbody>
                                {student.subjects.map((sub) => (
                                  <tr key={sub.code} className={sub.result === 'PASS' ? 'sub-pass' : 'sub-fail'}>
                                    <td className="sub-code">{sub.code}</td>
                                    <td className="sub-marks">{sub.ue}</td>
                                    <td className="sub-marks">{sub.ia}</td>
                                    <td className="sub-total">{sub.total}</td>
                                    <td>
                                      <span className={`subject-badge ${sub.result === 'PASS' ? 'badge-pass' : 'badge-fail'}`}>
                                        {sub.result}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          {filteredResults.length === 0 && (
            <div className="no-results">No results match your filters</div>
          )}
        </div>

        {/* Failed Students Section */}
        {failedStudents.length > 0 && (
          <div className="failed-section">
            <h2 className="section-title">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M11 7v4m0 4h.01M21 11a10 10 0 11-20 0 10 10 0 0120 0z" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Failed Students — Subject-wise Breakdown
            </h2>
            <div className="failed-cards">
              {failedStudents.map((student) => (
                <div key={student.regno} className="failed-card">
                  <div className="failed-card-header">
                    <span className="failed-name">{student.name}</span>
                    <span className="failed-regno">{student.regno}</span>
                  </div>
                  <div className="failed-subjects">
                    {student.failedSubjects.map((sub) => (
                      <span key={sub.code} className={`failed-subject-chip ${sub.result === 'AAA' ? 'chip-aaa' : sub.result === 'W' ? 'chip-w' : 'chip-ra'}`}>
                        {sub.code}
                        <span className="chip-result">{sub.result}</span>
                        <span className="chip-total">({sub.total})</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

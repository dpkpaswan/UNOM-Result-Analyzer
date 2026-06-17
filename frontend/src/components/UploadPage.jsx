import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export default function UploadPage({ onComplete }) {
  const { authFetch, API_BASE } = useAuth();
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [examLabel, setExamLabel] = useState('');
  const [scraping, setScraping] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, current_name: '' });
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setFileName(selected.name);
      setError('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.name.endsWith('.csv')) {
      setFile(dropped);
      setFileName(dropped.name);
      setError('');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const startScraping = async () => {
    if (!file) {
      setError('Please select a CSV file first');
      return;
    }
    if (!examLabel.trim()) {
      setError('Please enter an Exam Label (e.g. "Nov 2025 Sem 3")');
      return;
    }

    setScraping(true);
    setError('');
    setProgress({ done: 0, total: 0, current_name: 'Initializing...' });

    // Start SSE listener (no auth needed)
    const evtSource = new EventSource(`${API_BASE}/scrape/progress`);

    evtSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setProgress(data);
      if (data.status === 'complete') {
        evtSource.close();
      }
    };

    evtSource.onerror = () => {};

    // Upload CSV with exam label — uses authFetch for Bearer token
    const formData = new FormData();
    formData.append('file', file);
    formData.append('exam_label', examLabel.trim());

    try {
      const response = await authFetch(`${API_BASE}/scrape`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      evtSource.close();
      onComplete({ ...data, exam_label: examLabel.trim() });
    } catch (err) {
      setError(err.message || 'Failed to scrape results. Make sure the backend is running.');
      setScraping(false);
      evtSource.close();
    }
  };

  const progressPercent = progress.total > 0
    ? Math.round((progress.done / progress.total) * 100)
    : 0;

  return (
    <div className="upload-page">
      <div className="upload-container">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />

        <div className="upload-card">
          <div className="logo-section">
            <div className="logo-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect x="4" y="4" width="32" height="32" rx="8" stroke="url(#grad)" strokeWidth="2.5" fill="none"/>
                <path d="M14 20h12M20 14v12" stroke="url(#grad)" strokeWidth="2.5" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="40" y2="40">
                    <stop stopColor="#818cf8"/>
                    <stop offset="1" stopColor="#c084fc"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 className="app-title">Unom Result Analyzer</h1>
            <p className="app-subtitle">Upload student data to analyze Madras University results</p>
          </div>

          {!scraping ? (
            <>
              {/* Exam Label Input */}
              <div className="exam-label-group">
                <label htmlFor="exam-label" className="input-label">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 4h12M2 8h12M2 12h8" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Exam Label <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="exam-label"
                  className="exam-label-input"
                  placeholder='e.g. "Nov 2025 Sem 3"'
                  value={examLabel}
                  onChange={(e) => setExamLabel(e.target.value)}
                />
              </div>

              <div
                className="dropzone"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  id="csv-upload"
                />
                <div className="dropzone-icon">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <path d="M24 32V16m0 0l-8 8m8-8l8 8" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 32v4a4 4 0 004 4h24a4 4 0 004-4v-4" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                {fileName ? (
                  <p className="file-selected">
                    <span className="file-icon">📄</span> {fileName}
                  </p>
                ) : (
                  <>
                    <p className="dropzone-text">Drop your CSV file here or click to browse</p>
                    <p className="dropzone-hint">Supports .csv files</p>
                  </>
                )}
              </div>

              <div className="csv-format-hint">
                <div className="hint-header">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="#818cf8" strokeWidth="1.5"/>
                    <path d="M8 7v4M8 5.5v.01" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span>Expected CSV format</span>
                </div>
                <code className="csv-example">
                  regno,dob,name<br/>
                  422400294,12/10/2005,DEEPAK PASWAN<br/>
                  422400295,15/03/2004,RAHUL KUMAR
                </code>
              </div>

              {error && <div className="error-message">{error}</div>}

              <button
                className="start-btn"
                onClick={startScraping}
                disabled={!file || !examLabel.trim()}
                id="start-scraping-btn"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 3v14m0 0l-5-5m5 5l5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="rotate(180,10,10)"/>
                </svg>
                Start Scraping
              </button>
            </>
          ) : (
            <div className="progress-section">
              <div className="progress-header">
                <div className="spinner" />
                <span className="progress-title">Fetching Results...</span>
              </div>

              <div className="progress-label-badge">{examLabel}</div>

              <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${progressPercent}%` }}>
                  <div className="progress-bar-glow" />
                </div>
              </div>

              <div className="progress-info">
                <span className="progress-count">
                  Fetching <strong>{progress.done}</strong> of <strong>{progress.total}</strong>
                </span>
                {progress.current_name && (
                  <span className="progress-name">— {progress.current_name}</span>
                )}
              </div>

              <p className="progress-note">
                This may take a while. Each student is fetched with a 1.5s delay to respect the server.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

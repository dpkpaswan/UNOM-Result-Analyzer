import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';
import Navbar from './components/Navbar';
import UploadPage from './components/UploadPage';
import Dashboard from './components/Dashboard';
import ComparePage from './components/ComparePage';
import AdminPanel from './components/AdminPanel';
import Sidebar from './components/Sidebar';

function AppContent() {
  const { user, authFetch, toast, API_BASE } = useAuth();
  const [page, setPage] = useState('upload');
  const [results, setResults] = useState(null);
  const [batchInfo, setBatchInfo] = useState(null);
  const [batches, setBatches] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const fetchBatches = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/batches`);
      const data = await res.json();
      setBatches(data);
    } catch (err) {
      console.error('Failed to fetch batches:', err);
    }
  }, [authFetch, API_BASE]);

  useEffect(() => {
    if (user) fetchBatches();
  }, [user, fetchBatches]);

  const handleScrapeComplete = (data) => {
    setResults(data.results);
    setBatchInfo({ id: data.batch_id, label: data.exam_label });
    setPage('dashboard');
    fetchBatches();
  };

  const handleSelectBatch = async (batch) => {
    try {
      const res = await authFetch(`${API_BASE}/batches/${batch.id}`);
      const data = await res.json();
      setResults(data.results);
      setBatchInfo({ id: batch.id, label: batch.label });
      setPage('dashboard');
    } catch (err) {
      console.error('Failed to load batch:', err);
    }
  };

  const handleDeleteBatch = async (batchId) => {
    try {
      await authFetch(`${API_BASE}/batches/${batchId}`, { method: 'DELETE' });
      fetchBatches();
      if (batchInfo && batchInfo.id === batchId) {
        setPage('upload');
        setResults(null);
        setBatchInfo(null);
      }
    } catch (err) {
      console.error('Failed to delete batch:', err);
    }
  };

  const handleNewAnalysis = () => {
    setPage('upload');
    setResults(null);
    setBatchInfo(null);
  };

  const handleCompare = () => {
    setPage('compare');
  };

  const handleAdmin = () => {
    setPage('admin');
  };

  // Not logged in → show login
  if (!user) {
    return (
      <>
        <LoginPage />
        {toast && (
          <div className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="app-wrapper">
      <Navbar />
      <div className="app-layout">
        <Sidebar
          batches={batches}
          activeBatchId={batchInfo?.id}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onSelectBatch={handleSelectBatch}
          onDeleteBatch={handleDeleteBatch}
          onNewAnalysis={handleNewAnalysis}
          onCompare={handleCompare}
          onAdmin={handleAdmin}
          currentPage={page}
          isAdmin={user.role === 'admin'}
        />
        <main className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
          {page === 'upload' && (
            <UploadPage onComplete={handleScrapeComplete} />
          )}
          {page === 'dashboard' && results && (
            <Dashboard
              results={results}
              batchInfo={batchInfo}
              onBack={handleNewAnalysis}
            />
          )}
          {page === 'compare' && (
            <ComparePage batches={batches} />
          )}
          {page === 'admin' && user.role === 'admin' && (
            <AdminPanel />
          )}
        </main>
      </div>
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

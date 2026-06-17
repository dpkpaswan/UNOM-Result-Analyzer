import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const roleColors = {
    admin: { bg: 'rgba(248, 113, 113, 0.12)', border: 'rgba(248, 113, 113, 0.3)', color: '#f87171' },
    teacher: { bg: 'rgba(52, 211, 153, 0.12)', border: 'rgba(52, 211, 153, 0.3)', color: '#34d399' },
  };

  const roleStyle = roleColors[user.role] || roleColors.teacher;

  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar-left">
        <div className="navbar-brand">
          <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
            <rect x="4" y="4" width="32" height="32" rx="8" stroke="url(#ng)" strokeWidth="2.5" fill="none"/>
            <path d="M14 20h12M20 14v12" stroke="url(#ng)" strokeWidth="2.5" strokeLinecap="round"/>
            <defs><linearGradient id="ng" x1="0" y1="0" x2="40" y2="40"><stop stopColor="#818cf8"/><stop offset="1" stopColor="#c084fc"/></linearGradient></defs>
          </svg>
          <span className="navbar-title">UNOM Analyzer</span>
        </div>
      </div>

      <div className="navbar-right">
        <span
          className="navbar-badge dept-badge"
          title="Department"
        >
          {user.department}
        </span>

        <span className="navbar-username">{user.username}</span>

        <span
          className="navbar-badge role-badge"
          style={{ background: roleStyle.bg, borderColor: roleStyle.border, color: roleStyle.color }}
        >
          {user.role}
        </span>

        <button className="navbar-logout-btn" onClick={logout} id="logout-btn">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 14H3.5A1.5 1.5 0 012 12.5v-9A1.5 1.5 0 013.5 2H6M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Logout
        </button>
      </div>
    </nav>
  );
}

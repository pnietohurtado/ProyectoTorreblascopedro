import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/authContext';

const Sidebar = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Usuario';
  const userEmail = currentUser?.email || '';
  const userInitial = userName[0].toUpperCase();

  const navItems = [
    { path: '/', label: 'Eventos', icon: '▦' },
    { path: '/support', label: 'Soporte', icon: '?' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="w-80 h-full bg-[#0D0E22] text-white p-6 flex flex-col gap-10 border-r border-white/5 z-20 shadow-2xl">
      <button
        type="button"
        onClick={() => navigate('/profile')}
        className={`flex items-center gap-4 rounded-2xl p-2 text-left transition ${
          isActive('/profile') ? 'bg-[#232440] ring-1 ring-purple-500/30' : 'hover:bg-white/5'
        }`}
      >
        <div className="w-12 h-12 bg-[#4A236D] rounded-full flex items-center justify-center text-lg font-bold shadow-lg shadow-purple-900/50">
          {userInitial}
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-bold text-lg leading-tight">{userName}</span>
          <span className="truncate text-xs text-gray-400">{userEmail}</span>
        </div>
      </button>

      <nav className="flex flex-col gap-3 flex-1">
        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider px-4 mb-2">Menú principal</p>

        {navItems.map((item) => (
          <button
            key={item.path}
            type="button"
            onClick={() => navigate(item.path)}
            className={`flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-300 group ${
              isActive(item.path)
                ? 'bg-[#4A236D] text-purple-100 shadow-md border border-purple-500/30'
                : 'text-gray-400 hover:bg-[#232440] hover:text-white'
            }`}
          >
            <span className="text-xl font-black group-hover:scale-110 transition-transform">{item.icon}</span>
            <span className={isActive(item.path) ? 'font-semibold' : 'font-medium'}>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="text-center text-xs text-gray-600 py-4">v1.0.0</div>
    </div>
  );
};

export default Sidebar;

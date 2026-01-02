const Sidebar = () => {
  return (
    <div className="w-80 h-full bg-[#0D0E22] text-white p-6 flex flex-col gap-10 border-r border-white/5 z-20 shadow-2xl">
      {/* Perfil */}
      <div className="flex items-center gap-4 p-2">
        <div className="w-12 h-12 bg-[#4A236D] rounded-full flex items-center justify-center text-lg font-bold shadow-lg shadow-purple-900/50">
          A
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg leading-tight">Admin</span>
          <span className="text-xs text-gray-400">Administrador</span>
        </div>
      </div>

      {/* Menú */}
      <nav className="flex flex-col gap-3 flex-1">
        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider px-4 mb-2">Menú principal</p>

        <button className="flex items-center gap-4 bg-[#4A236D] text-purple-100 p-4 rounded-2xl text-left transition-all duration-300 shadow-md border border-purple-500/30 group">
          <span className="text-xl group-hover:scale-110 transition-transform">📅</span>
          <span className="font-semibold">Eventos</span>
        </button>

        <button className="flex items-center gap-4 text-gray-400 p-4 rounded-2xl hover:bg-[#232440] hover:text-white text-left transition-all duration-300 group">
          <span className="text-xl group-hover:scale-110 transition-transform">⚙️</span>
          <span className="font-medium">Ajustes</span>
        </button>
      </nav>

      {/* Footer / Version */}
      <div className="text-center text-xs text-gray-600 py-4">
        v1.0.0
      </div>
    </div>
  );
};

export default Sidebar;
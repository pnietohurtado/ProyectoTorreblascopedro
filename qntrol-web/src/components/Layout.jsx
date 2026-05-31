import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div className="flex h-screen w-full bg-[#0D0E22] overflow-hidden selection:bg-purple-500 selection:text-white">
      <Sidebar />
      <main className="flex-1 flex flex-col relative overflow-hidden bg-gradient-to-tr from-[#0D0E22] via-[#1a1b3a] to-[#3B1C57]">
        {/* Capa de ruido o textura suave */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none"></div>
        <div className="relative z-10 flex-1 flex flex-col overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div className="flex h-screen w-full bg-[#1e1a3a] overflow-hidden selection:bg-purple-500 selection:text-white">

      <Sidebar />

      <main className="flex-1 flex flex-col relative overflow-hidden bg-gradient-to-br from-[#3B1C57] to-[#803DBD]">

        <div className="absolute inset-0 bg-white/5 pointer-events-none"></div>

        <div className="relative z-10 flex-1 flex flex-col overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
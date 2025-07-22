
import React, { createContext, useContext, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  BarChart3, 
  Package, 
  Plus, 
  History, 
  X,
  Settings,
  LogOut
} from 'lucide-react';

interface SidebarContextType {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  isMobile: boolean;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
};

interface SidebarProviderProps {
  children: React.ReactNode;
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggle = () => setIsOpen(!isOpen);
  const close = () => setIsOpen(false);

  return (
    <SidebarContext.Provider value={{ isOpen, toggle, close, isMobile }}>
      {children}
    </SidebarContext.Provider>
  );
}

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentUser: { username: string } | null;
  onLogout: () => void;
  isDark: boolean;
  toggleTheme: () => void;
}

export function Sidebar({ activeTab, onTabChange, currentUser, onLogout, isDark, toggleTheme }: SidebarProps) {
  const { isOpen, close, isMobile } = useSidebar();

  const menuItems = [
    { id: "dashboard", icon: BarChart3 },
    { id: "produtos", icon: Package },
    { id: "add-produtos", icon: Plus },
    { id: "historico", icon: History },
  ];

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    if (isMobile) {
      close();
    }
  };

  // Desktop sidebar
  if (!isMobile) {
    return (
      <aside className="fixed left-0 top-0 h-full w-20 z-50 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 rounded-r-3xl shadow-lg">
        <div className="flex flex-col h-full items-center py-6">
          {/* Logo no topo */}
          <div className="mb-8">
            <div className="w-12 h-12 bg-[#121212] rounded-2xl flex items-center justify-center p-2">
              <img 
                src="/assets/logo.png" 
                alt="orgaN Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Navigation Icons */}
          <nav className="flex-1 flex flex-col items-center space-y-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200",
                    "hover:scale-105",
                    isActive 
                      ? "bg-[#119423] text-white shadow-lg shadow-[#119423]/25" 
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  )}
                >
                  <Icon className="w-5 h-5" />
                </button>
              );
            })}
          </nav>

          {/* Bottom actions */}
          <div className="flex flex-col items-center space-y-3 mt-auto">
            <button 
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-all duration-200 hover:scale-105"
            >
              <span className="text-sm">{isDark ? '☀️' : '🌙'}</span>
            </button>
            
            <button 
              onClick={onLogout}
              className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center transition-all duration-200 hover:scale-105"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // Mobile menu suspenso
  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Overlay para mobile - clica fora para fechar */}
      <div 
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-md"
        onClick={close}
      />

      {/* Menu suspenso centralizado */}
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={close}
      >
        <div 
          className={cn(
            "bg-[#1a1a1a] rounded-3xl p-6 shadow-2xl border border-gray-700",
            "flex flex-col items-center space-y-6",
            "animate-in zoom-in-95 duration-200",
            "min-w-[280px]"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Logo no topo */}
          <div className="mb-4">
            <div className="w-16 h-16 bg-[#121212] rounded-full flex items-center justify-center p-3">
              <img 
                src="/assets/logo.png" 
                alt="orgaN Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Navigation Icons */}
          <div className="flex flex-col items-center space-y-6">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200",
                    "hover:scale-110",
                    isActive 
                      ? "bg-[#119423] text-white shadow-lg shadow-[#119423]/30" 
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 shadow-md"
                  )}
                >
                  <Icon className="w-6 h-6" />
                </button>
              );
            })}
          </div>

          {/* Bottom actions */}
          <div className="flex items-center space-x-6 mt-8 pt-6 border-t border-gray-600">
            <button 
              onClick={toggleTheme}
              className="w-12 h-12 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-md"
            >
              <span className="text-lg">{isDark ? '☀️' : '🌙'}</span>
            </button>
            
            <button 
              onClick={onLogout}
              className="w-12 h-12 rounded-full bg-red-500 text-white hover:bg-red-600 flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-md"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Componente para o botão mobile (logo no bottom)
export function MobileMenuButton() {
  const { toggle, isMobile } = useSidebar();

  if (!isMobile) return null;

  return (
    <button
      onClick={toggle}
      className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-30 md:hidden"
    >
      <div className="w-16 h-16 bg-[#121212] rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all duration-200 p-3 border-2 border-white/10">
        <img 
          src="/assets/logo.png" 
          alt="orgaN Logo" 
          className="w-full h-full object-contain"
        />
      </div>
    </button>
  );
}

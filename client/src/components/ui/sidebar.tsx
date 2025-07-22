import React, { createContext, useContext, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  BarChart3, 
  Package, 
  Plus, 
  History, 
  X,
  Menu
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
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "produtos", label: "Produtos", icon: Package },
    { id: "add-produtos", label: "Add Produtos", icon: Plus },
    { id: "historico", label: "Histórico", icon: History },
  ];

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    if (isMobile) {
      close();
    }
  };

  if (!isOpen && isMobile) {
    return null;
  }

  return (
    <>
      {/* Overlay para mobile */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 h-full z-50 transition-all duration-300 ease-in-out",
        "glass-card border-r border-r-[var(--c-border)] backdrop-blur-xl",
        isMobile ? "w-72" : "w-64",
        !isMobile && "relative"
      )}>
        <div className="flex flex-col h-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 app-logo rounded-xl flex items-center justify-center">
                <img 
                  src="/assets/logo.png" 
                  alt="orgaN Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <h1 className="text-xl font-bold" style={{ 
                fontFamily: 'Almarai, sans-serif',
                color: 'var(--text-primary)'
              }}>orgaN</h1>
            </div>

            {isMobile && (
              <button 
                onClick={close}
                className="w-8 h-8 glass-button rounded-lg flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                    "text-left font-medium",
                    isActive 
                      ? "bg-gradient-to-r from-[#119423] to-[#22c55e] text-white shadow-lg" 
                      : "text-[var(--text-secondary)] hover:bg-[var(--c-accent)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Footer - User Info */}
          <div className="border-t border-[var(--c-border)] pt-4 space-y-3">
            <div className="flex items-center gap-3 px-4 py-2">
              <div className="w-8 h-8 bg-gradient-to-r from-[#119423] to-[#22c55e] rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {currentUser?.username || 'Usuário'}
              </span>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={toggleTheme}
                className="flex-1 glass-button text-xs py-2 px-3 rounded-lg"
              >
                {isDark ? '☀️' : '🌙'}
              </button>
              <button 
                onClick={onLogout}
                className="flex-1 glass-button text-xs py-2 px-3 rounded-lg text-red-500 hover:bg-red-50"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </aside>
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
      <div className="w-14 h-14 app-logo rounded-full flex items-center justify-center shadow-lg animate-pulse">
        <img 
          src="/assets/logo.png" 
          alt="orgaN Logo" 
          className="w-8 h-8 object-contain"
        />
      </div>
    </button>
  );
}
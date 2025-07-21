import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  Package, 
  Plus, 
  History, 
  DollarSign,
  ShoppingCart 
} from "lucide-react";

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "dashboard", label: "Dashboard Principal", icon: BarChart3, color: "#3b82f6" },
  { id: "produtos", label: "Produtos", icon: Package, color: "#10b981" },
  { id: "add-produtos", label: "Add Produtos", icon: Plus, color: "#f59e0b" },
  { id: "historico", label: "Histórico", icon: History, color: "#8b5cf6" },
];

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <nav className="neomorphic-card rounded-2xl p-2 mb-8">
      <div className="flex flex-wrap justify-center gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center space-x-2 px-4 py-3 rounded-xl transition-all duration-200",
                "text-sm font-medium border-0 outline-none focus:outline-none",
                isActive
                  ? "text-white shadow-inner"
                  : "text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
              )}
              style={{
                backgroundColor: isActive ? tab.color : 'var(--bg-light)',
                color: isActive ? 'white' : 'var(--text-primary)',
                boxShadow: isActive 
                  ? 'inset 2px 2px 6px rgba(0,0,0,0.3), inset -2px -2px 6px rgba(255,255,255,0.1)'
                  : '4px 4px 8px rgba(0,0,0,0.1), -4px -4px 8px rgba(255,255,255,0.9)',
                transform: isActive ? 'scale(0.98)' : 'scale(1)',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
```
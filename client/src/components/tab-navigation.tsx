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
  { id: "dashboard", label: "Dashboard Principal", icon: BarChart3 },
  { id: "produtos", label: "Produtos", icon: Package },
  { id: "add-produtos", label: "Add Produtos", icon: Plus },
  { id: "historico", label: "Histórico de Compra", icon: History },
  { id: "financeiro", label: "Financeiro", icon: DollarSign },
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
                "text-sm font-medium",
                isActive
                  ? "neomorphic-pressed text-white"
                  : "neomorphic-button hover:neomorphic-hover"
              )}
              style={{
                backgroundColor: isActive ? 'var(--primary-action)' : 'transparent',
                color: isActive ? 'white' : 'var(--text-primary)',
                boxShadow: isActive 
                  ? 'inset 2px 2px 4px var(--c-dark), inset -2px -2px 4px var(--c-light)'
                  : 'var(--neomorphic-shadow)'
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
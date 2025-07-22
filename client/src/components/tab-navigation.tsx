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
    <div className="tab-navigation">
      <div className="flex space-x-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 tab-button ${
              activeTab === tab.id ? 'active' : ''
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
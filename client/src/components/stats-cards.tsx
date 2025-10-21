import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Package, ShoppingCart, DollarSign, Calendar } from "lucide-react";
import type { SelectProduct } from "@shared/schema";

// Helper function to format currency (assuming this exists elsewhere or needs to be defined)
// For this example, let's define a simple version if it's not provided by context.
const formatCurrency = (value: number | undefined): string => {
  if (value === undefined) return "R$ -";
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export function StatsCards() {
  const authToken = localStorage.getItem("authToken");
  const userId = localStorage.getItem("userId");

  const { data: products = [] } = useQuery<SelectProduct[]>({
    queryKey: ["/api/products"],
    queryFn: () => fetch("/api/products", {
      headers: {
        "x-auth-token": authToken || ""
      }
    }).then(res => res.json()),
    enabled: !!authToken,
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/products/stats"],
    queryFn: () => fetch(`/api/products/stats/${userId}`, {
      headers: {
        "x-auth-token": authToken || ""
      }
    }).then(res => res.json()),
    enabled: !!authToken && !!userId,
  });

  const purchasedProducts = products.filter(p => p.isPurchased);
  const pendingProducts = products.filter(p => !p.isPurchased);
  const totalValue = products.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
  const purchasedValue = purchasedProducts.reduce((sum, p) => sum + (Number(p.price) || 0), 0);

  const statsData = [
    {
      title: "Total de Produtos",
      value: products.length,
      icon: Package,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      description: "Produtos cadastrados"
    },
    {
      title: "Produtos Comprados",
      value: purchasedProducts.length,
      icon: ShoppingCart,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      description: "Produtos adquiridos"
    },
    {
      title: "Produtos Pendentes",
      value: pendingProducts.length,
      icon: Calendar,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
      description: "Aguardando compra"
    },
    {
      title: "Valor Total",
      value: `R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      icon: DollarSign,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      description: "Valor estimado total"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="stats-grid">
      {statsData.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title} className={`neomorphic-card hover:shadow-lg transition-all duration-300 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 p-4 sm:p-6 rounded-2xl`} data-testid={`stat-card-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
            <CardContent className="p-0"> {/* Removed padding from CardContent to apply to the outer div */}
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${stat.bgColor} dark:bg-gray-700 dark:bg-opacity-50`} data-testid={`stat-icon-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  <Icon className={`h-6 w-6 ${stat.color} dark:text-gray-300`} aria-hidden="true" />
                </div>
                <Badge variant="secondary" className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" data-testid={`stat-badge-${index}`}>
                  {index === 0 && "Total"}
                  {index === 1 && "Comprados"}
                  {index === 2 && "Pendentes"}
                  {index === 3 && "Estimativa"}
                </Badge>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400" data-testid={`stat-title-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  {stat.title}
                </p>
                <div className="flex items-end gap-2">
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 break-words" data-testid={`stat-value-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    {stat.value}
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400" data-testid={`stat-description-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  {stat.description}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default StatsCards;
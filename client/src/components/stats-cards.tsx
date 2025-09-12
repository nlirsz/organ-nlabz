
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Package, ShoppingCart, DollarSign, Calendar } from "lucide-react";
import type { SelectProduct } from "@shared/schema";

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
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: "Produtos cadastrados"
    },
    {
      title: "Produtos Comprados",
      value: purchasedProducts.length,
      icon: ShoppingCart,
      color: "text-green-600",
      bgColor: "bg-green-50",
      description: "Produtos adquiridos"
    },
    {
      title: "Produtos Pendentes",
      value: pendingProducts.length,
      icon: Calendar,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      description: "Aguardando compra"
    },
    {
      title: "Valor Total",
      value: `R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      description: "Valor estimado total"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title} className="neomorphic-card hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <Badge variant="secondary" className="text-xs">
                  {index === 0 && "Total"}
                  {index === 1 && "Comprados"}
                  {index === 2 && "Pendentes"}
                  {index === 3 && "Estimativa"}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">
                  {stat.title}
                </p>
                <div className="flex items-end gap-2">
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </div>
                <p className="text-xs text-gray-500">
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

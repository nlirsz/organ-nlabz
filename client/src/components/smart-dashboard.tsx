
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ShoppingCart, 
  DollarSign, 
  TrendingUp, 
  Package,
  Star,
  Target,
  Calendar,
  CreditCard,
  BarChart3,
  PieChart,
  Activity,
  Zap
} from 'lucide-react';

interface Product {
  id: number;
  name: string;
  price: string;
  store: string;
  isPurchased: boolean;
  category?: string;
  paymentMethod?: string;
  installments?: number;
  purchaseDate?: string;
}

interface Stats {
  totalItems: number;
  purchasedItems: number;
  estimatedTotal: number;
}

export function SmartDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const authToken = localStorage.getItem("authToken");
  const userId = localStorage.getItem("userId");

  useEffect(() => {
    const fetchData = async () => {
      console.log("SmartDashboard: Verificando autenticação:", {
        hasToken: !!authToken,
        hasUserId: !!userId,
        tokenLength: authToken?.length || 0,
        userId
      });

      if (!authToken || !userId) {
        console.log("SmartDashboard: Dados de autenticação ausentes");
        setLoading(false);
        return;
      }

      try {
        console.log("SmartDashboard: Carregando dados...", { userId });
        
        const [productsRes, statsRes] = await Promise.all([
          fetch("/api/products", {
            headers: { "x-auth-token": authToken }
          }),
          fetch(`/api/products/stats/${userId}`, {
            headers: { "x-auth-token": authToken }
          })
        ]);

        console.log("SmartDashboard: Respostas recebidas:", {
          productsOk: productsRes.ok,
          productsStatus: productsRes.status,
          statsOk: statsRes.ok,
          statsStatus: statsRes.status
        });

        if (productsRes.ok && statsRes.ok) {
          const productsData = await productsRes.json();
          const statsData = await statsRes.json();
          
          console.log("SmartDashboard: Produtos carregados:", productsData);
          console.log("SmartDashboard: Stats carregadas:", statsData);
          
          setProducts(productsData);
          setStats(statsData);
        }
      } catch (error) {
        console.error("SmartDashboard: Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authToken, userId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!authToken || !userId) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Acesso Restrito
        </h3>
        <p className="text-gray-500">
          Faça login para visualizar o dashboard
        </p>
      </div>
    );
  }

  const totalValue = stats?.estimatedTotal || 0;
  const purchasedItems = stats?.purchasedItems || 0;
  const totalItems = stats?.totalItems || 0;
  const pendingItems = totalItems - purchasedItems;
  const completionRate = totalItems > 0 ? (purchasedItems / totalItems) * 100 : 0;

  const categoryBreakdown = products.reduce((acc: Record<string, number>, product) => {
    const category = product.category || 'Outros';
    acc[category] = (acc[category] || 0) + parseFloat(product.price);
    return acc;
  }, {});

  const topCategories = Object.entries(categoryBreakdown)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Cards de Estatísticas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <ShoppingCart className="h-8 w-8 text-blue-600" />
              </div>
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                <Activity className="h-3 w-3 mr-1" />
                Ativo
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Total de Itens</p>
              <div className="flex items-end gap-2">
                <p className="text-4xl font-bold text-gray-900">{totalItems}</p>
                <div className="flex items-center text-green-600 text-sm font-medium mb-1">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +12%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <Package className="h-8 w-8 text-green-600" />
              </div>
              <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                <Target className="h-3 w-3 mr-1" />
                Meta
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Comprados</p>
              <div className="flex items-end gap-2">
                <p className="text-4xl font-bold text-gray-900">{purchasedItems}</p>
                <div className="flex items-center text-blue-600 text-sm font-medium mb-1">
                  <BarChart3 className="h-4 w-4 mr-1" />
                  {completionRate.toFixed(0)}%
                </div>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
              <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">
                <Zap className="h-3 w-3 mr-1" />
                Pendente
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Pendentes</p>
              <div className="flex items-end gap-2">
                <p className="text-4xl font-bold text-gray-900">{pendingItems}</p>
                <div className="flex items-center text-orange-600 text-sm font-medium mb-1">
                  <PieChart className="h-4 w-4 mr-1" />
                  Lista
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-500/10 rounded-xl">
                <DollarSign className="h-8 w-8 text-orange-600" />
              </div>
              <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200">
                <CreditCard className="h-3 w-3 mr-1" />
                Total
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Valor Total</p>
              <div className="flex items-end gap-2">
                <p className="text-4xl font-bold text-gray-900">
                  R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <div className="flex items-center text-green-600 text-sm font-medium mb-1">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +5%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights e Análises */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Top Categorias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCategories.map(([category, value], index) => (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      index === 0 ? 'bg-blue-500' : 
                      index === 1 ? 'bg-green-500' : 'bg-purple-500'
                    }`}></div>
                    <span className="font-medium">{category}</span>
                  </div>
                  <span className="text-lg font-semibold">
                    R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Resumo Inteligente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-800 mb-1">Progresso da Lista</p>
                <p className="text-blue-600">
                  Você completou {completionRate.toFixed(0)}% da sua lista de compras
                </p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-800 mb-1">Economia Detectada</p>
                <p className="text-green-600">
                  Produtos em promoção podem gerar economia de até R$ 200
                </p>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm font-medium text-purple-800 mb-1">Sugestão</p>
                <p className="text-purple-600">
                  Considere agrupar compras por loja para otimizar custos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

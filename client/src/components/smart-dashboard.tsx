
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ShoppingCart, 
  DollarSign, 
  TrendingUp, 
  Package,
  Calendar,
  CreditCard,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Target,
  TrendingDown,
  Percent,
  MapPin,
  Clock,
  Tag
} from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface Product {
  id: number;
  name: string;
  price: string;
  originalPrice?: string;
  store: string;
  isPurchased: boolean;
  category?: string;
  paymentMethod?: string;
  installments?: number;
  purchaseDate?: string;
  createdAt?: string;
}

interface Stats {
  totalItems: number;
  purchasedItems: number;
  estimatedTotal: number;
}

interface FinanceData {
  mes_ano: string;
  receita: number;
  gastos: number;
}

interface InstallmentData {
  value: number;
  due_date: string;
  productName: string;
}

export function SmartDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [finances, setFinances] = useState<FinanceData[]>([]);
  const [installments, setInstallments] = useState<InstallmentData[]>([]);
  const [loading, setLoading] = useState(true);

  const authToken = localStorage.getItem("authToken");
  const userId = localStorage.getItem("userId");

  useEffect(() => {
    const fetchData = async () => {
      if (!authToken || !userId) {
        setLoading(false);
        return;
      }

      try {
        const [productsRes, statsRes, financesRes, installmentsRes] = await Promise.all([
          fetch("/api/products", {
            headers: { "x-auth-token": authToken }
          }),
          fetch(`/api/products/stats/${userId}`, {
            headers: { "x-auth-token": authToken }
          }),
          fetch("/api/finances", {
            headers: { "x-auth-token": authToken }
          }),
          fetch("/api/installments", {
            headers: { "x-auth-token": authToken }
          })
        ]);

        if (productsRes.ok && statsRes.ok) {
          const productsData = await productsRes.json();
          const statsData = await statsRes.json();
          
          setProducts(productsData);
          setStats(statsData);
        }

        if (financesRes.ok) {
          const financesData = await financesRes.json();
          setFinances(financesData);
        }

        if (installmentsRes.ok) {
          const installmentsData = await installmentsRes.json();
          setInstallments(installmentsData);
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
          {[...Array(8)].map((_, i) => (
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

  // Cálculos das métricas
  const purchasedProducts = products.filter(p => p.isPurchased);
  const pendingProducts = products.filter(p => !p.isPurchased);
  
  const totalValue = products.reduce((sum, p) => sum + parseFloat(p.price || '0'), 0);
  const purchasedValue = purchasedProducts.reduce((sum, p) => sum + parseFloat(p.price || '0'), 0);
  const pendingValue = pendingProducts.reduce((sum, p) => sum + parseFloat(p.price || '0'), 0);

  // Produtos adicionados no mês atual
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthProducts = products.filter(p => 
    p.createdAt && p.createdAt.startsWith(currentMonth)
  );
  const currentMonthValue = currentMonthProducts.reduce((sum, p) => sum + parseFloat(p.price || '0'), 0);

  // Parcelas do mês atual
  const currentMonthInstallments = installments.filter(inst => 
    inst.due_date && inst.due_date.startsWith(currentMonth)
  );
  const currentMonthInstallmentsValue = currentMonthInstallments.reduce((sum, inst) => sum + inst.value, 0);

  // Última compra
  const lastPurchase = purchasedProducts
    .filter(p => p.purchaseDate)
    .sort((a, b) => new Date(b.purchaseDate!).getTime() - new Date(a.purchaseDate!).getTime())[0];

  // Categorias
  const categoryStats = products.reduce((acc: Record<string, {
    total: number,
    purchased: number,
    pending: number,
    totalValue: number,
    purchasedValue: number,
    pendingValue: number
  }>, product) => {
    const category = product.category || 'Outros';
    if (!acc[category]) {
      acc[category] = { total: 0, purchased: 0, pending: 0, totalValue: 0, purchasedValue: 0, pendingValue: 0 };
    }
    
    acc[category].total++;
    acc[category].totalValue += parseFloat(product.price || '0');
    
    if (product.isPurchased) {
      acc[category].purchased++;
      acc[category].purchasedValue += parseFloat(product.price || '0');
    } else {
      acc[category].pending++;
      acc[category].pendingValue += parseFloat(product.price || '0');
    }
    
    return acc;
  }, {});

  const topCategoryByItems = Object.entries(categoryStats)
    .sort(([,a], [,b]) => b.total - a.total)[0];
  const topCategoryByPurchased = Object.entries(categoryStats)
    .sort(([,a], [,b]) => b.purchased - a.purchased)[0];

  // Lojas
  const storeStats = products.reduce((acc: Record<string, {
    total: number,
    purchased: number,
    pending: number,
    totalValue: number,
    purchasedValue: number,
    pendingValue: number
  }>, product) => {
    const store = product.store || 'Outros';
    if (!acc[store]) {
      acc[store] = { total: 0, purchased: 0, pending: 0, totalValue: 0, purchasedValue: 0, pendingValue: 0 };
    }
    
    acc[store].total++;
    acc[store].totalValue += parseFloat(product.price || '0');
    
    if (product.isPurchased) {
      acc[store].purchased++;
      acc[store].purchasedValue += parseFloat(product.price || '0');
    } else {
      acc[store].pending++;
      acc[store].pendingValue += parseFloat(product.price || '0');
    }
    
    return acc;
  }, {});

  // Descontos
  const totalDiscount = products.reduce((sum, p) => {
    const original = parseFloat(p.originalPrice || p.price || '0');
    const current = parseFloat(p.price || '0');
    return sum + (original - current);
  }, 0);

  // Dados para gráfico financeiro
  const financeChartData = {
    labels: finances.map(f => {
      const date = new Date(f.mes_ano + '-01');
      return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    }),
    datasets: [
      {
        label: 'Receita',
        data: finances.map(f => f.receita),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.1,
      },
      {
        label: 'Gastos',
        data: finances.map(f => f.gastos),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.1,
      },
      {
        label: 'Saldo',
        data: finances.map(f => f.receita - f.gastos),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1,
      }
    ]
  };

  // Dados para gráfico de categorias
  const categoryChartData = {
    labels: Object.keys(categoryStats),
    datasets: [{
      data: Object.values(categoryStats).map(cat => cat.purchasedValue),
      backgroundColor: [
        '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
        '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
      ],
    }]
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-8">
      {/* Cards Principais de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total de Produtos */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Package className="h-8 w-8 text-blue-600" />
              </div>
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                Total
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Total de Produtos</p>
              <p className="text-4xl font-bold text-gray-900">{products.length}</p>
            </div>
          </CardContent>
        </Card>

        {/* Produtos Comprados */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <ShoppingCart className="h-8 w-8 text-green-600" />
              </div>
              <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                Comprados
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Produtos Comprados</p>
              <p className="text-4xl font-bold text-gray-900">{purchasedProducts.length}</p>
              <Progress value={(purchasedProducts.length / products.length) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Produtos Pendentes */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-500/10 rounded-xl">
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
              <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200">
                Pendentes
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Produtos Pendentes</p>
              <p className="text-4xl font-bold text-gray-900">{pendingProducts.length}</p>
            </div>
          </CardContent>
        </Card>

        {/* Valor Comprado */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                Gasto
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Valor Comprado</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(purchasedValue)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Valor Pendente */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-orange-500/5"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-500/10 rounded-xl">
                <TrendingUp className="h-8 w-8 text-yellow-600" />
              </div>
              <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                Aguardando
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Valor Pendente</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(pendingValue)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Produtos Adicionados no Mês */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
              <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">
                Este Mês
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Produtos do Mês</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(currentMonthValue)}</p>
              <p className="text-xs text-gray-500">{currentMonthProducts.length} itens</p>
            </div>
          </CardContent>
        </Card>

        {/* Parcelas do Mês */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-blue-500/5"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-indigo-500/10 rounded-xl">
                <CreditCard className="h-8 w-8 text-indigo-600" />
              </div>
              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                Parcelas
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Parcelas do Mês</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(currentMonthInstallmentsValue)}</p>
              <p className="text-xs text-gray-500">{currentMonthInstallments.length} parcelas</p>
            </div>
          </CardContent>
        </Card>

        {/* Total de Descontos */}
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-pink-500/5"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-rose-500/10 rounded-xl">
                <Percent className="h-8 w-8 text-rose-600" />
              </div>
              <Badge variant="secondary" className="bg-rose-50 text-rose-700 border-rose-200">
                Economia
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Total de Descontos</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalDiscount)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards de Informações Específicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Última Compra */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Última Compra
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastPurchase ? (
              <div className="space-y-2">
                <p className="font-semibold">{lastPurchase.name}</p>
                <p className="text-sm text-gray-600">{formatCurrency(parseFloat(lastPurchase.price))}</p>
                <p className="text-xs text-gray-500">
                  {new Date(lastPurchase.purchaseDate!).toLocaleDateString('pt-BR')}
                </p>
              </div>
            ) : (
              <p className="text-gray-500">Nenhuma compra registrada</p>
            )}
          </CardContent>
        </Card>

        {/* Categoria com Mais Itens */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Top Categoria (Itens)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCategoryByItems ? (
              <div className="space-y-2">
                <p className="font-semibold">{topCategoryByItems[0]}</p>
                <p className="text-sm text-gray-600">{topCategoryByItems[1].total} produtos</p>
                <p className="text-xs text-gray-500">
                  {formatCurrency(topCategoryByItems[1].totalValue)} total
                </p>
              </div>
            ) : (
              <p className="text-gray-500">Sem dados</p>
            )}
          </CardContent>
        </Card>

        {/* Categoria com Mais Comprados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Top Categoria (Comprados)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCategoryByPurchased ? (
              <div className="space-y-2">
                <p className="font-semibold">{topCategoryByPurchased[0]}</p>
                <p className="text-sm text-gray-600">{topCategoryByPurchased[1].purchased} comprados</p>
                <p className="text-xs text-gray-500">
                  {formatCurrency(topCategoryByPurchased[1].purchasedValue)} gasto
                </p>
              </div>
            ) : (
              <p className="text-gray-500">Sem dados</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico Financeiro Mensal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Evolução Financeira Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <Line 
                data={financeChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: function(value) {
                          return formatCurrency(Number(value));
                        }
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Gastos por Categoria */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Gastos por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <Doughnut 
                data={categoryChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right' as const,
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabelas Detalhadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gastos por Categoria */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Detalhes por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(categoryStats)
                .sort(([,a], [,b]) => b.purchasedValue - a.purchasedValue)
                .map(([category, data]) => (
                  <div key={category} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">{category}</h4>
                      <Badge variant="outline">{data.total} itens</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Comprados: {data.purchased}</p>
                        <p className="font-medium text-green-600">
                          {formatCurrency(data.purchasedValue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Pendentes: {data.pending}</p>
                        <p className="font-medium text-orange-600">
                          {formatCurrency(data.pendingValue)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Média: {formatCurrency(data.purchasedValue / (data.purchased || 1))}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Gastos por Loja */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Detalhes por Loja
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(storeStats)
                .sort(([,a], [,b]) => b.purchasedValue - a.purchasedValue)
                .map(([store, data]) => (
                  <div key={store} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">{store}</h4>
                      <Badge variant="outline">{data.total} itens</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Comprados: {data.purchased}</p>
                        <p className="font-medium text-green-600">
                          {formatCurrency(data.purchasedValue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Pendentes: {data.pending}</p>
                        <p className="font-medium text-orange-600">
                          {formatCurrency(data.pendingValue)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

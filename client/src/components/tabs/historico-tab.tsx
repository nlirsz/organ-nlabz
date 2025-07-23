import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  Zap,
  Eye,
  ExternalLink,
  Edit,
  Info
} from 'lucide-react';
import { CategoryProductsModal } from '@/components/category-products-modal';
import { StoreProductsModal } from '@/components/store-products-modal';
import { EditProductWithPaymentModal } from '@/components/edit-product-with-payment-modal';
import { PriceHistoryChart } from '@/components/price-history-chart';
import { InstallmentsTimeline } from '@/components/installments-timeline';
import { ProfileCard } from '@/components/ui/profile-card';

// Componente TiltCard para efeito 3D no desktop
const TiltCard = ({ children, className = "", ...props }: any) => {
  const [transform, setTransform] = useState("");

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 20;
    const rotateY = (centerX - x) / 20;

    setTransform(
      `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`
    );
  };

  const handleMouseLeave = () => {
    setTransform("");
  };

  return (
    <div
      className={`hidden md:block transition-transform duration-300 ease-out ${className}`}
      style={{ transform }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </div>
  );
};

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
  imageUrl?: string;
  url?: string;
}

interface FinanceData {
  id: number;
  productId: number;
  paymentMethod: string;
  installments: number;
  installmentValue: number;
  purchaseDate: string;
  product: Product;
}

interface CategoryStats {
  [key: string]: {
    total: number;
    count: number;
  };
}

interface StoreStats {
  [key: string]: {
    total: number;
    count: number;
  };
}

export function HistoricoTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [financeData, setFinanceData] = useState<FinanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [storeModalOpen, setStoreModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedPaymentData, setSelectedPaymentData] = useState<any>(null);

  const authToken = localStorage.getItem("authToken");
  const userId = localStorage.getItem("userId");

  useEffect(() => {
    const fetchData = async () => {
      console.log("Products data:", {
        total: products.length,
        purchased: products.filter(p => p.isPurchased).length,
        pending: products.filter(p => !p.isPurchased).length,
        purchasedProducts: products.filter(p => p.isPurchased).map(p => ({ id: p.id, name: p.name, isPurchased: p.isPurchased }))
      });

      if (!authToken || !userId) {
        setLoading(false);
        return;
      }

      try {
        const [productsRes, financeRes] = await Promise.all([
          fetch("/api/products", {
            headers: { "x-auth-token": authToken }
          }),
          fetch(`/api/finance/${userId}`, {
            headers: { "x-auth-token": authToken }
          })
        ]);

        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData);
        }

        if (financeRes.ok) {
          const financeData = await financeRes.json();
          console.log("Finances data received:", financeData);
          setFinanceData(financeData);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
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
          Faça login para visualizar o histórico
        </p>
      </div>
    );
  }

  const purchasedProducts = products.filter(product => product.isPurchased);
  const totalSpent = purchasedProducts.reduce((sum, product) => sum + parseFloat(product.price), 0);
  const totalProducts = purchasedProducts.length;

  // Estatísticas por categoria
  const categoryStats: CategoryStats = purchasedProducts.reduce((acc, product) => {
    const category = product.category || 'Outros';
    if (!acc[category]) {
      acc[category] = { total: 0, count: 0 };
    }
    acc[category].total += parseFloat(product.price);
    acc[category].count += 1;
    return acc;
  }, {} as CategoryStats);

  // Estatísticas por loja
  const storeStats: StoreStats = purchasedProducts.reduce((acc, product) => {
    const store = product.store || 'Desconhecida';
    if (!acc[store]) {
      acc[store] = { total: 0, count: 0 };
    }
    acc[store].total += parseFloat(product.price);
    acc[store].count += 1;
    return acc;
  }, {} as StoreStats);

  const topCategories = Object.entries(categoryStats)
    .sort(([,a], [,b]) => b.total - a.total)
    .slice(0, 5);

  const topStores = Object.entries(storeStats)
    .sort(([,a], [,b]) => b.total - a.total)
    .slice(0, 5);

  const averageSpent = totalProducts > 0 ? totalSpent / totalProducts : 0;

  // Produtos filtrados baseados na categoria/loja selecionada
  const getFilteredProducts = () => {
    if (selectedCategory) {
      return purchasedProducts.filter(p => (p.category || 'Outros') === selectedCategory);
    }
    if (selectedStore) {
      return purchasedProducts.filter(p => p.store === selectedStore);
    }
    return [];
  };

  const handleEditProduct = async (product: Product) => {
    setSelectedProduct(product);

    // Buscar dados de pagamento se o produto estiver comprado
    if (product.isPurchased) {
      try {
        const response = await fetch(`/api/payments/product/${product.id}`, {
          headers: { "x-auth-token": authToken || "" }
        });

        if (response.ok) {
          const paymentData = await response.json();
          setSelectedPaymentData(paymentData);
        } else {
          setSelectedPaymentData(null);
        }
      } catch (error) {
        console.error("Erro ao buscar dados de pagamento:", error);
        setSelectedPaymentData(null);
      }
    } else {
      setSelectedPaymentData(null);
    }

    setEditModalOpen(true);
  };

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setViewModalOpen(true);
  };

  const handleProductUpdated = () => {
    // Recarregar dados após atualização
    const fetchData = async () => {
      if (!authToken || !userId) return;

      try {
        const productsRes = await fetch("/api/products", {
          headers: { "x-auth-token": authToken }
        });

        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData);
        }
      } catch (error) {
        console.error("Erro ao recarregar produtos:", error);
      }
    };

    fetchData();
  };

  return (
    <div className="space-y-8">
      {/* Cards de Estatísticas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <ShoppingCart className="h-8 w-8 text-green-600" />
              </div>
              <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                <Activity className="h-3 w-3 mr-1" />
                Comprados
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Total Produtos</p>
              <div className="flex items-end gap-2">
                <p className="text-4xl font-bold text-gray-900">{totalProducts}</p>
                <div className="flex items-center text-green-600 text-sm font-medium mb-1">
                  <Package className="h-4 w-4 mr-1" />
                  Itens
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                <CreditCard className="h-3 w-3 mr-1" />
                Gasto
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Total Gasto</p>
              <div className="flex items-end gap-2">
                <p className="text-4xl font-bold text-gray-900">
                  R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <div className="flex items-center text-blue-600 text-sm font-medium mb-1">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Total
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
              <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">
                <Target className="h-3 w-3 mr-1" />
                Média
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Gasto Médio</p>
              <div className="flex items-end gap-2">
                <p className="text-4xl font-bold text-gray-900">
                  R$ {averageSpent.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <div className="flex items-center text-purple-600 text-sm font-medium mb-1">
                  <PieChart className="h-4 w-4 mr-1" />
                  /Item
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
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
              <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200">
                <Star className="h-3 w-3 mr-1" />
                Status
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Este Mês</p>
              <div className="flex items-end gap-2">
                <p className="text-4xl font-bold text-gray-900">{totalProducts}</p>
                <div className="flex items-center text-orange-600 text-sm font-medium mb-1">
                  <Zap className="h-4 w-4 mr-1" />
                  Novos
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Análises por Categoria e Loja */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Gastos por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCategories.map(([category, stats], index) => (
                <div key={category} className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        index === 0 ? 'bg-blue-500' : 
                        index === 1 ? 'bg-green-500' : 
                        index === 2 ? 'bg-purple-500' : 
                        index === 3 ? 'bg-orange-500' : 'bg-red-500'
                      }`}></div>
                      <span className="font-medium">{category}</span>
                      <Badge variant="outline">{stats.count} itens</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">
                        R$ {stats.total.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedCategory(category);
                          setCategoryModalOpen(true);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Progress 
                    value={(stats.total / totalSpent) * 100} 
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Gastos por Loja
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topStores.map(([store, stats], index) => (
                <div key={store} className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        index === 0 ? 'bg-green-500' : 
                        index === 1 ? 'bg-blue-500' : 
                        index === 2 ? 'bg-purple-500' : 
                        index === 3 ? 'bg-orange-500' : 'bg-red-500'
                      }`}></div>
                      <span className="font-medium">{store}</span>
                      <Badge variant="outline">{stats.count} itens</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">
                        R$ {stats.total.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedStore(store);
                          setStoreModalOpen(true);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Progress 
                    value={(stats.total / totalSpent) * 100} 
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline de Parcelas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Timeline de Parcelas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InstallmentsTimeline />
        </CardContent>
      </Card>

      {/* Lista de Produtos Comprados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Produtos Comprados ({purchasedProducts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {purchasedProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum produto comprado ainda
              </h3>
              <p className="text-gray-500">
                Quando você marcar produtos como comprados, eles aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {purchasedProducts.map((product) => (
                <div key={product.id}>
                  {/* Card com tilt para desktop */}
                  <TiltCard className="hidden md:block">
                    <ProfileCard className="bg-gradient-to-br from-green-900/90 to-emerald-900/90 border-green-700/50 hover:border-green-500/60 h-full">
                      <div className="p-4 h-full flex flex-col">
                        <div className="flex items-start gap-4">
                          {product.imageUrl && (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-20 h-20 object-cover rounded-lg flex-shrink-0 cursor-pointer"
                              onClick={() => handleViewProduct(product)}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-base leading-tight mb-2 line-clamp-2 cursor-pointer hover:text-green-300 text-white"
                                    onClick={() => handleViewProduct(product)}>
                                  {product.name}
                                </h4>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="secondary" className="text-xs bg-green-600/30 text-green-200 border-green-500/40">
                                    {product.category || 'Outros'}
                                  </Badge>
                                  <span className="text-sm text-gray-300">{product.store}</span>
                                </div>
                              </div>
                              <div className="flex-shrink-0">
                                <span className="text-xl font-bold text-green-300 whitespace-nowrap">
                                  R$ {parseFloat(product.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-white/10 space-y-3">
                              <div className="flex items-center justify-center text-xs text-gray-400">
                                <Calendar className="w-3 h-3 mr-1" />
                                Comprado em {new Date(product.createdAt).toLocaleDateString('pt-BR')}
                              </div>
                              <div className="flex items-center justify-center gap-3 px-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleViewProduct(product)}
                                  title="Ver detalhes"
                                  className="h-9 w-9 p-0 hover:bg-green-500/20 text-gray-300 hover:text-green-300 transition-all duration-200 hover:scale-110"
                                >
                                  <Info className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditProduct(product)}
                                  title="Editar produto"
                                  className="h-9 w-9 p-0 hover:bg-green-500/20 text-gray-300 hover:text-green-300 transition-all duration-200 hover:scale-110"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditProduct(product)}
                                  title="Gerenciar pagamento"
                                  className="h-9 w-9 p-0 hover:bg-green-500/20 text-gray-300 hover:text-green-300 transition-all duration-200 hover:scale-110"
                                >
                                  <CreditCard className="h-4 w-4" />
                                </Button>
                                {product.url && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => window.open(product.url, '_blank')}
                                    title="Ver no site"
                                    className="h-9 w-9 p-0 hover:bg-green-500/20 text-gray-300 hover:text-green-300 transition-all duration-200 hover:scale-110"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </ProfileCard>
                  </TiltCard>

                  {/* Card normal para mobile */}
                  <div className="md:hidden">
                    <ProfileCard className="bg-gradient-to-br from-green-900/90 to-emerald-900/90 border-green-700/50 hover:border-green-500/60 h-full">
                      <div className="p-4 h-full flex flex-col">
                        <div className="flex items-start gap-4">
                          {product.imageUrl && (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-20 h-20 object-cover rounded-lg flex-shrink-0 cursor-pointer"
                              onClick={() => handleViewProduct(product)}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-base leading-tight mb-2 line-clamp-2 cursor-pointer hover:text-green-300 text-white"
                                    onClick={() => handleViewProduct(product)}>
                                  {product.name}
                                </h4>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="secondary" className="text-xs bg-green-600/30 text-green-200 border-green-500/40">
                                    {product.category || 'Outros'}
                                  </Badge>
                                  <span className="text-sm text-gray-300">{product.store}</span>
                                </div>
                              </div>
                              <div className="flex-shrink-0">
                                <span className="text-xl font-bold text-green-300 whitespace-nowrap">
                                  R$ {parseFloat(product.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-white/10 space-y-3">
                              <div className="flex items-center justify-center text-xs text-gray-400">
                                <Calendar className="w-3 h-3 mr-1" />
                                Comprado em {new Date(product.createdAt).toLocaleDateString('pt-BR')}
                              </div>
                              <div className="flex items-center justify-center gap-3 px-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleViewProduct(product)}
                                  title="Ver detalhes"
                                  className="h-9 w-9 p-0 hover:bg-green-500/20 text-gray-300 hover:text-green-300 transition-all duration-200 hover:scale-110"
                                >
                                  <Info className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditProduct(product)}
                                  title="Editar produto"
                                  className="h-9 w-9 p-0 hover:bg-green-500/20 text-gray-300 hover:text-green-300 transition-all duration-200 hover:scale-110"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditProduct(product)}
                                  title="Gerenciar pagamento"
                                  className="h-9 w-9 p-0 hover:bg-green-500/20 text-gray-300 hover:text-green-300 transition-all duration-200 hover:scale-110"
                                >
                                  <CreditCard className="h-4 w-4" />
                                </Button>
                                {product.url && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => window.open(product.url, '_blank')}
                                    title="Ver no site"
                                    className="h-9 w-9 p-0 hover:bg-green-500/20 text-gray-300 hover:text-green-300 transition-all duration-200 hover:scale-110"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </ProfileCard>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modais */}
      <CategoryProductsModal
        isOpen={categoryModalOpen}
        onClose={() => {
          setCategoryModalOpen(false);
          setSelectedCategory(null);
        }}
        category={selectedCategory || ''}
        products={getFilteredProducts()}
      />

      <StoreProductsModal
        isOpen={storeModalOpen}
        onClose={() => {
          setStoreModalOpen(false);
          setSelectedStore(null);
        }}
        store={selectedStore || ''}
        products={getFilteredProducts()}
      />

      {/* Modal de Edição com Pagamento */}
      {selectedProduct && (
        <EditProductWithPaymentModal
          product={selectedProduct}
          paymentData={selectedPaymentData}
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedProduct(null);
            setSelectedPaymentData(null);
          }}
          onProductUpdated={handleProductUpdated}
        />
      )}

      {/* Modal de Visualização */}
      {selectedProduct && (
        <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedProduct.name}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Imagem do produto */}
              {selectedProduct.imageUrl && (
                <div className="flex justify-center">
                  <img 
                    src={selectedProduct.imageUrl} 
                    alt={selectedProduct.name}
                    className="max-w-full max-h-64 object-contain rounded-lg"
                  />
                </div>
              )}

              {/* Informações do produto */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Preço</h3>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {parseFloat(selectedProduct.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  {selectedProduct.originalPrice && selectedProduct.originalPrice !== selectedProduct.price && (
                    <p className="text-gray-500 line-through">
                      R$ {parseFloat(selectedProduct.originalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Loja</h3>
                  <p className="text-gray-600">{selectedProduct.store || 'Não informado'}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Categoria</h3>
                  <Badge variant="secondary">{selectedProduct.category || 'Outros'}</Badge>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Prioridade</h3>
                  <Badge variant={
                    selectedProduct.priority === 'high' ? 'destructive' :
                    selectedProduct.priority === 'medium' ? 'default' : 'secondary'
                  }>
                    {selectedProduct.priority === 'high' ? 'Alta' :
                     selectedProduct.priority === 'medium' ? 'Média' : 'Baixa'}
                  </Badge>
                </div>
              </div>

              {/* Descrição */}
              {selectedProduct.description && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Descrição</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{selectedProduct.description}</p>
                </div>
              )}

              {/* Notas */}
              {selectedProduct.notes && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Notas</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{selectedProduct.notes}</p>
                </div>
              )}

              {/* Gráfico de Histórico de Preços */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-4">Histórico de Preços</h3>
                <PriceHistoryChart productId={selectedProduct.id} />
              </div>

              {/* Link para o produto */}
              {selectedProduct.url && (
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={() => window.open(selectedProduct.url, '_blank')}
                    className="w-full md:w-auto"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver no Site Original
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default HistoricoTab;
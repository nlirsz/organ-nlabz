import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Edit, ExternalLink, Check, RotateCcw, ShoppingCart, Heart, TrendingUp, RefreshCw, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { EditProductWithPaymentModal } from "./edit-product-with-payment-modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { PriceHistoryChart } from "@/components/price-history-chart";
import { useFavorites } from "@/components/favorites-system";
import type { Product } from "@shared/schema";

interface ProductCardProps {
  product: Product;
  onProductUpdated: () => void;
  onReScrape?: (id: number) => void;
}

export function ProductCard({ product, onProductUpdated, onReScrape }: ProductCardProps) {
  const [isChecked, setIsChecked] = useState(product.isPurchased);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [isReScrapingLoading, setIsReScrapingLoading] = useState(false);

  const updateProductMutation = useMutation({
    mutationFn: async (updates: Partial<Product>) => {
      const response = await apiRequest("PUT", `/api/products/${product.id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", 1] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/stats", 1] });
      onProductUpdated();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar produto",
        variant: "destructive",
      });
      setIsChecked(product.isPurchased);
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/products/${product.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", 1] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/stats", 1] });
      onProductUpdated();
      toast({
        title: "Sucesso",
        description: "Produto removido da sua lista",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao excluir produto",
        variant: "destructive",
      });
    },
  });

  const handlePurchaseToggle = () => {
    const newStatus = !isChecked;
    setIsChecked(newStatus);
    updateProductMutation.mutate({ isPurchased: newStatus });
  };

  const handleDelete = () => {
    if (window.confirm("Tem certeza que deseja remover este produto?")) {
      deleteProductMutation.mutate();
    }
  };

  const formatPrice = (price: string | null) => {
    if (!price || price === "0" || price === "0.00") return "Preço não disponível";
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice === 0) return "Preço não disponível";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numPrice);
  };

  const getCategoryDisplay = (category: string) => {
    const categoryMap: Record<string, string> = {
      'Geral': 'Geral',
      'Casa': 'Casa e Decoração',
      'Roupas': 'Roupas e Acessórios',
      'Eletronicos': 'Eletrônicos',
      'Games': 'Games',
      'Livros': 'Livros',
      'Presentes': 'Presentes'
    };
    return categoryMap[category] || category;
  };

  const isPurchased = isChecked;

  const handleReScrape = async () => {
    if (!onReScrape || isReScrapingLoading) return;

    setIsReScrapingLoading(true);
    try {
      await onReScrape(product.id);
    } finally {
      setIsReScrapingLoading(false);
    }
  };

  // Buscar dados de pagamento quando o produto estiver comprado
  const { data: paymentData } = useQuery({
    queryKey: [`/api/payments/product/${product.id}`, product.id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/payments/product/${product.id}`);
      return response.json();
    },
    enabled: isPurchased && isEditModalOpen, // Só busca quando o modal estiver aberto e produto comprado
  });

  return (
    <div className="product-card slide-in-up">
      <div className="flex flex-col h-full">
        {/* Image Section */}
        <div className="relative mb-3 md:mb-4">
          <img
            src={product.imageUrl || 'https://via.placeholder.com/400x300/e0e5ec/6c757d?text=Sem+Imagem'}
            alt={product.name}
            className="w-full h-32 md:h-36 object-contain rounded-lg p-2"
            style={{ backgroundColor: 'white' }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://via.placeholder.com/400x300/ffffff/6c757d?text=Sem+Imagem';
              target.style.backgroundColor = 'white';
            }}
          />
          {product.isPurchased && (
            <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
              ✓ Comprado
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 space-y-2 md:space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <h3 className="font-semibold text-base md:text-lg leading-tight line-clamp-2 text-gray-800 dark:text-gray-200 flex-1 min-w-0">
              {product.name}
            </h3>
            <span className="category-tag text-xs whitespace-nowrap">
              {getCategoryDisplay(product.category)}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline gap-2 flex-wrap">
              {product.price ? (
                <>
                  <span className="text-lg md:text-xl font-bold" style={{ color: 'var(--primary-action)' }}>
                    {formatPrice(product.price)}
                  </span>
                  {product.originalPrice && product.originalPrice !== product.price && (
                    <span className="text-sm text-gray-500 line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-base md:text-lg text-gray-500">Preço não disponível</span>
              )}
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium truncate">
              📱 {product.store}
            </p>

            {product.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                {product.description}
              </p>
            )}
          </div>
        </div>

        {/* Actions Section */}
        <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t"
           style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
          <div className="flex flex-col sm:flex-row gap-2">
            {!product.isPurchased ? (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePurchaseToggle();
                  }}
                  className="w-full sm:flex-1 neomorphic-button-primary"
                  disabled={updateProductMutation.isPending}
                >
                  {updateProductMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                  {updateProductMutation.isPending ? "Comprando..." : "Comprar"}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditModalOpen(true);
                    }}
                    className="flex-1 sm:flex-none neomorphic-button"
                    title="Editar produto"
                  >
                    <Edit className="w-4 h-4" style={{ color: 'var(--edit-color)' }} />
                    <span className="sm:hidden">Editar</span>
                  </button>
                  {isPurchased && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditModalOpen(true);
                      }}
                      className="flex-1 sm:flex-none neomorphic-button"
                      title="Gerenciar pagamento"
                    >
                      <CreditCard className="w-4 h-4" style={{ color: 'var(--primary-action)' }} />
                      <span className="sm:hidden">Pagamento</span>
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                    className="neomorphic-button text-red-600"
                    disabled={deleteProductMutation.isPending}
                  >
                    {deleteProductMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePurchaseToggle();
                  }}
                  className="w-full sm:flex-1 neomorphic-button"
                  disabled={updateProductMutation.isPending}
                >
                  {updateProductMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  {updateProductMutation.isPending ? "Desfazendo..." : "Desfazer"}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditModalOpen(true);
                    }}
                    className="flex-1 sm:flex-none neomorphic-button"
                    title="Editar produto"
                  >
                    <Edit className="w-4 h-4" style={{ color: 'var(--edit-color)' }} />
                    <span className="sm:hidden">Editar</span>
                  </button>
                  {isPurchased && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditModalOpen(true);
                      }}
                      className="flex-1 sm:flex-none neomorphic-button"
                      title="Gerenciar pagamento"
                    >
                      <CreditCard className="w-4 h-4" style={{ color: 'var(--primary-action)' }} />
                      <span className="sm:hidden">Pagamento</span>
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                    className="neomorphic-button text-red-600"
                    disabled={deleteProductMutation.isPending}
                  >
                    {deleteProductMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <EditProductWithPaymentModal
          product={product}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onProductUpdated={onProductUpdated}
        />

        {/* Product Details Modal */}
        <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                {product.name}
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Image */}
              <div className="space-y-4">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-48 object-contain rounded-lg p-4"
                    style={{ backgroundColor: 'white' }}
                  />
                ) : (
                  <div className="w-full h-48 rounded-lg neomorphic-card flex items-center justify-center"
                       style={{ backgroundColor: 'white' }}>
                    <ShoppingCart className="w-16 h-16" style={{ color: 'var(--text-secondary)' }} />
                  </div>
                )}

                {/* Product Actions */}
                <div className="flex gap-2">
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 neomorphic-button px-4 py-2 rounded-lg text-center"
                    style={{ color: 'var(--primary-action)' }}
                  >
                    <ExternalLink className="w-4 h-4 inline mr-2" />
                    Ver Produto
                  </a>
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="neomorphic-button px-4 py-2 rounded-lg"
                    style={{ color: 'var(--edit-color)' }}
                  >
                    <Edit className="w-4 h-4 inline mr-2" />
                    Editar
                  </button>
                </div>
              </div>

              {/* Product Details */}
              <div className="space-y-6">
                {/* Price Info */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Preço
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold" style={{ color: 'var(--primary-action)' }}>
                      {formatPrice(product.price)}
                    </span>
                    {product.originalPrice && product.originalPrice !== product.price && (
                      <span className="text-lg line-through" style={{ color: 'var(--text-secondary)' }}>
                        {formatPrice(product.originalPrice)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Product Info */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                        Loja
                      </label>
                      <p className="text-base" style={{ color: 'var(--text-primary)' }}>
                        {product.store || 'Não informado'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                        Categoria
                      </label>
                      <p className="text-base" style={{ color: 'var(--text-primary)' }}>
                        {getCategoryDisplay(product.category || 'Geral')}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                        Marca
                      </label>
                      <p className="text-base" style={{ color: 'var(--text-primary)' }}>
                        {product.brand || 'Não informado'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                        Prioridade
                      </label>
                      <p className="text-base" style={{ color: 'var(--text-primary)' }}>
                        {product.priority || 'Não informado'}
                      </p>
                    </div>
                  </div>

                  {product.description && (
                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                        Descrição
                      </label>
                      <p className="text-base" style={{ color: 'var(--text-primary)' }}>
                        {product.description}
                      </p>
                    </div>
                  )}

                  {product.notes && (
                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                        Notas
                      </label>
                      <p className="text-base" style={{ color: 'var(--text-primary)' }}>
                        {product.notes}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Adicionado em
                    </label>
                    <p className="text-base" style={{ color: 'var(--text-primary)' }}>
                      {new Date(product.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                {/* Purchase Status */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePurchaseToggle();
                    }}
                    disabled={updateProductMutation.isPending}
                    className={`px-4 py-2 rounded-lg neomorphic-button ${
                      isPurchased ? 'neomorphic-button-primary' : ''
                    }`}
                  >
                    {isPurchased ? (
                      <>
                        <RotateCcw className="w-4 h-4 inline mr-2" style={{ color: 'white' }} />
                        <span style={{ color: 'white' }}>Marcar como não comprado</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 inline mr-2" style={{ color: 'var(--primary-action)' }} />
                        <span style={{ color: 'var(--primary-action)' }}>Marcar como comprado</span>
                      </>
                    )}
                  </button>

                  {isPurchased && (
                    <div className="category-tag" style={{
                      backgroundColor: 'var(--success-color)',
                      color: 'white'
                    }}>
                      COMPRADO
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Price History Chart */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                Histórico de Preços
              </h3>
              <PriceHistoryChart productId={product.id} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
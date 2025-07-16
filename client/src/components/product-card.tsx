import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Edit, ExternalLink, Check, RotateCcw, ShoppingCart, Heart, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PriceHistoryChart } from "@/components/price-history-chart";
import { EditProductModal } from "@/components/edit-product-modal";
import { useFavorites } from "@/components/favorites-system";
import type { Product } from "@shared/schema";

interface ProductCardProps {
  product: Product;
  onProductUpdated: () => void;
}

export function ProductCard({ product, onProductUpdated }: ProductCardProps) {
  const [isChecked, setIsChecked] = useState(product.isPurchased);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isFavorite, toggleFavorite } = useFavorites();

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

  return (
    <div className={`neomorphic-card p-6 ${isPurchased ? 'opacity-75' : ''}`}>
      {/* Header with Category */}
      <div className="flex items-center justify-between mb-4">
        <span className="category-tag text-xs">
          {getCategoryDisplay(product.category || 'Geral')}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(product.id);
          }}
          className={`w-8 h-8 neomorphic-button rounded-full flex items-center justify-center ${
            isFavorite(product.id) ? 'neomorphic-button-primary' : ''
          }`}
          title={isFavorite(product.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        >
          <Heart className={`w-4 h-4 ${isFavorite(product.id) ? 'fill-current text-white' : ''}`} 
                 style={{ color: isFavorite(product.id) ? 'white' : 'var(--primary-action)' }} />
        </button>
      </div>

      {/* Product Image */}
      <div className="mb-4">
        <div className="relative">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-48 object-cover rounded-xl"
              style={{ backgroundColor: 'var(--c-light)' }}
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTAwQzEwNS41MjMgMTAwIDExMCA5NS41MjI4IDExMCA5MEM1MTAgODQuNDc3MiAxMDUuNTIzIDgwIDEwMCA4MEM5NC40NzcyIDgwIDkwIDg0LjQ3NzIgOTAgOTBDOTAgOTUuNTIyOCA5NC40NzcyIDEwMCAxMDAgMTAwWiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNMTM1IDEyMEgxMTVWMTEwSDEzNVYxMjBaIiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik05NSAxMjBINzVWMTEwSDk1VjEyMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
              }}
            />
          ) : (
            <div className="w-full h-48 rounded-xl bg-gray-100 flex items-center justify-center">
              <ShoppingCart className="w-16 h-16 text-gray-400" />
            </div>
          )}
          
          {/* Purchase Status Overlay */}
          {isPurchased && (
            <div className="absolute inset-0 bg-black bg-opacity-30 rounded-xl flex items-center justify-center">
              <div className="bg-green-500 rounded-full p-3">
                <Check className="w-8 h-8 text-white" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="mb-4">
        <h3 className={`font-semibold text-lg mb-2 ${isPurchased ? 'line-through opacity-60' : ''}`} 
            style={{ color: 'var(--text-primary)' }}>
          {product.name}
        </h3>
        
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          {product.store || 'Loja Online'}
        </p>

        <div className="flex items-center justify-between">
          <span className={`text-xl font-bold ${isPurchased ? 'line-through opacity-60' : ''}`} 
                style={{ color: isPurchased ? 'var(--text-secondary)' : 'var(--primary-action)' }}>
            {formatPrice(product.price)}
          </span>
          
          {isPurchased && (
            <span className="text-xs px-2 py-1 rounded-full bg-green-500 text-white">
              COMPRADO
            </span>
          )}
        </div>
      </div>

      {/* Card Actions */}
      <div className="flex items-center justify-between border-t pt-4" 
           style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePurchaseToggle();
          }}
          disabled={updateProductMutation.isPending}
          className={`w-10 h-10 neomorphic-button rounded-full flex items-center justify-center ${
            isPurchased ? 'neomorphic-button-primary' : ''
          }`}
          title={isPurchased ? "Marcar como não comprado" : "Marcar como comprado"}
        >
          {isPurchased ? (
            <RotateCcw className="w-5 h-5" style={{ color: 'white' }} />
          ) : (
            <Check className="w-5 h-5" style={{ color: 'var(--primary-action)' }} />
          )}
        </button>

        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-10 h-10 neomorphic-button rounded-full flex items-center justify-center"
          title="Abrir link do produto"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-5 h-5" style={{ color: 'var(--primary-action)' }} />
        </a>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditModalOpen(true);
          }}
          className="w-10 h-10 neomorphic-button rounded-full flex items-center justify-center"
          title="Editar produto"
        >
          <Edit className="w-5 h-5" style={{ color: 'var(--edit-color)' }} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          disabled={deleteProductMutation.isPending}
          className="w-10 h-10 neomorphic-button rounded-full flex items-center justify-center hover:text-red-500"
          title="Remover produto"
        >
          <Trash2 className="w-5 h-5" style={{ color: 'var(--delete-color)' }} />
        </button>
      </div>

      <EditProductModal
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
                  className="w-full h-64 object-cover rounded-lg"
                  style={{ backgroundColor: 'var(--c-light)' }}
                />
              ) : (
                <div className="w-full h-64 rounded-lg neomorphic-card flex items-center justify-center" 
                     style={{ backgroundColor: 'var(--c-light)' }}>
                  <ShoppingCart className="w-20 h-20" style={{ color: 'var(--text-secondary)' }} />
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
                  onClick={handlePurchaseToggle}
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
  );
}

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Edit, ExternalLink, Check, RotateCcw, ShoppingCart, Heart, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PriceHistoryChart } from "@/components/price-history-chart";
import { useFavorites } from "@/components/favorites-system";
import type { Product } from "@shared/schema";

interface ProductCardProps {
  product: Product;
  onProductUpdated: () => void;
}

export function ProductCard({ product, onProductUpdated }: ProductCardProps) {
  const [isChecked, setIsChecked] = useState(product.isPurchased);
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
    <div className={`neomorphic-card p-0 overflow-hidden card-entering ${isPurchased ? 'opacity-75' : ''}`}>
      {/* Category Tag */}
      <div className="p-4 pb-2">
        <div className="category-tag text-xs">
          {getCategoryDisplay(product.category || 'Geral')}
        </div>
      </div>

      {/* Product Image */}
      <div className="px-4 pb-4">
        <div className="relative">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-48 object-cover rounded-xl neomorphic-card"
              style={{ backgroundColor: 'var(--c-light)' }}
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTAwQzEwNS41MjMgMTAwIDExMCA5NS41MjI4IDExMCA5MEM1MTAgODQuNDc3MiAxMDUuNTIzIDgwIDEwMCA4MEM5NC40NzcyIDgwIDkwIDg0LjQ3NzIgOTAgOTBDOTAgOTUuNTIyOCA5NC40NzcyIDEwMCAxMDAgMTAwWiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNMTM1IDEyMEgxMTVWMTEwSDEzNVYxMjBaIiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik05NSAxMjBINzVWMTEwSDk1VjEyMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
              }}
            />
          ) : (
            <div className="w-full h-48 rounded-xl neomorphic-card flex items-center justify-center" style={{ backgroundColor: 'var(--c-light)' }}>
              <ShoppingCart className="w-16 h-16" style={{ color: 'var(--text-secondary)' }} />
            </div>
          )}
          
          {/* Purchase Status Overlay */}
          {isPurchased && (
            <div className="absolute inset-0 bg-black bg-opacity-30 rounded-xl flex items-center justify-center">
              <div className="bg-white rounded-full p-3" style={{ backgroundColor: 'var(--success-color)' }}>
                <Check className="w-8 h-8 text-white" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="px-4 pb-4">
        <h3 className={`font-semibold text-base mb-2 line-clamp-2 ${isPurchased ? 'line-through opacity-60' : ''}`} 
            style={{ 
              color: 'var(--text-primary)',
              fontFamily: 'Inter, sans-serif'
            }}>
          {product.name}
        </h3>
        
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          {product.store || 'Loja Online'}
        </p>

        <div className="flex items-center justify-between mb-4">
          <div>
            <span className={`text-xl font-bold ${isPurchased ? 'line-through opacity-60' : ''}`} 
                  style={{ 
                    color: isPurchased ? 'var(--text-secondary)' : 'var(--primary-action)',
                    fontFamily: 'Space Grotesk, sans-serif'
                  }}>
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && product.originalPrice !== product.price && (
              <span className="text-sm ml-2 line-through" style={{ color: 'var(--text-secondary)' }}>
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
          
          {isPurchased && (
            <div className="category-tag text-xs" style={{ 
              backgroundColor: 'var(--success-color)', 
              color: 'white',
              boxShadow: 'none'
            }}>
              COMPRADO
            </div>
          )}
        </div>
      </div>

      {/* Card Actions */}
      <div className="px-4 pb-4 flex items-center justify-between border-t" 
           style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
        <button
          onClick={handlePurchaseToggle}
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
        >
          <ExternalLink className="w-5 h-5" style={{ color: 'var(--primary-action)' }} />
        </a>

        <button
          className="w-10 h-10 neomorphic-button rounded-full flex items-center justify-center"
          title="Editar produto"
        >
          <Edit className="w-5 h-5" style={{ color: 'var(--edit-color)' }} />
        </button>

        <button
          onClick={() => toggleFavorite(product.id)}
          className={`w-10 h-10 neomorphic-button rounded-full flex items-center justify-center ${
            isFavorite(product.id) ? 'neomorphic-button-primary' : ''
          }`}
          title={isFavorite(product.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        >
          <Heart className={`w-5 h-5 ${isFavorite(product.id) ? 'fill-current text-white' : ''}`} 
                 style={{ color: isFavorite(product.id) ? 'white' : 'var(--primary-action)' }} />
        </button>

        <Dialog>
          <DialogTrigger asChild>
            <button
              className="w-10 h-10 neomorphic-button rounded-full flex items-center justify-center"
              title="Ver histórico de preços"
            >
              <TrendingUp className="w-5 h-5" style={{ color: 'var(--primary-action)' }} />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Histórico de Preços - {product.name}</DialogTitle>
            </DialogHeader>
            <PriceHistoryChart productId={product.id} />
          </DialogContent>
        </Dialog>

        <button
          onClick={handleDelete}
          disabled={deleteProductMutation.isPending}
          className="w-10 h-10 neomorphic-button rounded-full flex items-center justify-center hover:text-red-500"
          title="Remover produto"
        >
          <Trash2 className="w-5 h-5" style={{ color: 'var(--delete-color)' }} />
        </button>
      </div>
    </div>
  );
}


import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Store, ShoppingCart, Calendar, Tag } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  price: string | null;
  category: string | null;
  store: string | null;
  imageUrl?: string | null;
  isPurchased: boolean | null;
  createdAt: string | Date | null;
}

interface StoreProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: string;
  products: Product[];
}

export function StoreProductsModal({ isOpen, onClose, store, products }: StoreProductsModalProps) {
  const storeProducts = products.filter(product =>
    product.store?.toLowerCase() === store.toLowerCase() && product.isPurchased
  );

  const totalSpent = storeProducts.reduce((sum, product) =>
    sum + (product.price ? parseFloat(product.price) : 0), 0
  );

  const formatPrice = (price: string | number | null) => {
    if (price === null) return 'R$ 0,00';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numPrice || 0);
  };

  const getCategoryColor = (category: string | null) => {
    if (!category) return '#9ca3af';
    const colors: Record<string, string> = {
      'Eletronicos': '#3b82f6',
      'Roupas': '#10b981',
      'Casa': '#f59e0b',
      'Livros': '#8b5cf6',
      'Games': '#ef4444',
      'Presentes': '#ec4899',
      'Geral': '#6b7280',
      'Outros': '#9ca3af'
    };
    return colors[category] || '#9ca3af';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="w-5 h-5 text-purple-500" />
            Produtos - {store}
          </DialogTitle>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{storeProducts.length} produtos</span>
            <span>Total gasto: {formatPrice(totalSpent)}</span>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {storeProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Store className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhum produto comprado nesta loja</p>
            </div>
          ) : (
            storeProducts.map((product) => (
              <div key={product.id} className="neomorphic-card p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 mb-1">
                      {product.name}
                    </h3>

                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{
                          borderColor: getCategoryColor(product.category),
                          color: getCategoryColor(product.category)
                        }}
                      >
                        <Tag className="w-3 h-3 mr-1" />
                        {product.category}
                      </Badge>
                      {product.isPurchased && (
                        <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                          Comprado
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-lg font-bold text-green-600">
                          {formatPrice(product.price)}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          {product.createdAt ? new Date(product.createdAt).toLocaleDateString('pt-BR') : 'Data desconhecida'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

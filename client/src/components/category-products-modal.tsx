
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { ShoppingCart, Store, Calendar } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  price: string;
  category: string;
  store: string;
  imageUrl?: string;
  isPurchased: boolean;
  createdAt: string;
}

interface CategoryProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: string;
  products: Product[];
}

export function CategoryProductsModal({ isOpen, onClose, category, products }: CategoryProductsModalProps) {
  const categoryProducts = products.filter(product => 
    product.category?.toLowerCase() === category.toLowerCase() && product.isPurchased
  );

  const totalSpent = categoryProducts.reduce((sum, product) => 
    sum + (parseFloat(product.price) || 0), 0
  );

  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numPrice || 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-500" />
            Produtos - {category}
          </DialogTitle>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{categoryProducts.length} produtos</span>
            <span>Total gasto: {formatPrice(totalSpent)}</span>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {categoryProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhum produto comprado nesta categoria</p>
            </div>
          ) : (
            categoryProducts.map((product) => (
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
                      <Badge variant="outline" className="text-xs">
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
                        
                        {product.store && (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Store className="w-3 h-3" />
                            {product.store}
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          {new Date(product.createdAt).toLocaleDateString('pt-BR')}
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

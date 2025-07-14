import { useState } from "react";
import { Filter, SortAsc, Share, Download, History, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { CategoryFilter } from "@/components/category-filter";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product } from "@shared/schema";

interface ShoppingListProps {
  products: Product[];
  isLoading: boolean;
  onProductUpdated: () => void;
}

export function ShoppingList({ products, isLoading, onProductUpdated }: ShoppingListProps) {
  const [selectedCategory, setSelectedCategory] = useState("Geral");

  const filteredProducts = selectedCategory === "Geral" 
    ? products 
    : products.filter(product => product.category === selectedCategory);

  if (isLoading) {
    return (
      <section className="neomorphic-card p-8">
        <div className="flex items-center justify-between mb-8">
          <Skeleton className="h-8 w-48" />
          <div className="flex items-center space-x-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
        <div className="product-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="neomorphic-card p-6 rounded-2xl">
              <Skeleton className="h-48 w-full rounded-xl mb-4" />
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-6 w-1/3" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="neomorphic-card p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold mb-2" style={{ 
              fontFamily: 'Almarai, sans-serif',
              color: 'var(--text-primary)'
            }}>
              Meus Produtos
            </h2>
            <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
              Valor Total da Lista: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(filteredProducts.reduce((sum, p) => sum + (p.price ? parseFloat(p.price) : 0), 0))}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="w-12 h-12 neomorphic-button rounded-full flex items-center justify-center">
              <Filter className="w-5 h-5" />
            </button>
            <button className="w-12 h-12 neomorphic-button rounded-full flex items-center justify-center">
              <SortAsc className="w-5 h-5" />
            </button>
            <button className="neomorphic-button-primary px-4 py-2 rounded-xl text-sm font-medium">
              Atualizar Preços
            </button>
          </div>
        </div>

        <CategoryFilter 
          onCategoryChange={setSelectedCategory}
          selectedCategory={selectedCategory}
        />

        {filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 neomorphic-card rounded-full flex items-center justify-center">
              <ShoppingCart className="w-12 h-12" style={{ color: 'var(--text-secondary)' }} />
            </div>
            <h3 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              {selectedCategory === "Geral" ? "Nenhum produto encontrado" : `Nenhum produto em "${selectedCategory}"`}
            </h3>
            <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
              {selectedCategory === "Geral" ? "Adicione alguns produtos à sua lista!" : `Adicione produtos na categoria "${selectedCategory}".`}
            </p>
          </div>
        ) : (
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onProductUpdated={onProductUpdated}
              />
            ))}
          </div>
        )}
      </section>

      {filteredProducts.length > 0 && (
        <section className="flex flex-col sm:flex-row gap-4">
          <button className="flex-1 neomorphic-button py-3 rounded-xl">
            <Share className="w-4 h-4 mr-2" />
            Compartilhar Lista
          </button>
          <button className="flex-1 neomorphic-button py-3 rounded-xl">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
          <button className="flex-1 neomorphic-button py-3 rounded-xl">
            <History className="w-4 h-4 mr-2" />
            Ver Histórico
          </button>
        </section>
      )}
    </>
  );
}

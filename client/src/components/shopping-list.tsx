import { useState } from "react";
import { Filter, SortAsc, Share, Download, History, ShoppingCart, Search, X, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "price" | "date">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showSearch, setShowSearch] = useState(false);

  const filteredProducts = products
    .filter(product => {
      const matchesCategory = selectedCategory === "Geral" || product.category === selectedCategory;
      const matchesSearch = searchTerm === "" || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.store && product.store.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      let result = 0;
      switch (sortBy) {
        case "price":
          const priceA = a.price ? parseFloat(a.price) : 0;
          const priceB = b.price ? parseFloat(b.price) : 0;
          result = priceA - priceB;
          break;
        case "date":
          result = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        default:
          result = a.name.localeCompare(b.name);
      }
      return sortOrder === "asc" ? result : -result;
    });

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
            <button 
              onClick={() => setShowSearch(!showSearch)}
              className={`w-12 h-12 neomorphic-button rounded-full flex items-center justify-center ${showSearch ? 'neomorphic-button-primary' : ''}`}
              title="Buscar produtos"
            >
              <Search className="w-5 h-5" />
            </button>
            <button 
              onClick={() => {
                if (sortBy === "name") {
                  setSortBy("price");
                  setSortOrder("desc");
                } else if (sortBy === "price") {
                  setSortBy("date");
                  setSortOrder("desc");
                } else {
                  setSortBy("name");
                  setSortOrder("asc");
                }
              }}
              className="w-12 h-12 neomorphic-button rounded-full flex items-center justify-center"
              title={`Ordenando por ${sortBy === "name" ? "nome" : sortBy === "price" ? "preço" : "data"} (${sortOrder === "asc" ? "crescente" : "decrescente"})`}
            >
              {sortOrder === "asc" ? <ArrowUp className="w-5 h-5" /> : <ArrowDown className="w-5 h-5" />}
            </button>
            <button className="neomorphic-button-primary px-4 py-2 rounded-xl text-sm font-medium flex items-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <span>Atualizar Preços</span>
            </button>
          </div>
        </div>

        {showSearch && (
          <div className="mb-6 neomorphic-card p-4 rounded-2xl">
            <div className="flex items-center space-x-3">
              <Search className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              <Input
                placeholder="Buscar por nome, loja ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="neomorphic-input flex-1"
                style={{ 
                  backgroundColor: 'var(--c-primary)',
                  color: 'var(--text-primary)',
                  border: 'none'
                }}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm("")}
                  className="w-8 h-8 neomorphic-button rounded-full flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sort Indicator */}
        <div className="mb-4 flex items-center justify-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1 neomorphic-card rounded-full text-sm">
            <span style={{ color: 'var(--text-secondary)' }}>Ordenado por:</span>
            <span style={{ color: 'var(--primary-action)' }} className="font-medium">
              {sortBy === "name" ? "Nome" : sortBy === "price" ? "Preço" : "Data"}
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>
              ({sortOrder === "asc" ? "A-Z" : "Z-A"})
            </span>
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

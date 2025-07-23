import { useState, useMemo, useCallback } from "react";
import { Filter, SortAsc, Share, Download, History, ShoppingCart, Search, X, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product } from "@shared/schema";

interface ShoppingListProps {
  products: Product[];
  isLoading: boolean;
  onProductUpdated: () => void;
}

export function ShoppingList({ products, isLoading, onProductUpdated }: ShoppingListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "price" | "date">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showFilters, setShowFilters] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="neomorphic-card p-6 rounded-2xl">
              <Skeleton className="h-48 w-full rounded-lg mb-4" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    
    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.store?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => {
      let result = 0;
      if (sortBy === "price") {
        const aPrice = parseFloat(a.price || "0");
        const bPrice = parseFloat(b.price || "0");
        result = aPrice - bPrice;
      } else if (sortBy === "date") {
        result = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      } else {
        result = a.name.localeCompare(b.name);
      }
      return sortOrder === "asc" ? result : -result;
    });
  }, [products, searchTerm, sortBy, sortOrder]);

  const totalValue = useMemo(() => {
    return filteredProducts.reduce((sum, product) => {
      return sum + (product.price ? parseFloat(product.price) : 0);
    }, 0);
  }, [filteredProducts]);

  const handleSort = useCallback((newSortBy: "name" | "price" | "date") => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(newSortBy);
      setSortOrder("asc");
    }
  }, [sortBy, sortOrder]);

  const getSortIcon = useCallback((field: "name" | "price" | "date") => {
    if (sortBy !== field) return <ArrowUpDown className="w-4 h-4" />;
    return sortOrder === "asc" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  }, [sortBy, sortOrder]);

  return (
    <div className="space-y-6">
      {/* Search and Controls */}
      <div className="neomorphic-card p-6 rounded-2xl space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Buscar produtos, lojas ou descrições..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 neomorphic-input"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-6 w-6"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Sort Controls */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={sortBy === "name" ? "default" : "outline"}
            size="sm"
            onClick={() => handleSort("name")}
            className="neomorphic-button flex items-center gap-1"
          >
            Nome {getSortIcon("name")}
          </Button>
          <Button
            variant={sortBy === "price" ? "default" : "outline"}
            size="sm"
            onClick={() => handleSort("price")}
            className="neomorphic-button flex items-center gap-1"
          >
            Preço {getSortIcon("price")}
          </Button>
          <Button
            variant={sortBy === "date" ? "default" : "outline"}
            size="sm"
            onClick={() => handleSort("date")}
            className="neomorphic-button flex items-center gap-1"
          >
            Data {getSortIcon("date")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="neomorphic-button flex items-center gap-1 ml-auto"
          >
            <Filter className="w-4 h-4" />
            Filtros
          </Button>
        </div>

        {/* Summary */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-4 border-t">
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Mostrando {filteredProducts.length} de {products.length} produtos
          </div>
          <div className="text-lg font-semibold" style={{ color: 'var(--primary-action)' }}>
            Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 neomorphic-card rounded-full flex items-center justify-center">
            <ShoppingCart className="w-8 h-8" style={{ color: 'var(--text-secondary)' }} />
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto disponível'}
          </h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            {searchTerm ? 'Tente ajustar os filtros de busca' : 'Adicione alguns produtos à sua lista'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onProductUpdated={onProductUpdated}
            />
          ))}
        </div>
      )}
    </div>
  );
}
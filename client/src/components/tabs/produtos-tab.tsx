import { useState } from 'react';
import { ShoppingList } from "@/components/shopping-list";
import { AdvancedSearch } from '@/components/advanced-search';
import { FavoritesSystem, useFavorites } from '@/components/favorites-system';
import { CategoryFilter } from '@/components/category-filter';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, Search, Filter, Package } from 'lucide-react';
import type { Product } from "@shared/schema";

interface ProdutosTabProps {
  products: Product[];
  isLoading: boolean;
  onProductUpdated: () => void;
}

export function ProdutosTab({ products, isLoading, onProductUpdated }: ProdutosTabProps) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [filteredProducts, setFilteredProducts] = useState(products);
  const [activeView, setActiveView] = useState('all');
  const { toggleFavorite } = useFavorites();

  const handleSearch = (filters: any) => {
    let filtered = [...products];

    // Filtro por texto
    if (filters.query) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(filters.query.toLowerCase()) ||
        p.store?.toLowerCase().includes(filters.query.toLowerCase()) ||
        p.description?.toLowerCase().includes(filters.query.toLowerCase())
      );
    }

    // Filtro por categoria
    if (filters.category) {
      filtered = filtered.filter(p => p.category === filters.category);
    }

    // Filtro por loja
    if (filters.store) {
      filtered = filtered.filter(p => p.store === filters.store);
    }

    // Filtro por preço
    if (filters.minPrice > 0 || filters.maxPrice < 10000) {
      filtered = filtered.filter(p => {
        const price = parseFloat(p.price || '0');
        return price >= filters.minPrice && price <= filters.maxPrice;
      });
    }

    // Filtro por status de compra
    if (filters.onlyPurchased) {
      filtered = filtered.filter(p => p.isPurchased);
    }
    if (filters.onlyUnpurchased) {
      filtered = filtered.filter(p => !p.isPurchased);
    }

    // Ordenação
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (filters.sortBy) {
        case 'price':
          aValue = parseFloat(a.price || '0');
          bValue = parseFloat(b.price || '0');
          break;
        case 'date':
          aValue = new Date(a.createdAt || 0).getTime();
          bValue = new Date(b.createdAt || 0).getTime();
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (filters.sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      }
      return aValue > bValue ? 1 : -1;
    });

    setFilteredProducts(filtered);
  };

  const handleReset = () => {
    setFilteredProducts(products);
    setSelectedCategory('');
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    const filtered = category ? products.filter(p => p.category === category) : products;
    setFilteredProducts(filtered);
  };

  const displayProducts = filteredProducts.length > 0 ? filteredProducts : products;

  return (
    <div className="space-y-6 fade-in">
      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Todos os Produtos
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Busca Avançada
          </TabsTrigger>
          <TabsTrigger value="favorites" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Favoritos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="flex-1">
              <CategoryFilter
                onCategoryChange={handleCategoryChange}
                selectedCategory={selectedCategory}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setActiveView('search')}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtros Avançados
            </Button>
          </div>

          <ShoppingList 
            products={displayProducts} 
            isLoading={isLoading} 
            onProductUpdated={onProductUpdated}
          />
        </TabsContent>

        <TabsContent value="search" className="space-y-6">
          <AdvancedSearch
            onSearch={handleSearch}
            onReset={handleReset}
          />

          <div className="text-sm text-gray-600">
            Mostrando {filteredProducts.length} de {products.length} produtos
          </div>

          <ShoppingList 
            products={filteredProducts} 
            isLoading={isLoading} 
            onProductUpdated={onProductUpdated}
          />
        </TabsContent>

        <TabsContent value="favorites" className="space-y-6">
          <FavoritesSystem
            products={products}
            onFavoriteToggle={toggleFavorite}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
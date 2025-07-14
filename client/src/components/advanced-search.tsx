import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

interface SearchFilters {
  query: string;
  category: string;
  store: string;
  minPrice: number;
  maxPrice: number;
  sortBy: 'name' | 'price' | 'date';
  sortOrder: 'asc' | 'desc';
  onlyPurchased: boolean;
  onlyUnpurchased: boolean;
}

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilters) => void;
  onReset: () => void;
}

export function AdvancedSearch({ onSearch, onReset }: AdvancedSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: '',
    store: '',
    minPrice: 0,
    maxPrice: 10000,
    sortBy: 'name',
    sortOrder: 'asc',
    onlyPurchased: false,
    onlyUnpurchased: false
  });

  const categories = [
    'Todos',
    'Eletrônicos',
    'Roupas',
    'Casa',
    'Livros',
    'Games',
    'Presentes',
    'Outros'
  ];

  const stores = [
    'Todas',
    'Amazon',
    'Mercado Livre',
    'Americanas',
    'Casas Bahia',
    'Magazine Luiza',
    'Outros'
  ];

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onSearch(newFilters);
  };

  const handleReset = () => {
    const resetFilters: SearchFilters = {
      query: '',
      category: '',
      store: '',
      minPrice: 0,
      maxPrice: 10000,
      sortBy: 'name',
      sortOrder: 'asc',
      onlyPurchased: false,
      onlyUnpurchased: false
    };
    setFilters(resetFilters);
    onReset();
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.query) count++;
    if (filters.category) count++;
    if (filters.store) count++;
    if (filters.minPrice > 0) count++;
    if (filters.maxPrice < 10000) count++;
    if (filters.onlyPurchased) count++;
    if (filters.onlyUnpurchased) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className="w-full space-y-4">
      {/* Barra de busca principal */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar produtos..."
            value={filters.query}
            onChange={(e) => handleFilterChange('query', e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Filtros ativos */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.query && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Busca: "{filters.query}"
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleFilterChange('query', '')}
              />
            </Badge>
          )}
          {filters.category && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Categoria: {filters.category}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleFilterChange('category', '')}
              />
            </Badge>
          )}
          {filters.store && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Loja: {filters.store}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleFilterChange('store', '')}
              />
            </Badge>
          )}
          {(filters.minPrice > 0 || filters.maxPrice < 10000) && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Preço: R$ {filters.minPrice} - R$ {filters.maxPrice}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => {
                  handleFilterChange('minPrice', 0);
                  handleFilterChange('maxPrice', 10000);
                }}
              />
            </Badge>
          )}
          {filters.onlyPurchased && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Apenas comprados
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleFilterChange('onlyPurchased', false)}
              />
            </Badge>
          )}
          {filters.onlyUnpurchased && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Apenas não comprados
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleFilterChange('onlyUnpurchased', false)}
              />
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-6 px-2 text-xs"
          >
            Limpar tudo
          </Button>
        </div>
      )}

      {/* Painel de filtros expandido */}
      {isOpen && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Categoria</label>
                <Select
                  value={filters.category}
                  onValueChange={(value) => handleFilterChange('category', value === 'Todos' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Loja</label>
                <Select
                  value={filters.store}
                  onValueChange={(value) => handleFilterChange('store', value === 'Todas' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma loja" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map(store => (
                      <SelectItem key={store} value={store}>
                        {store}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Faixa de Preço: R$ {filters.minPrice} - R$ {filters.maxPrice}
              </label>
              <div className="px-2">
                <Slider
                  value={[filters.minPrice, filters.maxPrice]}
                  onValueChange={([min, max]) => {
                    handleFilterChange('minPrice', min);
                    handleFilterChange('maxPrice', max);
                  }}
                  max={10000}
                  step={50}
                  className="w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Ordenar por</label>
                <Select
                  value={filters.sortBy}
                  onValueChange={(value) => handleFilterChange('sortBy', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Nome</SelectItem>
                    <SelectItem value="price">Preço</SelectItem>
                    <SelectItem value="date">Data</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Ordem</label>
                <Select
                  value={filters.sortOrder}
                  onValueChange={(value) => handleFilterChange('sortOrder', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Crescente</SelectItem>
                    <SelectItem value="desc">Decrescente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.onlyPurchased}
                  onChange={(e) => handleFilterChange('onlyPurchased', e.target.checked)}
                  className="rounded"
                />
                Apenas comprados
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.onlyUnpurchased}
                  onChange={(e) => handleFilterChange('onlyUnpurchased', e.target.checked)}
                  className="rounded"
                />
                Apenas não comprados
              </label>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
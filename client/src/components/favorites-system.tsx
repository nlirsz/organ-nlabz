import { useState, useEffect } from 'react';
import { Heart, Star, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SelectProduct } from '@shared/schema';

interface FavoritesSystemProps {
  products: SelectProduct[];
  onFavoriteToggle: (productId: number) => void;
}

export function FavoritesSystem({ products, onFavoriteToggle }: FavoritesSystemProps) {
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [watchlist, setWatchlist] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Carrega favoritos do localStorage
    const savedFavorites = localStorage.getItem('favorites');
    const savedWatchlist = localStorage.getItem('watchlist');

    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    }
    if (savedWatchlist) {
      setWatchlist(new Set(JSON.parse(savedWatchlist)));
    }
  }, []);

  const toggleFavorite = (productId: number) => {
    const newFavorites = new Set(favorites);

    if (newFavorites.has(productId)) {
      newFavorites.delete(productId);
    } else {
      newFavorites.add(productId);
    }

    setFavorites(newFavorites);
    localStorage.setItem('favorites', JSON.stringify([...newFavorites]));
    onFavoriteToggle(productId);
  };

  const toggleWatchlist = (productId: number) => {
    const newWatchlist = new Set(watchlist);

    if (newWatchlist.has(productId)) {
      newWatchlist.delete(productId);
    } else {
      newWatchlist.add(productId);
    }

    setWatchlist(newWatchlist);
    localStorage.setItem('watchlist', JSON.stringify([...newWatchlist]));
  };

  const getFavoriteSelectProducts = () => {
    return products.filter(product => favorites.has(product.id));
  };

  const getWatchlistSelectProducts = () => {
    return products.filter(product => watchlist.has(product.id));
  };

  return (
    <div className="space-y-6">
      {/* Resumo dos favoritos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Favoritos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {favorites.size}
            </div>
            <p className="text-sm text-gray-600">
              Produtos marcados como favoritos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-blue-500" />
              Lista de Observação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {watchlist.size}
            </div>
            <p className="text-sm text-gray-600">
              Produtos na lista de observação
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Produtos favoritos */}
      {favorites.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Seus Favoritos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getFavoriteSelectProducts().map(product => (
                <div key={product.id} className="border rounded-lg p-4 space-y-2">
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-32 object-cover rounded"
                    />
                  )}
                  <h3 className="font-medium text-sm line-clamp-2">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">
                      R$ {product.price || '0,00'}
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavorite(product.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleWatchlist(product.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Bookmark className={`h-4 w-4 ${watchlist.has(product.id)
                            ? 'fill-blue-500 text-blue-500'
                            : 'text-gray-400'
                          }`} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de observação */}
      {watchlist.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-blue-500" />
              Lista de Observação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getWatchlistSelectProducts().map(product => (
                <div key={product.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-3">
                    {product.imageUrl && (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    )}
                    <div>
                      <h4 className="font-medium text-sm">{product.name}</h4>
                      <p className="text-xs text-gray-600">
                        R$ {product.price || '0,00'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFavorite(product.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Heart className={`h-4 w-4 ${favorites.has(product.id)
                          ? 'fill-red-500 text-red-500'
                          : 'text-gray-400'
                        }`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleWatchlist(product.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Bookmark className="h-4 w-4 fill-blue-500 text-blue-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Hook para usar o sistema de favoritos
export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  useEffect(() => {
    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    }
  }, []);

  const toggleFavorite = (productId: number) => {
    const newFavorites = new Set(favorites);

    if (newFavorites.has(productId)) {
      newFavorites.delete(productId);
    } else {
      newFavorites.add(productId);
    }

    setFavorites(newFavorites);
    localStorage.setItem('favorites', JSON.stringify([...newFavorites]));
  };

  const isFavorite = (productId: number) => favorites.has(productId);

  return {
    favorites,
    toggleFavorite,
    isFavorite
  };
}
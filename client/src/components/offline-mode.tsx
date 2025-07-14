import { useState, useEffect, useCallback } from 'react';
import localforage from 'localforage';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OfflineData {
  products: any[];
  lastSync: number;
}

export function useOfflineMode() {
  const [isOnline, setIsOnline] = useState(true);
  const [offlineProducts, setOfflineProducts] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
    }
  }, []);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    // Potentially trigger a sync here
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    localforage.getItem('offlineProducts').then(products => {
      if (products) {
        setOfflineProducts(products as any[]);
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  const saveProductsForOffline = useCallback(async (products: any[]) => {
    try {
      await localforage.setItem('offlineProducts', products);
      await localforage.setItem('lastSync', Date.now());
      setOfflineProducts(products);
    } catch (error) {
      console.error('Failed to save offline data', error);
    }
  }, []);

  return { isOnline, offlineProducts, saveProductsForOffline };
}

export function OfflineMode() {
  const [lastSync, setLastSync] = useState(0);
  const { isOnline, offlineProducts, saveProductsForOffline } = useOfflineMode();

  useEffect(() => {
    localforage.getItem('lastSync').then(time => {
      if (time) {
        setLastSync(time as number);
      }
    });
  }, []);

  const handleSync = async () => {
    try {
      const response = await fetch('/api/products/1');
      if (response.ok) {
        const products = await response.json();
        await saveProductsForOffline(products);
        setLastSync(Date.now());
      }
    } catch (error) {
      console.error('Error syncing data:', error);
    }
  };

  const formatLastSync = (timestamp: number) => {
    if (timestamp === 0) return 'Nunca';
    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR');
  };

  if (!isOnline) {
    return (
      <div className="space-y-4">
        <Alert>
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            Você está offline. Mostrando dados salvos localmente.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WifiOff className="h-5 w-5 text-red-500" />
              Modo Offline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Produtos salvos: {offlineProducts.length}</p>
            <p>Última sincronização: {formatLastSync(lastSync)}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="h-5 w-5 text-green-500" />
          Status de Conexão
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Badge className="bg-green-500">Online</Badge>
        <Button onClick={handleSync} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Sincronizar Agora
        </Button>
        <p className="text-sm text-gray-500">Última sincronização: {formatLastSync(lastSync)}</p>
      </CardContent>
    </Card>
  );
}
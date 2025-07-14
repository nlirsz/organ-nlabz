import { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OfflineData {
  products: any[];
  lastSync: number;
  isOffline: boolean;
}

export function OfflineMode() {
  const [offlineData, setOfflineData] = useState<OfflineData>({
    products: [],
    lastSync: 0,
    isOffline: false
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Monitora status de conexão
    const handleOnline = () => {
      setIsOnline(true);
      syncDataWhenOnline();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      saveDataForOffline();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Carrega dados offline existentes
    loadOfflineData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadOfflineData = () => {
    const stored = localStorage.getItem('offlineData');
    if (stored) {
      const data = JSON.parse(stored);
      setOfflineData(data);
    }
  };

  const saveDataForOffline = async () => {
    try {
      // Salva dados atuais para uso offline
      const response = await fetch('/api/products/1');
      if (response.ok) {
        const products = await response.json();
        const offlineData = {
          products,
          lastSync: Date.now(),
          isOffline: true
        };
        
        localStorage.setItem('offlineData', JSON.stringify(offlineData));
        setOfflineData(offlineData);
      }
    } catch (error) {
      console.error('Erro ao salvar dados offline:', error);
    }
  };

  const syncDataWhenOnline = async () => {
    try {
      // Sincroniza dados quando volta online
      const response = await fetch('/api/products/1');
      if (response.ok) {
        const products = await response.json();
        const syncedData = {
          products,
          lastSync: Date.now(),
          isOffline: false
        };
        
        localStorage.setItem('offlineData', JSON.stringify(syncedData));
        setOfflineData(syncedData);
      }
    } catch (error) {
      console.error('Erro ao sincronizar dados:', error);
    }
  };

  const clearOfflineData = () => {
    localStorage.removeItem('offlineData');
    setOfflineData({
      products: [],
      lastSync: 0,
      isOffline: false
    });
  };

  const formatLastSync = (timestamp: number) => {
    if (timestamp === 0) return 'Nunca';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffHours >= 24) {
      return date.toLocaleDateString('pt-BR');
    } else if (diffHours >= 1) {
      return `${diffHours}h atrás`;
    } else if (diffMinutes >= 1) {
      return `${diffMinutes}min atrás`;
    } else {
      return 'Agora mesmo';
    }
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Produtos salvos</p>
                <p className="text-2xl font-bold">{offlineData.products.length}</p>
              </div>
              <Badge variant="outline">
                Última sincronização: {formatLastSync(offlineData.lastSync)}
              </Badge>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Funcionalidades disponíveis offline:
              </p>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Visualizar produtos salvos</li>
                <li>• Marcar produtos como comprados</li>
                <li>• Filtrar e buscar produtos</li>
                <li>• Ver estatísticas básicas</li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Funcionalidades que requerem conexão:
              </p>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Adicionar novos produtos</li>
                <li>• Atualizar preços</li>
                <li>• Sincronizar dados</li>
                <li>• Receber notificações</li>
              </ul>
            </div>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-green-500">
              Online
            </Badge>
            <span className="text-sm text-gray-600">
              Todos os recursos disponíveis
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={syncDataWhenOnline}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Sincronizar
          </Button>
        </div>

        {offlineData.lastSync > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Última sincronização: {formatLastSync(offlineData.lastSync)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearOfflineData}
              className="text-red-500 hover:text-red-700"
            >
              Limpar dados offline
            </Button>
          </div>
        )}

        <div className="text-sm text-gray-600">
          <p>
            Produtos salvos para modo offline: {offlineData.products.length}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Hook para usar funcionalidades offline
export function useOfflineMode() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineData, setOfflineData] = useState<any[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Carrega dados offline
    const stored = localStorage.getItem('offlineData');
    if (stored) {
      const data = JSON.parse(stored);
      setOfflineData(data.products || []);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveForOffline = (data: any[]) => {
    const offlineData = {
      products: data,
      lastSync: Date.now(),
      isOffline: !isOnline
    };
    localStorage.setItem('offlineData', JSON.stringify(offlineData));
    setOfflineData(data);
  };

  const getOfflineData = () => {
    if (isOnline) return null;
    return offlineData;
  };

  return {
    isOnline,
    offlineData,
    saveForOffline,
    getOfflineData
  };
}
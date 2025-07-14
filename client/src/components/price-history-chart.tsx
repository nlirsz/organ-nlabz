import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface PriceHistoryEntry {
  productId: number;
  price: number;
  timestamp: number;
  source: string;
}

interface PriceHistoryChartProps {
  productId: number;
}

export function PriceHistoryChart({ productId }: PriceHistoryChartProps) {
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPriceHistory();
  }, [productId]);

  const fetchPriceHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products/${productId}/price-history`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Erro ao buscar histórico de preços:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatChartData = () => {
    return history.map(entry => ({
      timestamp: entry.timestamp,
      price: entry.price,
      date: new Date(entry.timestamp).toLocaleDateString('pt-BR'),
      time: new Date(entry.timestamp).toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }));
  };

  const getPriceStats = () => {
    if (history.length === 0) return null;

    const prices = history.map(h => h.price);
    const currentPrice = prices[prices.length - 1];
    const previousPrice = prices.length > 1 ? prices[prices.length - 2] : currentPrice;
    const lowestPrice = Math.min(...prices);
    const highestPrice = Math.max(...prices);

    const trend = currentPrice > previousPrice ? 'up' : 
                 currentPrice < previousPrice ? 'down' : 'stable';

    const trendPercentage = previousPrice !== currentPrice ? 
      ((currentPrice - previousPrice) / previousPrice) * 100 : 0;

    return {
      currentPrice,
      previousPrice,
      lowestPrice,
      highestPrice,
      trend,
      trendPercentage: Math.abs(trendPercentage)
    };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Preços</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            Carregando histórico...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Preços</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            Nenhum histórico de preços disponível
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = formatChartData();
  const stats = getPriceStats();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Histórico de Preços</CardTitle>
        {stats && (
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              {stats.trend === 'up' && <TrendingUp className="h-3 w-3" />}
              {stats.trend === 'down' && <TrendingDown className="h-3 w-3" />}
              {stats.trend === 'stable' && <Minus className="h-3 w-3" />}
              R$ {stats.currentPrice.toFixed(2)}
            </Badge>
            <Badge variant="outline">
              Menor: R$ {stats.lowestPrice.toFixed(2)}
            </Badge>
            <Badge variant="outline">
              Maior: R$ {stats.highestPrice.toFixed(2)}
            </Badge>
            {stats.trend !== 'stable' && (
              <Badge 
                variant={stats.trend === 'down' ? 'default' : 'destructive'}
                className="flex items-center gap-1"
              >
                {stats.trend === 'down' ? '↓' : '↑'}
                {stats.trendPercentage.toFixed(1)}%
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              fontSize={12}
              tick={{ fill: '#666' }}
            />
            <YAxis 
              fontSize={12}
              tick={{ fill: '#666' }}
              tickFormatter={(value) => `R$ ${value.toFixed(0)}`}
            />
            <Tooltip 
              formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Preço']}
              labelFormatter={(label) => `Data: ${label}`}
              contentStyle={{
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '4px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="#2563eb" 
              strokeWidth={2}
              dot={{ r: 4, fill: '#2563eb' }}
              activeDot={{ r: 6, fill: '#2563eb' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
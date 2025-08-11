
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Zap, AlertCircle } from 'lucide-react';

interface AnyCrawlStatus {
  remaining_credits: number;
  available: boolean;
}

export function AnyCrawlStatus() {
  const [status, setStatus] = useState<AnyCrawlStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkCredits();
  }, []);

  const checkCredits = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/anycrawl/credits', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Erro ao verificar créditos AnyCrawl:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !status?.available) {
    return null;
  }

  const getStatusColor = () => {
    if (status.remaining_credits > 100) return 'bg-green-500';
    if (status.remaining_credits > 20) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusText = () => {
    if (status.remaining_credits > 100) return 'Bom';
    if (status.remaining_credits > 20) return 'Baixo';
    return 'Crítico';
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Zap className="h-4 w-4 text-amber-500" />
          AnyCrawl Premium
        </CardTitle>
        <CardDescription className="text-xs">
          Scraping avançado para sites difíceis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Créditos:</span>
          <div className="flex items-center gap-2">
            <Badge 
              variant="secondary" 
              className={`${getStatusColor()} text-white border-0`}
            >
              {status.remaining_credits}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {getStatusText()}
            </span>
          </div>
        </div>
        
        {status.remaining_credits < 20 && (
          <div className="mt-2 flex items-center gap-2 p-2 bg-amber-50 rounded-md">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span className="text-xs text-amber-800">
              Créditos baixos - será usado apenas quando necessário
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

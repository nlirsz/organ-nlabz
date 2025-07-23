import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, Plus, Wand2, Clipboard, Edit, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ManualProductModal } from "./manual-product-modal";
import { queryClient } from "@/lib/queryClient";

interface UrlInputProps {
  onProductAdded: () => void;
}

export function UrlInput({ onProductAdded }: UrlInputProps) {
  const [url, setUrl] = useState("");
  const [showManualModal, setShowManualModal] = useState(false);
  const [failedScrapingData, setFailedScrapingData] = useState<any>(null);
  const { toast } = useToast();

  const addProductMutation = useMutation({
    mutationFn: async (url: string) => {
      console.log("Iniciando scraping para URL:", url);
      const response = await apiRequest("POST", "/api/products/scrape", { url });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Dados recebidos do scraping:", data);
      return data;
    },
    onSuccess: (data) => {
      console.log("Scraping bem-sucedido:", data);
      
      // Invalidate queries to refresh the products tab
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/stats"] });

      if (data.needsManualInput) {
        // Se o scraping foi limitado, mostra aviso e oferece opção manual
        toast({
          title: "Produto adicionado parcialmente",
          description: "Algumas informações não foram encontradas. Você pode completar manualmente.",
          duration: 5000,
        });
        setFailedScrapingData({
          url: url,
          name: data.name,
          price: data.price,
          store: data.store,
          imageUrl: data.imageUrl,
          description: data.description,
          category: data.category,
          brand: data.brand,
        });
        setShowManualModal(true);
      } else {
        // Scraping bem-sucedido
        toast({
          title: "Sucesso",
          description: `${data.name || 'Produto'} foi adicionado à sua lista de compras!`,
        });
      }
      setUrl("");
      onProductAdded();
    },
    onError: (error: any) => {
      console.error("Erro ao adicionar produto:", error);

      toast({
        title: "Falha no scraping",
        description: "Não foi possível extrair informações automaticamente. Tente adicionar manualmente.",
        variant: "destructive",
        duration: 5000,
      });
      
      // Sempre oferece opção manual em caso de erro
      setFailedScrapingData({ url });
      setShowManualModal(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, digite uma URL de produto",
        variant: "destructive",
      });
      return;
    }

    try {
      new URL(url);
    } catch {
      toast({
        title: "Erro",
        description: "Por favor, digite uma URL válida",
        variant: "destructive",
      });
      return;
    }

    addProductMutation.mutate(url);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      toast({
        title: "Sucesso",
        description: "URL colada da área de transferência",
      });
    } catch {
      // Fallback for browsers that don't support clipboard API
      toast({
        title: "Aviso",
        description: "Cole a URL manualmente usando Ctrl+V",
      });
    }
  };

  const handleModalClose = () => {
    setShowManualModal(false);
    setFailedScrapingData(null);
  };

  const handleManualProductAdded = () => {
    setShowManualModal(false);
    setFailedScrapingData(null);
    setUrl("");
    queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    queryClient.invalidateQueries({ queryKey: ["/api/products/stats"] });
    onProductAdded();
  };

  return (
    <>
      <section className="neomorphic-card p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Cole a URL para adicionar à lista..."
              className="w-full neomorphic-input text-base"
              style={{ 
                color: 'var(--text-primary)',
                fontFamily: 'Inter, sans-serif'
              }}
              disabled={addProductMutation.isPending}
            />
            <button
              type="button"
              onClick={handlePaste}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 w-8 h-8 neomorphic-button rounded-full flex items-center justify-center"
            >
              <Clipboard className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={addProductMutation.isPending}
              className="flex-1 neomorphic-button-primary flex items-center justify-center gap-2 icon-button"
              title="Adicionar produto via URL"
            >
              {addProductMutation.isPending ? (
                <>
                  <Wand2 className="w-4 h-4 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Adicionar
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowManualModal(true)}
              disabled={addProductMutation.isPending}
              className="neomorphic-button flex items-center justify-center icon-button"
              title="Adicionar produto manualmente"
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>

          {addProductMutation.isPending && (
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Wand2 className="w-5 h-5 animate-spin text-blue-600" />
                <p className="text-sm font-medium text-blue-800">
                  Extraindo informações do produto...
                </p>
              </div>
              <p className="text-xs text-blue-600">
                Este processo pode levar alguns segundos
              </p>
            </div>
          )}
        </form>
      </section>

      <ManualProductModal
        isOpen={showManualModal}
        onClose={handleModalClose}
        initialUrl={failedScrapingData?.url || url}
        initialData={failedScrapingData || {}}
        onProductAdded={handleManualProductAdded}
      />
    </>
  );
}
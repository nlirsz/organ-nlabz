import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, Plus, Wand2, Clipboard, Edit, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ManualProductModal } from "./manual-product-modal";

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
      const response = await fetch("/api/products/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": localStorage.getItem("authToken") || ""
        },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) {
        throw new Error("Falha ao adicionar produto");
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.needsManualInput) {
        // Se o scraping foi limitado, mostra aviso e oferece opção manual
        toast({
          title: "Produto adicionado parcialmente",
          description: "Algumas informações não foram encontradas. Você pode completar manualmente.",
          duration: 5000,
        });
        setFailedScrapingData({
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
          description: `${data.name} foi adicionado à sua lista de compras!`,
        });
      }
      setUrl("");
      onProductAdded();
    },
    onError: (error: any) => {
      console.error("Erro ao adicionar produto:", error);
      
      // Se o erro permite retry manual, oferece a opção
      if (error.canRetryWithManual) {
        toast({
          title: "Falha no scraping",
          description: "Não foi possível extrair informações automaticamente. Tente adicionar manualmente.",
          variant: "destructive",
          duration: 5000,
        });
        setFailedScrapingData({ url });
        setShowManualModal(true);
      } else {
        toast({
          title: "Erro",
          description: error.message || "Falha ao adicionar produto. Verifique a URL e tente novamente.",
          variant: "destructive",
        });
      }
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
              className="flex-1 neomorphic-button-primary flex items-center justify-center gap-2"
            >
              {addProductMutation.isPending ? (
                <>
                  <Wand2 className="w-4 h-4 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Adicionar à Lista
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={() => setShowManualModal(true)}
              className="neomorphic-button flex items-center gap-2"
              title="Adicionar produto manualmente"
            >
              <Edit className="w-4 h-4" />
              Manual
            </button>
          </div>

          {addProductMutation.isPending && (
            <div className="text-center">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Extraindo informações do produto...
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

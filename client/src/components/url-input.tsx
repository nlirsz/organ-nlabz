import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, Plus, Wand2, Clipboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface UrlInputProps {
  onProductAdded: () => void;
}

export function UrlInput({ onProductAdded }: UrlInputProps) {
  const [url, setUrl] = useState("");
  const { toast } = useToast();

  const addProductMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/products/scrape", { url });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sucesso",
        description: `${data.name} foi adicionado à sua lista de compras!`,
      });
      setUrl("");
      onProductAdded();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao adicionar produto. Verifique a URL e tente novamente.",
        variant: "destructive",
      });
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
    } catch {
      // Fallback for browsers that don't support clipboard API
      toast({
        title: "Note",
        description: "Please paste the URL manually",
      });
    }
  };

  return (
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

        <button
          type="submit"
          disabled={addProductMutation.isPending}
          className="w-full neomorphic-button-primary py-4 text-lg font-semibold rounded-2xl"
        >
          {addProductMutation.isPending ? (
            <div className="flex items-center justify-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              <span>Verificar URL</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <Wand2 className="w-5 h-5" />
              <span>Verificar URL</span>
            </div>
          )}
        </button>
      </form>

      {addProductMutation.isPending && (
        <div className="mt-6 p-6 neomorphic-card rounded-2xl">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-t-transparent" style={{ borderColor: 'var(--primary-action)' }} />
            <span className="font-medium" style={{ color: 'var(--primary-action)' }}>
              Extraindo informações do produto...
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

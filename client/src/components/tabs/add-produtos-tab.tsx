import { UrlInput } from "@/components/url-input";
import { Plus, Link, Search, ShoppingCart } from "lucide-react";

interface AddProdutosTabProps {
  onProductAdded: () => void;
}

export function AddProdutosTab({ onProductAdded }: AddProdutosTabProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 neomorphic-card rounded-full flex items-center justify-center mx-auto mb-4">
          <Plus className="w-8 h-8" style={{ color: 'var(--primary-action)' }} />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Adicionar Produtos
        </h2>
        <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
          Cole o link do produto e deixe nossa IA extrair todas as informações automaticamente
        </p>
      </div>

      {/* URL Input */}
      <div className="fade-in">
        <UrlInput onProductAdded={onProductAdded} />
      </div>

      {/* Instructions */}
      <div className="neomorphic-card p-6 rounded-2xl">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Como adicionar produtos:
        </h3>

        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 neomorphic-card rounded-full flex items-center justify-center flex-shrink-0">
              <Link className="w-4 h-4" style={{ color: 'var(--primary-action)' }} />
            </div>
            <div>
              <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                1. Copie o link do produto
              </h4>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Visite qualquer loja online e copie o link do produto que deseja adicionar
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 neomorphic-card rounded-full flex items-center justify-center flex-shrink-0">
              <Search className="w-4 h-4" style={{ color: 'var(--primary-action)' }} />
            </div>
            <div>
              <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                2. Nossa IA analisa automaticamente
              </h4>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Extraímos nome, preço, imagem, categoria e outras informações do produto
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 neomorphic-card rounded-full flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="w-4 h-4" style={{ color: 'var(--primary-action)' }} />
            </div>
            <div>
              <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                3. Produto adicionado à lista
              </h4>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                O produto aparece na sua lista com todas as informações organizadas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Supported Stores */}
      <div className="neomorphic-card p-6 rounded-2xl">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Lojas Compatíveis:
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            "Mercado Livre",
            "Amazon",
            "Shopee", 
            "Americanas",
            "Casas Bahia",
            "Extra",
            "Submarino",
            "Magazine Luiza",
            "Kabum",
            "Pichau",
            "Netshoes",
            "Zara"
          ].map((store) => (
            <div key={store} className="text-center p-3 neomorphic-card rounded-xl">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {store}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

```typescript
// UrlInput Component
import React, { useState } from 'react';
import { Button } from "@/components/ui/button"
interface UrlInputProps {
    onProductAdded: () => void;
}

export function UrlInput({ onProductAdded }: UrlInputProps) {
    const [url, setUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim()) return;

        const authToken = localStorage.getItem("authToken");
        if (!authToken) {
            setMessage("Token de autenticação não encontrado. Faça login novamente.");
            return;
        }

        setIsLoading(true);
        setMessage("");

        try {
            const response = await fetch("/api/products/scrape", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-auth-token": authToken,
                },
                body: JSON.stringify({ url: url.trim() }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage("Produto adicionado com sucesso!");
                setUrl("");
                onProductAdded();
            } else {
                setMessage(data.error || data.msg || "Erro ao adicionar produto");
            }
        } catch (error) {
            setMessage("Erro de conexão com o servidor");
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <form onSubmit={handleSubmit} className="flex items-center space-x-4">
            <input
                type="url"
                placeholder="Cole o link do produto"
                className="flex-1 p-4 neomorphic-card rounded-xl"
                style={{ color: 'var(--text-primary)' }}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
            />
            <Button
                type="submit"
                className="neomorphic-card transition-all duration-300"
                style={{ backgroundColor: 'var(--primary-action)', color: 'white', fontWeight: 'bold' }}
                disabled={isLoading}
            >
                {isLoading ? "Adicionando..." : "Adicionar"}
            </Button>
            {message && (
                <div className="absolute bottom-0 left-0 w-full p-4 text-center" style={{ color: 'var(--text-secondary)' }}>
                    {message}
                </div>
            )}
        </form>
    );
}
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
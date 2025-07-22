
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UrlInput } from "@/components/url-input";
import { TagsInput } from "@/components/tags-input";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  Link, 
  Search, 
  ShoppingCart, 
  Edit, 
  ArrowLeft, 
  Sparkles,
  Zap,
  Heart,
  Star,
  Gift,
  CheckCircle,
  ExternalLink,
  Package,
  Tag,
  DollarSign,
  Image as ImageIcon,
  FileText,
  Store
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AddProdutosTabProps {
  onProductAdded: () => void;
}

export function AddProdutosTab({ onProductAdded }: AddProdutosTabProps) {
  const [isManualMode, setIsManualMode] = useState(false);
  const [url, setUrl] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    url: "",
    imageUrl: "",
    category: "Outros",
    brand: "",
    description: "",
    store: "",
    tags: [] as string[]
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const authToken = localStorage.getItem("authToken");

  const addProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": authToken || ""
        },
        body: JSON.stringify(productData),
      });
      if (!response.ok) {
        throw new Error("Falha ao adicionar produto");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/stats"] });
      onProductAdded();
      toast({
        title: "Sucesso",
        description: "Produto adicionado à lista!",
      });
      // Reset form
      setFormData({
        name: "",
        price: "",
        url: "",
        imageUrl: "",
        category: "Outros",
        brand: "",
        description: "",
        store: "",
        tags: []
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao adicionar produto",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome do produto é obrigatório",
        variant: "destructive",
      });
      return;
    }

    const productData = {
      name: formData.name,
      price: formData.price || null,
      url: formData.url || `https://example.com/product/${Date.now()}`,
      imageUrl: formData.imageUrl || null,
      store: formData.store || "Adicionado Manualmente",
      description: formData.description || null,
      category: formData.category,
      brand: formData.brand || null,
      tags: formData.tags.join(", ") || null,
      isPurchased: false,
    };

    addProductMutation.mutate(productData);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
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

    // Aqui você pode adicionar a lógica de scraping
    // Por enquanto, vamos apenas mostrar um feedback
    toast({
      title: "Processando",
      description: "Analisando produto...",
    });
  };

  if (isManualMode) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 fade-in">
        {/* Header */}
        <div className="text-center staggered-fade">
          <button
            onClick={() => setIsManualMode(false)}
            className="neomorphic-button mb-4 icon-button smooth-hover"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <div className="w-16 h-16 neomorphic-card rounded-full flex items-center justify-center mx-auto mb-4 pulse-highlight">
            <Edit className="w-8 h-8" style={{ color: 'var(--primary-action)' }} />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Adicionar Produto Manualmente
          </h2>
          <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
            Preencha os campos abaixo para adicionar um produto à sua lista
          </p>
        </div>

        {/* Manual Form */}
        <form onSubmit={handleSubmit} className="neomorphic-card p-6 rounded-2xl space-y-4 animated-border staggered-fade">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                <Package className="w-4 h-4" />
                Nome do Produto *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="neomorphic-input w-full"
                placeholder="Ex: iPhone 15 Pro Max"
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                <DollarSign className="w-4 h-4" />
                Preço (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                className="neomorphic-input w-full"
                placeholder="0,00"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                <Store className="w-4 h-4" />
                Loja
              </label>
              <input
                type="text"
                value={formData.store}
                onChange={(e) => handleInputChange('store', e.target.value)}
                className="neomorphic-input w-full"
                placeholder="Ex: Amazon, Magazine Luiza"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                <Tag className="w-4 h-4" />
                Categoria
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="neomorphic-input w-full"
              >
                <option value="Outros">Outros</option>
                <option value="Eletrônicos">Eletrônicos</option>
                <option value="Roupas e Acessórios">Roupas e Acessórios</option>
                <option value="Casa e Decoração">Casa e Decoração</option>
                <option value="Livros e Mídia">Livros e Mídia</option>
                <option value="Esportes e Lazer">Esportes e Lazer</option>
                <option value="Ferramentas e Construção">Ferramentas e Construção</option>
                <option value="Alimentos e Bebidas">Alimentos e Bebidas</option>
                <option value="Saúde e Beleza">Saúde e Beleza</option>
                <option value="Automotivo">Automotivo</option>
                <option value="Pet Shop">Pet Shop</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                <Star className="w-4 h-4" />
                Marca
              </label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => handleInputChange('brand', e.target.value)}
                className="neomorphic-input w-full"
                placeholder="Ex: Apple, Samsung"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                <ExternalLink className="w-4 h-4" />
                URL do Produto
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => handleInputChange('url', e.target.value)}
                className="neomorphic-input w-full"
                placeholder="https://..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                <ImageIcon className="w-4 h-4" />
                URL da Imagem
              </label>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => handleInputChange('imageUrl', e.target.value)}
                className="neomorphic-input w-full"
                placeholder="https://..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                <FileText className="w-4 h-4" />
                Descrição
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="neomorphic-input w-full"
                rows={3}
                placeholder="Descrição do produto..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                <Tag className="w-4 h-4" />
                Tags
              </label>
              <TagsInput
                tags={formData.tags}
                onTagsChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
                placeholder="Adicionar tag..."
                maxTags={5}
                suggestions={[
                  "Urgente", "Desconto", "Presente", "Favorito", "Promoção",
                  "Black Friday", "Natal", "Aniversário", "Casa Nova", "Trabalho",
                  "Hobbies", "Fitness", "Tecnologia", "Moda", "Decoração"
                ]}
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => setIsManualMode(false)}
              className="neomorphic-button flex-1 icon-button"
            >
              <ArrowLeft className="w-4 h-4" />
              Cancelar
            </button>
            <button
              type="submit"
              disabled={addProductMutation.isPending}
              className="neomorphic-button-primary flex-1 icon-button"
            >
              {addProductMutation.isPending ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  Adicionando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Adicionar Produto
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 fade-in">
      {/* Header */}
      <div className="text-center staggered-fade">
        <div className="w-16 h-16 neomorphic-card rounded-full flex items-center justify-center mx-auto mb-4 pulse-glow">
          <Plus className="w-8 h-8" style={{ color: 'var(--primary-action)' }} />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Adicionar Produtos
        </h2>
        <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
          Cole o link do produto ou adicione manualmente
        </p>
      </div>

      {/* Main Add Product Card */}
      <div className="neomorphic-card p-8 rounded-2xl smooth-hover animated-border staggered-fade">
        <form onSubmit={handleUrlSubmit} className="space-y-6">
          {/* URL Input Section */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
              <Link className="w-4 h-4" />
              URL do Produto
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Cole a URL do produto aqui..."
              className="w-full neomorphic-input text-base"
              style={{ 
                color: 'var(--text-primary)',
                fontFamily: 'Inter, sans-serif'
              }}
            />
          </div>

          {/* Add Button */}
          <button
            type="submit"
            className="w-full neomorphic-button-primary flex items-center justify-center gap-2 icon-button py-3"
          >
            <Plus className="w-5 h-5" />
            Adicionar Produto
          </button>
        </form>

        {/* Manual Option */}
        <div className="mt-6 pt-6 border-t border-gray-200/20">
          <button
            type="button"
            onClick={() => setIsManualMode(true)}
            className="w-full neomorphic-button flex items-center justify-center gap-2 icon-button py-3"
          >
            <Edit className="w-5 h-5" />
            Adicionar Manualmente
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="neomorphic-card p-6 rounded-2xl pulse-highlight staggered-fade">
        <h3 className="flex items-center gap-2 text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          <Sparkles className="w-5 h-5" />
          Como adicionar produtos:
        </h3>

        <div className="space-y-4">
          <div className="flex items-start space-x-3 smooth-hover">
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

          <div className="flex items-start space-x-3 smooth-hover">
            <div className="w-8 h-8 neomorphic-card rounded-full flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4" style={{ color: 'var(--primary-action)' }} />
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

          <div className="flex items-start space-x-3 smooth-hover">
            <div className="w-8 h-8 neomorphic-card rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-4 h-4" style={{ color: 'var(--primary-action)' }} />
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
      <div className="neomorphic-card p-6 rounded-2xl animated-border staggered-fade">
        <h3 className="flex items-center gap-2 text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          <Store className="w-5 h-5" />
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
          ].map((store, index) => (
            <div key={store} className={`text-center p-3 neomorphic-card rounded-xl smooth-hover staggered-fade`} style={{ animationDelay: `${index * 0.05}s` }}>
              <span className="text-sm font-medium flex items-center justify-center gap-1" style={{ color: 'var(--text-primary)' }}>
                <Heart className="w-3 h-3 opacity-50" />
                {store}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

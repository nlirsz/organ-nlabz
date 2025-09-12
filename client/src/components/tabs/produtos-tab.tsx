import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Filter, SortAsc, Package, Edit, Check, Trash2, Star } from "lucide-react";
import { CategoryFilter } from "@/components/category-filter";
import { AdvancedSearch } from "@/components/advanced-search";
import { EditProductModal } from "@/components/edit-product-modal";
import { PaymentModal } from "@/components/payment-modal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { SelectProduct } from "@shared/schema";
import { TagsFilter } from "@/components/tags-filter";

interface ProdutosTabProps {
  refreshKey: number;
}

export function ProdutosTab({ refreshKey }: ProdutosTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [sortBy, setSortBy] = useState("name");
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SelectProduct | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [paymentProduct, setPaymentProduct] = useState<SelectProduct | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const authToken = localStorage.getItem("authToken");

  const { data: products = [], isLoading } = useQuery<SelectProduct[]>({
    queryKey: ["/api/products", refreshKey],
    queryFn: async () => {
      const response = await fetch("/api/products", {
        headers: { 
          "x-auth-token": authToken || ""
        }
      });
      if (!response.ok) {
        throw new Error("Erro ao carregar produtos");
      }
      return response.json();
    },
    enabled: !!authToken,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  const purchaseProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      const response = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": authToken || ""
        },
        body: JSON.stringify({ isPurchased: true }),
      });
      if (!response.ok) {
        throw new Error("Falha ao marcar produto como comprado");
      }
      return response.json();
    },
    onSuccess: (updatedProduct, productId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/stats"] });
      setPaymentProduct(updatedProduct);
      toast({
        title: "Sucesso",
        description: "Produto marcado como comprado! Agora cadastre o pagamento.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao marcar produto como comprado",
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
        headers: {
          "x-auth-token": authToken || ""
        }
      });
      if (!response.ok) {
        throw new Error("Falha ao excluir produto");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/stats"] });
      toast({
        title: "Sucesso",
        description: "Produto removido da lista",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao excluir produto",
        variant: "destructive",
      });
    },
  });

  const addToFavoritesMutation = useMutation({
    mutationFn: async (product: SelectProduct) => {
      const response = await apiRequest('POST', `/api/favorites`, { productId: product.id });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const reScrapeMutation = useMutation({
    mutationFn: async (productId: number) => {
      const response = await apiRequest('POST', `/api/products/${productId}/re-scrape`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: "Produto atualizado",
        description: "Os dados do produto foram atualizados com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Não foi possível atualizar o produto",
        variant: "destructive",
      });
    },
  });

  const handlePurchase = (product: SelectProduct) => {
    purchaseProductMutation.mutate(product.id);
  };

  const handleDelete = (productId: number, productName: string) => {
    if (window.confirm(`Tem certeza que deseja remover "${productName}" da lista?`)) {
      deleteProductMutation.mutate(productId);
    }
  };

  const filteredProducts = products
    .filter(p => !p.isPurchased)
    .filter(p => {
      if (selectedCategory === "Todos" || selectedCategory === "Geral") return true;
      // Normalize category names for comparison
      const productCategory = p.category?.toLowerCase() || 'geral';
      const filterCategory = selectedCategory.toLowerCase();

      // Handle different category name variations
      const categoryMap: Record<string, string[]> = {
        'eletrônicos': ['eletronicos', 'eletrônicos', 'electronics'],
        'eletronicos': ['eletronicos', 'eletrônicos', 'electronics'],
        'roupas': ['roupas', 'roupas e acessórios', 'clothing'],
        'casa': ['casa', 'casa e decoração', 'home'],
        'livros': ['livros', 'livros e mídia', 'books'],
        'games': ['games', 'jogos', 'gaming'],
        'presentes': ['presentes', 'gifts'],
      };

      if (categoryMap[filterCategory]) {
        return categoryMap[filterCategory].includes(productCategory);
      }

      return productCategory === filterCategory;
    })
    .filter(p => {
      if (!searchTerm) return true;
      return p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             p.store?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "price":
          const priceA = a.price ? Number(a.price) : 0;
          const priceB = b.price ? Number(b.price) : 0;
          return priceA - priceB;
        case "date":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    const allTags = [...new Set(
      products?.flatMap(product => 
        product.tags ? product.tags.split(", ").map(tag => tag.trim()).filter(Boolean) : []
      ) || []
    )];

    // Aplicar filtros de tags aos produtos já filtrados
  const finalFilteredProducts = filteredProducts.filter(product => {
    if (selectedTags.length === 0) return true;

    const productTags = product.tags ? 
      product.tags.split(",").map(tag => tag.trim()).filter(Boolean) : [];

    return selectedTags.every(tag => productTags.includes(tag));
  });

  // Debug: log produtos para identificar problema
  console.log("ProdutosTab Debug:", {
    totalProducts: products.length,
    pendingProducts: products.filter(p => !p.isPurchased).length,
    purchasedProducts: products.filter(p => p.isPurchased).length,
    filteredProducts: filteredProducts.length,
    finalFiltered: finalFilteredProducts.length
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="pulse-animation">
          <Package className="w-12 h-12" style={{ color: 'var(--text-secondary)' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Lista de Compras
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {finalFilteredProducts.length} produto{finalFilteredProducts.length !== 1 ? 's' : ''} pendente{finalFilteredProducts.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="neomorphic-card p-6 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="neomorphic-input w-full pl-10"
            />
          </div>
          <button
            onClick={() => setIsAdvancedSearchOpen(true)}
            className="neomorphic-button whitespace-nowrap"
          >
            <Filter className="w-4 h-4" />
            Busca Avançada
          </button>
        </div>

        <CategoryFilter
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />

        <div className="flex flex-wrap gap-2">
          {[
            { value: "name", label: "Nome", icon: SortAsc },
            { value: "price", label: "Preço", icon: SortAsc },
            { value: "date", label: "Data", icon: SortAsc },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setSortBy(value)}
              className={`neomorphic-button text-sm ${
                sortBy === value ? 'neomorphic-button-primary' : ''
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
          <TagsFilter
            availableTags={allTags}
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            productsCount={finalFilteredProducts.length}
        />
      </div>

      {/* Products Grid */}
      {finalFilteredProducts.length === 0 ? (
        <div className="neomorphic-card p-12 rounded-2xl text-center">
          <Package className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-secondary)' }} />
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Nenhum produto encontrado
          </h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            {products.length === 0 
              ? "Adicione alguns produtos à sua lista para começar!"
              : "Tente ajustar os filtros para encontrar o que procura."
            }
          </p>
        </div>
      ) : (
        <div className="product-grid">
          {finalFilteredProducts.map((product) => (
            <div
              key={product.id}
              className="neomorphic-card p-6 rounded-2xl card-entering product-card-hover"
            >
              {/* Product Image */}
              <div className="mb-4">
                <div className="relative">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-32 object-contain rounded-lg p-2"
                      style={{ backgroundColor: 'white' }}
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTAwQzEwNS41MjMgMTAwIDExMCA5NS41MjI4IDExMCA5MEM1MTAgODQuNDc3MiAxMDUuNTIzIDgwIDEwMCA4MEM5NC40NzcyIDgwIDkwIDg0LjQ3NzIgOTAgOTBDOTAgOTUuNTIyOCA5NC40NzcyIDEwMCAxMDAgMTAwWiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNMTM1IDEyMEgxMTVWMTEwSDEzNVYxMjBaIiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik05NSAxMjBINzVWMTEwSDk1VjEyMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
                      }}
                    />
                  ) : (
                    <div className="w-full h-32 rounded-lg image-placeholder flex items-center justify-center" style={{ backgroundColor: 'white' }}>
                      <Package className="w-12 h-12" style={{ color: 'var(--text-secondary)' }} />
                    </div>
                  )}
                </div>
              </div>

              {/* Product Info */}
              <div className="mb-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                    {product.name}
                  </h3>
                  {product.category && (
                    <span className="category-tag ml-2">
                      {product.category}
                    </span>
                  )}
                </div>

                {product.store && (
                  <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                    📍 {product.store}
                  </p>
                )}

                {product.description && (
                  <p className="text-sm line-clamp-2 mb-3" style={{ color: 'var(--text-secondary)' }}>
                    {product.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="text-xl font-bold" style={{ color: 'var(--primary-action)' }}>
                    {product.price ? 
                      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(product.price))
                      : 'Preço não informado'
                    }
                  </div>
                  {product.originalPrice && Number(product.originalPrice) > (Number(product.price) || 0) && (
                    <span className="text-sm line-through" style={{ color: 'var(--text-secondary)' }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(product.originalPrice))}
                    </span>
                  )}
                </div>
              </div>

              {/* Card Actions */}
              <div className="flex items-center justify-between gap-2 border-t pt-4" 
                   style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
                <button
                  onClick={() => window.open(product.url, '_blank')}
                  className="flex-1 neomorphic-button px-3 py-2 rounded-lg flex items-center justify-center text-sm"
                  title="Ver produto"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>

                <button
                  onClick={() => setEditingProduct(product)}
                  className="flex-1 neomorphic-button px-3 py-2 rounded-lg flex items-center justify-center text-sm"
                  title="Editar produto"
                >
                  <Edit className="w-4 h-4" style={{ color: 'var(--edit-color)' }} />
                </button>

                <button
                  onClick={() => handlePurchase(product)}
                  disabled={purchaseProductMutation.isPending}
                  className="flex-1 neomorphic-button-primary px-3 py-2 rounded-lg flex items-center justify-center text-sm"
                  title="Marcar como comprado"
                >
                  <Check className="w-4 h-4" style={{ color: 'white' }} />
                </button>

                <button
                  onClick={() => handleDelete(product.id, product.name)}
                  disabled={deleteProductMutation.isPending}
                  className="neomorphic-button p-2 rounded-lg flex items-center justify-center"
                  title="Remover da lista"
                >
                  <Trash2 className="w-4 h-4" style={{ color: 'var(--error-color)' }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <AdvancedSearch
        isOpen={isAdvancedSearchOpen}
        onClose={() => setIsAdvancedSearchOpen(false)}
        onSearch={(term) => setSearchTerm(term)}
      />

      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          isOpen={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          onProductUpdated={() => {
            setEditingProduct(null);
            queryClient.invalidateQueries({ queryKey: ["/api/products"] });
          }}
        />
      )}

      {paymentProduct && (
        <PaymentModal
          isOpen={!!paymentProduct}
          onClose={() => setPaymentProduct(null)}
          product={paymentProduct}
          onPaymentAdded={() => {
            setPaymentProduct(null);
            queryClient.invalidateQueries({ queryKey: ["/api/products"] });
          }}
        />
      )}
    </div>
  );
}
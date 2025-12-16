import { useState, useCallback } from "react";
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

  const { data: products = [], isLoading, refetch } = useQuery<SelectProduct[]>({
    queryKey: ["/api/products", refreshKey],
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
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
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
      <div className="flex items-center justify-center py-16" data-testid="produtos-loading">
        <div className="pulse-animation">
          <Package className="w-12 h-12 text-gray-500 dark:text-gray-400" aria-hidden="true" />
        </div>
      </div>
    );
  }

  // Refined product update callback
  const handleProductUpdated = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/products/stats"] });
    await refetch();
  }, [refetch, queryClient]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" data-testid="produtos-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="produtos-title">
            Lista de Compras
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="produtos-count">
            {finalFilteredProducts.length} produto{finalFilteredProducts.length !== 1 ? 's' : ''} pendente{finalFilteredProducts.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="neomorphic-card p-6 rounded-2xl space-y-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700" data-testid="produtos-filters">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="neomorphic-input w-full pl-10 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 border border-gray-200 dark:border-gray-600 focus:ring-emerald-500 focus:border-emerald-500"
              data-testid="input-search-produtos"
              aria-label="Buscar produtos na lista"
            />
          </div>
          <button
            onClick={() => setIsAdvancedSearchOpen(true)}
            className="neomorphic-button whitespace-nowrap bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600"
            data-testid="button-advanced-search"
            aria-label="Abrir busca avançada"
          >
            <Filter className="w-4 h-4" aria-hidden="true" />
            Busca Avançada
          </button>
        </div>

        <CategoryFilter
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />

        <div className="flex flex-wrap gap-2" data-testid="produtos-sort-options">
          {[
            { value: "name", label: "Nome", icon: SortAsc },
            { value: "price", label: "Preço", icon: SortAsc },
            { value: "date", label: "Data", icon: SortAsc },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setSortBy(value)}
              className={`neomorphic-button text-sm ${sortBy === value
                ? 'bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                } border border-gray-200 dark:border-gray-600`}
              data-testid={`button-sort-${value}`}
              aria-label={`Ordenar por ${label}`}
              aria-pressed={sortBy === value}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
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
        <div className="neomorphic-card p-12 rounded-2xl text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700" data-testid="produtos-empty-state">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
          <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100" data-testid="text-empty-title">
            Nenhum produto encontrado
          </h3>
          <p className="text-gray-600 dark:text-gray-400" data-testid="text-empty-description">
            {products.length === 0
              ? "Adicione alguns produtos à sua lista para começar!"
              : "Tente ajustar os filtros para encontrar o que procura."
            }
          </p>
        </div>
      ) : (
        <div className="product-grid" data-testid="produtos-grid">
          {finalFilteredProducts.map((product) => (
            <div
              key={product.id}
              className="neomorphic-card p-6 rounded-2xl card-entering product-card-hover bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              data-testid={`product-card-${product.id}`}
            >
              {/* Product Image */}
              <div className="mb-4">
                <div className="relative">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={`Imagem do produto ${product.name}`}
                      className="w-full h-32 object-contain rounded-lg p-2 bg-white dark:bg-gray-100"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTAwQzEwNS41MjMgMTAwIDExMCA5NS41MjI4IDExMCA5MEM1MTAgODQuNDc3MiAxMDUuNTIzIDgwIDEwMCA4MEM5NC40NzcyIDgwIDkwIDg0LjQ3NzIgOTAgOTBDOTAgOTUuNTIyOCA5NC40NzcyIDEwMCAxMDAgMTAwWiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNMTM1IDEyMEgxMTVWMTEwSDEzNVYxMjBaIiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik05NSAxMjBINzVWMTEwSDk1VjEyMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
                        e.currentTarget.alt = 'Imagem não disponível';
                      }}
                      data-testid={`product-image-${product.id}`}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-32 rounded-lg image-placeholder flex items-center justify-center bg-white dark:bg-gray-100" data-testid={`product-image-placeholder-${product.id}`}>
                      <Package className="w-12 h-12 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                    </div>
                  )}
                </div>
              </div>

              {/* Product Info */}
              <div className="mb-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg line-clamp-2 text-gray-900 dark:text-gray-100" data-testid={`product-name-${product.id}`}>
                    {product.name}
                  </h3>
                  {product.category && (
                    <span className="category-tag ml-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600" data-testid={`product-category-${product.id}`}>
                      {product.category}
                    </span>
                  )}
                </div>

                {product.store && (
                  <p className="text-sm mb-2 text-gray-600 dark:text-gray-400" data-testid={`product-store-${product.id}`}>
                    <span aria-hidden="true">📍</span> {product.store}
                  </p>
                )}

                {product.description && (
                  <p className="text-sm line-clamp-2 mb-3 text-gray-600 dark:text-gray-400" data-testid={`product-description-${product.id}`}>
                    {product.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400" data-testid={`product-price-${product.id}`}>
                    {product.price ?
                      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(product.price))
                      : 'Preço não informado'
                    }
                  </div>
                  {product.originalPrice && Number(product.originalPrice) > (Number(product.price) || 0) && (
                    <span className="text-sm line-through text-gray-500 dark:text-gray-400" data-testid={`product-original-price-${product.id}`}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(product.originalPrice))}
                    </span>
                  )}
                </div>
              </div>

              {/* Card Actions */}
              <div className="flex items-center justify-between gap-2 border-t pt-4 border-gray-200 dark:border-gray-600" data-testid={`product-actions-${product.id}`}>
                <button
                  onClick={() => window.open(product.url, '_blank')}
                  className="flex-1 neomorphic-button px-3 py-2 rounded-lg flex items-center justify-center text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                  title="Ver produto"
                  data-testid={`button-view-product-${product.id}`}
                  aria-label={`Ver produto ${product.name} no site da loja`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>

                <button
                  onClick={() => setEditingProduct(product)}
                  className="flex-1 neomorphic-button px-3 py-2 rounded-lg flex items-center justify-center text-sm bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                  title="Editar produto"
                  data-testid={`button-edit-product-${product.id}`}
                  aria-label={`Editar produto ${product.name}`}
                >
                  <Edit className="w-4 h-4" aria-hidden="true" />
                </button>

                <button
                  onClick={() => handlePurchase(product)}
                  disabled={purchaseProductMutation.isPending}
                  className="flex-1 bg-emerald-500 dark:bg-emerald-600 text-white hover:bg-emerald-600 dark:hover:bg-emerald-700 disabled:bg-emerald-300 dark:disabled:bg-emerald-800 disabled:cursor-not-allowed px-3 py-2 rounded-lg flex items-center justify-center text-sm border border-emerald-500 dark:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                  title="Marcar como comprado"
                  data-testid={`button-purchase-product-${product.id}`}
                  aria-label={`Marcar produto ${product.name} como comprado`}
                >
                  <Check className="w-4 h-4" aria-hidden="true" />
                </button>

                <button
                  onClick={() => handleDelete(product.id, product.name)}
                  disabled={deleteProductMutation.isPending}
                  className="neomorphic-button p-2 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                  title="Remover da lista"
                  data-testid={`button-delete-product-${product.id}`}
                  aria-label={`Remover produto ${product.name} da lista`}
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
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
        onSearch={(filters) => setSearchTerm(filters.query)}
        onReset={() => setSearchTerm("")}
      />

      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          isOpen={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          onProductUpdated={handleProductUpdated}
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
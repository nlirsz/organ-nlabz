import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { History, CheckCircle, Calendar, Store, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@shared/schema";

interface HistoricoTabProps {
  refreshKey: number;
}

export function HistoricoTab({ refreshKey }: HistoricoTabProps) {
  const authToken = localStorage.getItem("authToken");
  const userId = localStorage.getItem("userId");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products", refreshKey],
    queryFn: () => 
      fetch("/api/products", {
        headers: {
          "x-auth-token": authToken || ""
        }
      }).then(res => res.json()),
    enabled: !!authToken && !!userId,
  });

  const purchasedProducts = products.filter(p => p.isPurchased).sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const totalSpent = purchasedProducts.reduce((sum, p) => sum + (p.price ? parseFloat(p.price) : 0), 0);

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
        description: "Produto removido do histórico",
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

  const handleDelete = (productId: number, productName: string) => {
    if (window.confirm(`Tem certeza que deseja remover "${productName}" do histórico?`)) {
      deleteProductMutation.mutate(productId);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 neomorphic-card rounded-full flex items-center justify-center mx-auto mb-4">
          <History className="w-8 h-8" style={{ color: 'var(--primary-action)' }} />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Histórico de Compras
        </h2>
        <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
          Acompanhe todos os produtos que você já comprou
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="neomorphic-card p-6 rounded-2xl text-center">
          <div className="w-12 h-12 neomorphic-card rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-6 h-6" style={{ color: 'var(--primary-action)' }} />
          </div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Total de Compras
          </h3>
          <p className="text-2xl font-bold" style={{ color: 'var(--primary-action)' }}>
            {purchasedProducts.length}
          </p>
        </div>
        
        <div className="neomorphic-card p-6 rounded-2xl text-center">
          <div className="w-12 h-12 neomorphic-card rounded-full flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6" style={{ color: 'var(--primary-action)' }} />
          </div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Total Gasto
          </h3>
          <p className="text-2xl font-bold" style={{ color: 'var(--primary-action)' }}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSpent)}
          </p>
        </div>
        
        <div className="neomorphic-card p-6 rounded-2xl text-center">
          <div className="w-12 h-12 neomorphic-card rounded-full flex items-center justify-center mx-auto mb-3">
            <Store className="w-6 h-6" style={{ color: 'var(--primary-action)' }} />
          </div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Lojas Diferentes
          </h3>
          <p className="text-2xl font-bold" style={{ color: 'var(--primary-action)' }}>
            {new Set(purchasedProducts.map(p => p.store)).size}
          </p>
        </div>
      </div>

      {/* Purchase History */}
      <div className="neomorphic-card p-6 rounded-2xl">
        <h3 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
          Compras Recentes
        </h3>
        
        {purchasedProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 neomorphic-card rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8" style={{ color: 'var(--text-secondary)' }} />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Nenhuma compra realizada
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Seus produtos comprados aparecerão aqui
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {purchasedProducts.map((product) => (
              <div key={product.id} className="flex items-center space-x-4 p-4 neomorphic-card rounded-xl">
                {product.imageUrl && (
                  <img 
                    src={product.imageUrl} 
                    alt={product.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}
                
                <div className="flex-1">
                  <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {product.name}
                  </h4>
                  <div className="flex items-center space-x-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <span>{product.category}</span>
                    <span>•</span>
                    <span>{product.store}</span>
                    <span>•</span>
                    <span>{new Date(product.updatedAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="font-bold text-lg" style={{ color: 'var(--primary-action)' }}>
                      {product.price ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(product.price)) : 'N/A'}
                    </p>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Comprado
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handleDelete(product.id, product.name)}
                    disabled={deleteProductMutation.isPending}
                    className="w-10 h-10 neomorphic-button rounded-full flex items-center justify-center hover:text-red-500 transition-colors"
                    title="Remover do histórico"
                  >
                    <Trash2 className="w-5 h-5" style={{ color: 'var(--error-color)' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
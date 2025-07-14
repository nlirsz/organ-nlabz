import { ShoppingList } from "@/components/shopping-list";
import type { Product } from "@shared/schema";

interface ProdutosTabProps {
  products: Product[];
  isLoading: boolean;
  onProductUpdated: () => void;
}

export function ProdutosTab({ products, isLoading, onProductUpdated }: ProdutosTabProps) {
  return (
    <div className="fade-in">
      <ShoppingList 
        products={products} 
        isLoading={isLoading} 
        onProductUpdated={onProductUpdated}
      />
    </div>
  );
}
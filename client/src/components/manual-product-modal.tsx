import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Package, DollarSign, Tag, Store, Image, FileText, ExternalLink } from "lucide-react";

interface ManualProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUrl?: string;
  initialData?: {
    name?: string;
    price?: string;
    store?: string;
    imageUrl?: string;
    description?: string;
    category?: string;
    brand?: string;
  };
  onProductAdded?: () => void;
}

const categories = [
  { value: "Geral", label: "Geral" },
  { value: "Eletronicos", label: "Eletrônicos" },
  { value: "Roupas", label: "Roupas e Acessórios" },
  { value: "Casa", label: "Casa e Decoração" },
  { value: "Livros", label: "Livros e Mídia" },
  { value: "Games", label: "Games e Entretenimento" },
  { value: "Presentes", label: "Presentes e Outros" },
];

export function ManualProductModal({ isOpen, onClose, initialUrl = "", initialData = {}, onProductAdded }: ManualProductModalProps) {
  const [formData, setFormData] = useState({
    url: initialUrl,
    name: initialData.name || "",
    price: initialData.price || "",
    originalPrice: "",
    imageUrl: initialData.imageUrl || "",
    store: initialData.store || "",
    description: initialData.description || "",
    category: initialData.category || "Geral",
    brand: initialData.brand || "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createManualProduct = useMutation({
    mutationFn: (data: typeof formData) => apiRequest('/api/products/manual', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/stats"] });
      toast({
        title: "Produto adicionado!",
        description: "Produto foi adicionado manualmente com sucesso.",
      });
      onProductAdded?.();
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar produto",
        description: error.message || "Não foi possível adicionar o produto.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      url: "",
      name: "",
      price: "",
      originalPrice: "",
      imageUrl: "",
      store: "",
      description: "",
      category: "Geral",
      brand: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.url.trim()) {
      toast({
        title: "URL obrigatória",
        description: "Por favor, insira a URL do produto.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira o nome do produto.",
        variant: "destructive",
      });
      return;
    }

    createManualProduct.mutate(formData);
  };

  const handleClose = () => {
    if (!createManualProduct.isPending) {
      onClose();
      resetForm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Adicionar Produto Manualmente
          </DialogTitle>
          <DialogDescription>
            Preencha as informações do produto. Apenas a URL e o nome são obrigatórios.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* URL do Produto */}
          <div className="space-y-2">
            <Label htmlFor="url" className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              URL do Produto *
            </Label>
            <Input
              id="url"
              type="url"
              placeholder="https://exemplo.com/produto"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              required
            />
          </div>

          {/* Nome do Produto */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Nome do Produto *
            </Label>
            <Input
              id="name"
              placeholder="Digite o nome do produto"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          {/* Preços */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Preço Atual (R$)
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="originalPrice" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Preço Original (R$)
              </Label>
              <Input
                id="originalPrice"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.originalPrice}
                onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
              />
            </div>
          </div>

          {/* Loja e Marca */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="store" className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                Loja
              </Label>
              <Input
                id="store"
                placeholder="Nome da loja"
                value={formData.store}
                onChange={(e) => setFormData({ ...formData, store: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Marca
              </Label>
              <Input
                id="brand"
                placeholder="Marca do produto"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              />
            </div>
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label htmlFor="category" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Categoria
            </Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* URL da Imagem */}
          <div className="space-y-2">
            <Label htmlFor="imageUrl" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              URL da Imagem
            </Label>
            <Input
              id="imageUrl"
              type="url"
              placeholder="https://exemplo.com/imagem.jpg"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Descrição
            </Label>
            <Textarea
              id="description"
              placeholder="Descreva o produto..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createManualProduct.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createManualProduct.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createManualProduct.isPending ? "Adicionando..." : "Adicionar Produto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
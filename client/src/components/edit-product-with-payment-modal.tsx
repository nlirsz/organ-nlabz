import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Product } from "@shared/schema";

interface PaymentData {
  id: number;
  paymentMethod: string;
  bank: string;
  installments: number;
  installmentValue: number;
  totalValue: number;
  purchaseDate: string;
  firstDueDate: string;
}

interface EditProductWithPaymentModalProps {
  product: Product;
  paymentData?: PaymentData | null;
  isOpen: boolean;
  onClose: () => void;
  onProductUpdated: () => void;
}

export function EditProductWithPaymentModal({ 
  product, 
  paymentData, 
  isOpen, 
  onClose, 
  onProductUpdated 
}: EditProductWithPaymentModalProps) {
  const [productForm, setProductForm] = useState({
    name: product.name,
    price: product.price || '',
    originalPrice: product.originalPrice || '',
    url: product.url,
    imageUrl: product.imageUrl || '',
    store: product.store || '',
    description: product.description || '',
    category: product.category || 'Outros',
    brand: product.brand || '',
    tags: product.tags || '',
  });

  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: paymentData?.paymentMethod || '',
    bank: paymentData?.bank || '',
    installments: paymentData?.installments || 1,
    installmentValue: paymentData?.installmentValue || 0,
    totalValue: paymentData?.totalValue || parseFloat(product.price || '0'),
    purchaseDate: paymentData?.purchaseDate ? new Date(paymentData.purchaseDate).toISOString().split('T')[0] : '',
    firstDueDate: paymentData?.firstDueDate ? new Date(paymentData.firstDueDate).toISOString().split('T')[0] : '',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen) {
      setProductForm({
        name: product.name,
        price: product.price || '',
        originalPrice: product.originalPrice || '',
        url: product.url,
        imageUrl: product.imageUrl || '',
        store: product.store || '',
        description: product.description || '',
        category: product.category || 'Outros',
        brand: product.brand || '',
        tags: product.tags || '',
      });

      if (paymentData) {
        setPaymentForm({
          paymentMethod: paymentData.paymentMethod || '',
          bank: paymentData.bank || '',
          installments: paymentData.installments || 1,
          installmentValue: paymentData.installmentValue || 0,
          totalValue: paymentData.totalValue || parseFloat(product.price || '0'),
          purchaseDate: paymentData.purchaseDate ? new Date(paymentData.purchaseDate).toISOString().split('T')[0] : '',
          firstDueDate: paymentData.firstDueDate ? new Date(paymentData.firstDueDate).toISOString().split('T')[0] : '',
        });
      }
    }
  }, [product, paymentData, isOpen]);

  const updateProductMutation = useMutation({
    mutationFn: async (updates: Partial<Product>) => {
      const response = await apiRequest("PUT", `/api/products/${product.id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", 1] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/stats", 1] });
      toast({
        title: "Sucesso",
        description: "Produto atualizado com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar produto",
        variant: "destructive",
      });
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async (updates: Partial<PaymentData>) => {
      if (!paymentData?.id) {
        throw new Error("ID do pagamento não encontrado");
      }
      const response = await apiRequest("PUT", `/api/payments/${paymentData.id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/payments/product/${product.id}`, product.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/installments"] });
      toast({
        title: "Sucesso",
        description: "Dados de pagamento atualizados com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar pagamento",
        variant: "destructive",
      });
    },
  });

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProductMutation.mutate(productForm);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentData) {
      toast({
        title: "Erro",
        description: "Nenhum dados de pagamento encontrados para este produto",
        variant: "destructive",
      });
      return;
    }
    updatePaymentMutation.mutate(paymentForm);
  };

  const handleSaveAll = () => {
    updateProductMutation.mutate(productForm);
    if (paymentData) {
      updatePaymentMutation.mutate(paymentForm);
    }
    onProductUpdated();
    onClose();
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="produto" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="produto">Dados do Produto</TabsTrigger>
          <TabsTrigger value="pagamento" disabled={!paymentData}>Dados do Pagamento</TabsTrigger>
        </TabsList>

        <TabsContent value="produto" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Produto</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProductSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Produto</Label>
                    <Input
                      id="name"
                      value={productForm.name}
                      onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="store">Loja</Label>
                    <Input
                      id="store"
                      value={productForm.store}
                      onChange={(e) => setProductForm(prev => ({ ...prev, store: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">Preço Atual</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={productForm.price}
                      onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="originalPrice">Preço Original</Label>
                    <Input
                      id="originalPrice"
                      type="number"
                      step="0.01"
                      value={productForm.originalPrice}
                      onChange={(e) => setProductForm(prev => ({ ...prev, originalPrice: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Select 
                      value={productForm.category} 
                      onValueChange={(value) => setProductForm(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Outros">Outros</SelectItem>
                        <SelectItem value="Casa">Casa e Decoração</SelectItem>
                        <SelectItem value="Roupas">Roupas e Acessórios</SelectItem>
                        <SelectItem value="Eletrônicos">Eletrônicos</SelectItem>
                        <SelectItem value="Games">Games</SelectItem>
                        <SelectItem value="Livros">Livros</SelectItem>
                        <SelectItem value="Esportes">Esportes</SelectItem>
                        <SelectItem value="Automotivo">Automotivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="brand">Marca</Label>
                    <Input
                      id="brand"
                      value={productForm.brand}
                      onChange={(e) => setProductForm(prev => ({ ...prev, brand: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url">URL do Produto</Label>
                  <Input
                    id="url"
                    type="url"
                    value={productForm.url}
                    onChange={(e) => setProductForm(prev => ({ ...prev, url: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="imageUrl">URL da Imagem</Label>
                  <Input
                    id="imageUrl"
                    type="url"
                    value={productForm.imageUrl}
                    onChange={(e) => setProductForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={productForm.description}
                    onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <Button type="submit" disabled={updateProductMutation.isPending}>
                  {updateProductMutation.isPending ? "Salvando..." : "Salvar Produto"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagamento" className="space-y-4">
          {paymentData ? (
            <Card>
              <CardHeader>
                <CardTitle>Informações do Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
                      <Select
                        value={paymentForm.paymentMethod}
                        onValueChange={(value) => setPaymentForm(prev => ({ ...prev, paymentMethod: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a forma de pagamento" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="credito">Cartão de Crédito</SelectItem>
                          <SelectItem value="debito">Cartão de Débito</SelectItem>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="boleto">Boleto</SelectItem>
                          <SelectItem value="dinheiro">Dinheiro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bank">Banco/Cartão</Label>
                      <Input
                        id="bank"
                        value={paymentForm.bank}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, bank: e.target.value }))}
                        placeholder="Ex: Nubank, Itaú, Santander..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="installments">Número de Parcelas</Label>
                      <Input
                        id="installments"
                        type="number"
                        min="1"
                        max="48"
                        value={paymentForm.installments}
                        onChange={(e) => {
                          const installments = parseInt(e.target.value);
                          setPaymentForm(prev => ({ 
                            ...prev, 
                            installments,
                            installmentValue: prev.totalValue / installments
                          }));
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="installmentValue">Valor da Parcela</Label>
                      <Input
                        id="installmentValue"
                        type="number"
                        step="0.01"
                        value={paymentForm.installmentValue}
                        onChange={(e) => {
                          const installmentValue = parseFloat(e.target.value);
                          setPaymentForm(prev => ({ 
                            ...prev, 
                            installmentValue,
                            totalValue: installmentValue * prev.installments
                          }));
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="totalValue">Valor Total</Label>
                      <Input
                        id="totalValue"
                        type="number"
                        step="0.01"
                        value={paymentForm.totalValue}
                        onChange={(e) => {
                          const totalValue = parseFloat(e.target.value);
                          setPaymentForm(prev => ({ 
                            ...prev, 
                            totalValue,
                            installmentValue: totalValue / prev.installments
                          }));
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="purchaseDate">Data da Compra</Label>
                      <Input
                        id="purchaseDate"
                        type="date"
                        value={paymentForm.purchaseDate}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, purchaseDate: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="firstDueDate">Primeiro Vencimento</Label>
                      <Input
                        id="firstDueDate"
                        type="date"
                        value={paymentForm.firstDueDate}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, firstDueDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={updatePaymentMutation.isPending}>
                    {updatePaymentMutation.isPending ? "Salvando..." : "Salvar Pagamento"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500">
                  Este produto não possui dados de pagamento cadastrados.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSaveAll} disabled={updateProductMutation.isPending || updatePaymentMutation.isPending}>
          {(updateProductMutation.isPending || updatePaymentMutation.isPending) ? "Salvando..." : "Salvar Tudo"}
        </Button>
      </div>
    </div>
  );
}
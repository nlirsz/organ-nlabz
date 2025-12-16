import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, CreditCard, Package, AlertTriangle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { detectProductIssues, hasAnyIssues, hasCriticalIssues } from "@/lib/product-validation";
import type { SelectProduct } from "@shared/schema";

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
  product: SelectProduct;
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
  const [activeTab, setActiveTab] = useState("produto");
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
    quantity: (product as any).quantity?.toString() || '1', // Novo campo
    unitPrice: (product as any).unitPrice?.toString() || product.price || '', // Novo campo
  });

  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: paymentData?.paymentMethod || '',
    bank: paymentData?.bank || '',
    installments: paymentData?.installments || 1,
    installmentValue: paymentData?.installmentValue || 0,
    totalValue: paymentData?.totalValue || Number(product.price) || 0,
    purchaseDate: paymentData?.purchaseDate ? new Date(paymentData.purchaseDate).toISOString().split('T')[0] : '',
    firstDueDate: paymentData?.firstDueDate ? new Date(paymentData.firstDueDate).toISOString().split('T')[0] : '',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen) {
      // Definir aba inicial baseada em dados de pagamento
      if (product.isPurchased && paymentData) {
        setActiveTab("pagamento");
      } else {
        setActiveTab("produto");
      }

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
        quantity: (product as any).quantity?.toString() || '1', // Definir valor inicial
        unitPrice: (product as any).unitPrice?.toString() || product.price || '', // Definir valor inicial
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
    mutationFn: async (updates: Partial<SelectProduct>) => {
      const response = await apiRequest("PUT", `/api/products/${product.id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/stats"] });
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
      if (paymentData?.id) {
        // Atualizar pagamento existente
        const response = await apiRequest("PUT", `/api/payments/${paymentData.id}`, updates);
        return response.json();
      } else {
        // Criar novo pagamento
        const paymentDataToCreate = {
          productId: product.id,
          ...updates
        };
        const response = await apiRequest("POST", `/api/payments`, paymentDataToCreate);
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/payments/product/${product.id}`, product.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/installments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Sucesso",
        description: paymentData ? "Dados de pagamento atualizados com sucesso!" : "Dados de pagamento adicionados com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao salvar dados de pagamento",
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
    if (!product.isPurchased) {
      toast({
        title: "Erro",
        description: "Este produto não está marcado como comprado",
        variant: "destructive",
      });
      return;
    }
    updatePaymentMutation.mutate(paymentForm);
  };

  const handleSaveAll = async () => {
    try {
      await updateProductMutation.mutateAsync(productForm);
      if (product.isPurchased && paymentData) {
        await updatePaymentMutation.mutateAsync(paymentForm);
      }
      onProductUpdated();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  };

  const handleProductInputChange = (field: string, value: string) => {
    setProductForm(prev => {
      const updated = { ...prev, [field]: value };

      // Recalcula preço quando quantidade muda
      if (field === 'quantity') {
        const qty = parseInt(value) || 1;
        const unit = parseFloat(prev.unitPrice as string) || 0;
        if (unit > 0) {
          updated.price = (unit * qty).toFixed(2);
        } else {
          updated.price = '0.00'; // Reset price if unitPrice is invalid
        }
      }

      // Recalcula preço unitário quando preço total muda
      if (field === 'price') {
        const total = parseFloat(value) || 0;
        const qty = parseInt(prev.quantity as string) || 1;
        if (total > 0 && qty > 0) {
          updated.unitPrice = (total / qty).toFixed(2);
        } else {
          updated.unitPrice = '0.00'; // Reset unitPrice if total or qty is invalid
        }
      }

      // Atualiza preço total quando preço unitário muda
      if (field === 'unitPrice') {
        const unit = parseFloat(value) || 0;
        const qty = parseInt(prev.quantity as string) || 1;
        if (unit > 0) {
          updated.price = (unit * qty).toFixed(2);
        } else {
          updated.price = '0.00'; // Reset price if unitPrice is invalid
        }
      }

      return updated;
    });
  };

  const handleImagePaste = async (event: React.ClipboardEvent<HTMLDivElement>) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          try {
            const formData = new FormData();
            formData.append("image", file);

            // Replace with your actual upload endpoint
            const response = await fetch("/api/upload-image", {
              method: "POST",
              body: formData,
            });

            if (!response.ok) {
              throw new Error("Failed to upload image");
            }

            const data = await response.json();
            setProductForm(prev => ({ ...prev, imageUrl: data.url }));
            toast({
              title: "Sucesso",
              description: "Imagem enviada com sucesso!",
            });
          } catch (error) {
            console.error("Image upload error:", error);
            toast({
              title: "Erro",
              description: "Falha ao enviar imagem.",
              variant: "destructive",
            });
          }
          event.preventDefault(); // Prevent default paste behavior
          return;
        }
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onPaste={handleImagePaste}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Editar Produto
            {product.isPurchased && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Comprado
              </Badge>
            )}
            {hasAnyIssues(product) && (
              <Badge variant="secondary" className={
                hasCriticalIssues(product)
                  ? "bg-red-100 text-red-800"
                  : "bg-yellow-100 text-yellow-800"
              }>
                <AlertTriangle className="w-3 h-3 mr-1" />
                {hasCriticalIssues(product) ? "Problemas Críticos" : "Verificar Dados"}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Alerta de Problemas */}
        {hasAnyIssues(product) && (
          <div className={`p-4 rounded-lg border-l-4 ${hasCriticalIssues(product)
              ? 'bg-red-50 border-red-400 text-red-800'
              : 'bg-yellow-50 border-yellow-400 text-yellow-800'
            }`}>
            <div className="flex items-start">
              <AlertTriangle className={`w-5 h-5 mr-2 mt-0.5 ${hasCriticalIssues(product) ? 'text-red-500' : 'text-yellow-500'
                }`} />
              <div>
                <h4 className="font-semibold mb-2">
                  Problemas Detectados na Extração Automática
                </h4>
                <ul className="text-sm space-y-1">
                  {detectProductIssues(product).map((issue, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{issue.message}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs mt-2 opacity-80">
                  Por favor, verifique e corrija os dados abaixo conforme necessário.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="produto">Dados do Produto</TabsTrigger>
              <TabsTrigger value="pagamento" disabled={!product.isPurchased}>Dados do Pagamento</TabsTrigger>
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
                          className="product-name-field"
                          maxLength={100}
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

                      {/* Campos de Quantidade e Preço Unitário/Total */}
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Quantidade</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          value={productForm.quantity}
                          onChange={(e) => handleProductInputChange('quantity', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="unitPrice">Preço Unitário (R$)</Label>
                        <Input
                          id="unitPrice"
                          type="number"
                          step="0.01"
                          value={productForm.unitPrice}
                          onChange={(e) => handleProductInputChange('unitPrice', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="price">Preço Total (R$)</Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          value={productForm.price}
                          onChange={(e) => handleProductInputChange('price', e.target.value)}
                        />
                        {productForm.quantity && parseInt(productForm.quantity as string) > 1 && (
                          <p className="text-xs text-gray-500">
                            {productForm.quantity}x de R$ {productForm.unitPrice || '0.00'}
                          </p>
                        )}
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
                        className="modal-field-restricted"
                        maxLength={500}
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
                        className="modal-field-restricted"
                        maxLength={500}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        value={productForm.description}
                        onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                        className="product-description-field"
                        maxLength={300}
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
              ) : product.isPurchased ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Adicionar Informações do Pagamento</CardTitle>
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

                      <div className="text-center text-sm text-gray-500 mb-4">
                        Complete as informações de pagamento para este produto já comprado.
                      </div>

                      <Button type="submit" disabled={updatePaymentMutation.isPending}>
                        {updatePaymentMutation.isPending ? "Salvando..." : "Salvar Dados de Pagamento"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center space-y-4">
                      <p className="text-gray-500">
                        Este produto não está marcado como comprado.
                      </p>
                      <p className="text-sm text-gray-400">
                        Para adicionar dados de pagamento, marque o produto como comprado primeiro.
                      </p>
                    </div>
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
      </DialogContent>
    </Dialog>
  );
}
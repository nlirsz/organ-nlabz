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

export function EditProductWithPaymentModal({ isOpen, onClose, product, onSuccess }: EditProductWithPaymentModalProps) {
  const [productData, setProductData] = useState({
    name: product.name,
    price: product.price || "",
    originalPrice: product.originalPrice || "",
    store: product.store,
    description: product.description || "",
    category: product.category || "Outros",
    brand: product.brand || "",
  });

  const [paymentData, setPaymentData] = useState({
    paymentMethod: "",
    bank: "",
    installments: 1,
    installmentValue: 0,
    totalValue: parseFloat(product.price || "0"),
    purchaseDate: new Date().toISOString().split('T')[0],
    firstDueDate: new Date().toISOString().split('T')[0],
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const authToken = localStorage.getItem("authToken");

  // Query para buscar dados de pagamento existentes
  const { data: existingPayment } = useQuery({
    queryKey: [`/api/payments/product/${product.id}`],
    queryFn: () => 
      apiRequest(`/api/payments/product/${product.id}`, {
        headers: {
          "x-auth-token": authToken || ""
        }
      }),
    enabled: isOpen && !!authToken,
  });

  // Atualiza dados de pagamento quando carregados
  useEffect(() => {
    if (existingPayment) {
      setPaymentData({
        paymentMethod: existingPayment.paymentMethod || "",
        bank: existingPayment.bank || "",
        installments: existingPayment.installments || 1,
        installmentValue: existingPayment.installmentValue || 0,
        totalValue: existingPayment.totalValue || parseFloat(product.price || "0"),
        purchaseDate: existingPayment.purchaseDate || new Date().toISOString().split('T')[0],
        firstDueDate: existingPayment.firstDueDate || new Date().toISOString().split('T')[0],
      });
    }
  }, [existingPayment, product.price]);

  // Mutation para atualizar produto
  const updateProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": authToken || ""
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Falha ao atualizar produto");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
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

  // Mutation para atualizar pagamento
  const updatePaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!existingPayment?.id) {
        throw new Error("Nenhum pagamento encontrado para atualizar");
      }
      
      const response = await fetch(`/api/payments/${existingPayment.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": authToken || ""
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Falha ao atualizar pagamento");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/payments/product/${product.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      toast({
        title: "Sucesso",
        description: "Forma de pagamento atualizada com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar forma de pagamento",
        variant: "destructive",
      });
    },
  });

  const handleUpdateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    updateProductMutation.mutate(productData);
  };

  const handleUpdatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paymentData.paymentMethod || !paymentData.bank) {
      toast({
        title: "Erro",
        description: "Forma de pagamento e banco são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const updatedPaymentData = {
      ...paymentData,
      installmentValue: paymentData.totalValue / paymentData.installments,
    };

    updatePaymentMutation.mutate(updatedPaymentData);
  };

  const handleClose = () => {
    onClose();
    if (updateProductMutation.isSuccess || updatePaymentMutation.isSuccess) {
      onSuccess();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Produto e Forma de Pagamento</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="produto" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="produto">Dados do Produto</TabsTrigger>
            <TabsTrigger value="pagamento" disabled={!existingPayment}>Dados do Pagamento</TabsTrigger>
          </TabsList>

          <TabsContent value="produto" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Produto</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProduct} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome</Label>
                      <Input
                        id="name"
                        value={productData.name}
                        onChange={(e) => setProductData(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="store">Loja</Label>
                      <Input
                        id="store"
                        value={productData.store}
                        onChange={(e) => setProductData(prev => ({ ...prev, store: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Preço</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={productData.price}
                        onChange={(e) => setProductData(prev => ({ ...prev, price: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="originalPrice">Preço Original</Label>
                      <Input
                        id="originalPrice"
                        type="number"
                        step="0.01"
                        value={productData.originalPrice}
                        onChange={(e) => setProductData(prev => ({ ...prev, originalPrice: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Categoria</Label>
                      <Select 
                        value={productData.category} 
                        onValueChange={(value) => setProductData(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Eletrônicos">Eletrônicos</SelectItem>
                          <SelectItem value="Roupas">Roupas</SelectItem>
                          <SelectItem value="Casa">Casa</SelectItem>
                          <SelectItem value="Livros">Livros</SelectItem>
                          <SelectItem value="Games">Games</SelectItem>
                          <SelectItem value="Automotivo">Automotivo</SelectItem>
                          <SelectItem value="Esportes">Esportes</SelectItem>
                          <SelectItem value="Outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="brand">Marca</Label>
                      <Input
                        id="brand"
                        value={productData.brand}
                        onChange={(e) => setProductData(prev => ({ ...prev, brand: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={productData.description}
                      onChange={(e) => setProductData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={updateProductMutation.isPending}
                    className="w-full"
                  >
                    {updateProductMutation.isPending ? "Salvando..." : "Salvar Produto"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pagamento" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Forma de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                {existingPayment ? (
                  <form onSubmit={handleUpdatePayment} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Forma de Pagamento</Label>
                        <Select 
                          value={paymentData.paymentMethod} 
                          onValueChange={(value) => setPaymentData(prev => ({ ...prev, paymentMethod: value }))}
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
                        <Label>Banco/Instituição</Label>
                        <Select 
                          value={paymentData.bank} 
                          onValueChange={(value) => setPaymentData(prev => ({ ...prev, bank: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o banco" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nubank">Nubank</SelectItem>
                            <SelectItem value="inter">Inter</SelectItem>
                            <SelectItem value="itau">Itaú</SelectItem>
                            <SelectItem value="bradesco">Bradesco</SelectItem>
                            <SelectItem value="bb">Banco do Brasil</SelectItem>
                            <SelectItem value="caixa">Caixa Econômica</SelectItem>
                            <SelectItem value="santander">Santander</SelectItem>
                            <SelectItem value="c6">C6 Bank</SelectItem>
                            <SelectItem value="next">Next</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Valor Total</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={paymentData.totalValue}
                          onChange={(e) => setPaymentData(prev => ({ ...prev, totalValue: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Número de Parcelas</Label>
                        <Select 
                          value={paymentData.installments.toString()} 
                          onValueChange={(value) => setPaymentData(prev => ({ ...prev, installments: parseInt(value) }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[...Array(24)].map((_, i) => (
                              <SelectItem key={i + 1} value={(i + 1).toString()}>
                                {i + 1}x de R$ {(paymentData.totalValue / (i + 1)).toFixed(2)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Data da Compra</Label>
                        <Input
                          type="date"
                          value={paymentData.purchaseDate}
                          onChange={(e) => setPaymentData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Primeiro Vencimento</Label>
                        <Input
                          type="date"
                          value={paymentData.firstDueDate}
                          onChange={(e) => setPaymentData(prev => ({ ...prev, firstDueDate: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Valor por parcela:</span>
                      <span className="font-semibold">
                        R$ {(paymentData.totalValue / paymentData.installments).toFixed(2)}
                      </span>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={updatePaymentMutation.isPending}
                      className="w-full"
                    >
                      {updatePaymentMutation.isPending ? "Salvando..." : "Salvar Forma de Pagamento"}
                    </Button>
                  </form>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Nenhuma forma de pagamento cadastrada para este produto.</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Use o modal de pagamento para cadastrar uma forma de pagamento primeiro.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onSuccess: () => void;
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
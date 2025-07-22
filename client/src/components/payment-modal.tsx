import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SelectProduct } from "@shared/schema";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: SelectProduct;
  onPaymentAdded: () => void;
}

export function PaymentModal({ isOpen, onClose, product, onPaymentAdded }: PaymentModalProps) {
  const [formData, setFormData] = useState({
    paymentMethod: "",
    bank: "",
    installments: 1,
    totalValue: parseFloat(product.price || "0"),
    purchaseDate: new Date().toISOString().split('T')[0],
    firstDueDate: new Date().toISOString().split('T')[0],
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const authToken = localStorage.getItem("authToken");

  const addPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      if (!authToken) {
        throw new Error("Token de autenticação não encontrado");
      }
      
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": authToken
        },
        body: JSON.stringify(paymentData),
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error("Payment error:", errorData);
        throw new Error(`Falha ao cadastrar pagamento: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: async () => {
      // Mark product as purchased after successful payment registration
      try {
        const authToken = localStorage.getItem('authToken');
        await fetch(`/api/products/${product.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': authToken || ''
          },
          body: JSON.stringify({ isPurchased: true })
        });
      } catch (error) {
        console.error('Error marking product as purchased:', error);
      }

      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      onPaymentAdded();
      onClose();
      toast({
        title: "Sucesso",
        description: "Pagamento cadastrado com sucesso!",
      });
      // Reset form
      setFormData({
        paymentMethod: "",
        bank: "",
        installments: 1,
        totalValue: parseFloat(product.price || "0"),
        purchaseDate: new Date().toISOString().split('T')[0],
        firstDueDate: new Date().toISOString().split('T')[0],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao cadastrar pagamento",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.paymentMethod || !formData.bank) {
      toast({
        title: "Erro",
        description: "Forma de pagamento e banco são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const installmentValue = formData.totalValue / formData.installments;

    const paymentData = {
      productId: product.id,
      paymentMethod: formData.paymentMethod,
      bank: formData.bank,
      installments: formData.installments,
      installmentValue: installmentValue,
      totalValue: formData.totalValue,
      purchaseDate: formData.purchaseDate,
      firstDueDate: formData.firstDueDate,
    };

    addPaymentMutation.mutate(paymentData);
  };

  const installmentValue = formData.totalValue / formData.installments;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar Pagamento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Produto</Label>
            <Input value={product.name} disabled />
          </div>

          <div className="space-y-2">
            <Label>Forma de Pagamento</Label>
            <Select 
              value={formData.paymentMethod} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
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
              value={formData.bank} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, bank: value }))}
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

          <div className="space-y-2">
            <Label>Valor Total</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.totalValue}
              onChange={(e) => setFormData(prev => ({ ...prev, totalValue: parseFloat(e.target.value) || 0 }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Número de Parcelas</Label>
            <Select 
              value={formData.installments.toString()} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, installments: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...Array(24)].map((_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    {i + 1}x de R$ {(formData.totalValue / (i + 1)).toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data da Compra</Label>
              <Input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Primeiro Vencimento</Label>
              <Input
                type="date"
                value={formData.firstDueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, firstDueDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-between text-sm text-gray-600">
            <span>Valor por parcela:</span>
            <span className="font-semibold">
              R$ {installmentValue.toFixed(2)}
            </span>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={addPaymentMutation.isPending}
              className="flex-1"
            >
              {addPaymentMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
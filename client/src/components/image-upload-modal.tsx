
import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Upload, Image as ImageIcon, Loader2, Camera, FileImage, Sparkles } from "lucide-react";

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductExtracted: (productData: any) => void;
}

export function ImageUploadModal({ isOpen, onClose, onProductExtracted }: ImageUploadModalProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Handler para Ctrl+V
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!isOpen) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onloadend = () => {
              setImagePreview(reader.result as string);
              setImageFile(blob);
            };
            reader.readAsDataURL(blob);
            
            toast({
              title: "Imagem colada com sucesso!",
              description: "Clique em 'Extrair Dados' para processar",
            });
          }
          break;
        }
      }
    };

    if (isOpen) {
      document.addEventListener('paste', handlePaste);
    }

    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [isOpen, toast]);

  const extractFromImageMutation = useMutation({
    mutationFn: async (imageData: string) => {
      const mimeType = imageData.split(';')[0].split(':')[1];
      const response = await apiRequest('POST', '/api/products/extract-from-image', {
        imageData,
        mimeType
      });
      return response.json();
    },
    onSuccess: (productData) => {
      toast({
        title: "Produto extraído com sucesso!",
        description: `"${productData.name}" - Confiança: ${productData.confidence}`,
      });
      onProductExtracted(productData);
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao processar imagem",
        description: error.message || "Não foi possível extrair dados do produto.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Valida tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem (PNG, JPG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Valida tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "Máximo 5MB. Tente redimensionar a imagem.",
        variant: "destructive",
      });
      return;
    }

    setImageFile(file);

    // Gera preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const copyToClipboard = async () => {
    if (!imagePreview) return;

    try {
      const blob = await fetch(imagePreview).then(r => r.blob());
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      
      toast({
        title: "Copiado!",
        description: "Screenshot copiado para área de transferência",
      });
    } catch (err) {
      toast({
        title: "Erro ao copiar",
        description: "Navegador não suporta cópia de imagens",
        variant: "destructive",
      });
    }
  };

  const handleExtract = () => {
    if (!imagePreview) {
      toast({
        title: "Nenhuma imagem selecionada",
        variant: "destructive",
      });
      return;
    }

    extractFromImageMutation.mutate(imagePreview);
  };

  const handleClose = () => {
    if (!extractFromImageMutation.isPending) {
      setImagePreview(null);
      setImageFile(null);
      onClose();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      // Simula evento de input para reutilizar lógica
      const fakeEvent = {
        target: { files: [file] }
      } as any;
      handleFileChange(fakeEvent);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Adicionar Produto por Imagem
          </DialogTitle>
          <DialogDescription>
            Tire um screenshot (Print Screen) e cole aqui com <kbd className="px-1 py-0.5 text-xs font-semibold bg-gray-100 border border-gray-300 rounded">Ctrl+V</kbd> ou arraste o arquivo. Custo: ~R$ 0,003
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Area */}
          {!imagePreview ? (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">Arraste uma imagem ou clique para selecionar</p>
              <p className="text-sm text-gray-500">PNG, JPG até 5MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview */}
              <div className="border rounded-lg p-4">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-64 mx-auto rounded"
                />
              </div>

              {/* Informações */}
              <div className="text-sm text-gray-600 space-y-1">
                <p className="flex items-center gap-2">
                  <FileImage className="h-4 w-4" />
                  Arquivo: {imageFile?.name}
                </p>
                <p className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  A IA vai extrair: nome, preço, marca e categoria
                </p>
              </div>

              {/* Botões */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setImagePreview(null);
                    setImageFile(null);
                  }}
                  disabled={extractFromImageMutation.isPending}
                >
                  Trocar
                </Button>
                <Button
                  variant="outline"
                  onClick={copyToClipboard}
                  disabled={extractFromImageMutation.isPending}
                  title="Copiar para área de transferência"
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleExtract}
                  disabled={extractFromImageMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {extractFromImageMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Extrair Dados
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

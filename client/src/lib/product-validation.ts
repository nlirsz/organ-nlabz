
export interface ProductIssue {
  type: 'price' | 'image' | 'name' | 'store';
  severity: 'warning' | 'error';
  message: string;
}

export function detectProductIssues(product: any): ProductIssue[] {
  const issues: ProductIssue[] = [];
  
  // Detecta problemas de preço
  if (!product.price || product.price === "0" || product.price === "0.00") {
    issues.push({
      type: 'price',
      severity: 'error',
      message: 'Preço não foi extraído corretamente'
    });
  } else {
    const price = Number(product.price);
    // Preços muito baixos ou muito altos podem ser suspeitos
    if (price < 1) {
      issues.push({
        type: 'price',
        severity: 'warning',
        message: 'Preço parece muito baixo - verifique se está correto'
      });
    } else if (price > 50000) {
      issues.push({
        type: 'price',
        severity: 'warning',
        message: 'Preço parece muito alto - verifique se está correto'
      });
    }
  }
  
  // Detecta problemas de imagem
  if (!product.imageUrl || 
      product.imageUrl.includes('placeholder') || 
      product.imageUrl.includes('via.placeholder') ||
      product.imageUrl.includes('/photos///') || // URLs quebradas da Zara
      product.imageUrl === 'https://via.placeholder.com/400x400/e0e5ec/6c757d?text=') {
    issues.push({
      type: 'image',
      severity: 'warning',
      message: 'Imagem não foi extraída ou pode estar incorreta'
    });
  }
  
  // Detecta nomes genéricos ou problemáticos
  if (!product.name || 
      product.name.includes('Produto extraído da URL') ||
      product.name.includes('Produto de ') ||
      product.name === 'Produto Desconhecido' ||
      product.name.length < 5) {
    issues.push({
      type: 'name',
      severity: 'warning',
      message: 'Nome do produto pode estar incompleto'
    });
  }
  
  // Detecta lojas específicas com problemas conhecidos
  const problematicStores = ['zara', 'adidas', 'nike'];
  const storeLower = (product.store || '').toLowerCase();
  const urlLower = (product.url || '').toLowerCase();
  
  if (problematicStores.some(store => storeLower.includes(store) || urlLower.includes(store))) {
    issues.push({
      type: 'store',
      severity: 'warning',
      message: 'Esta loja pode ter dificuldades de extração - verifique os dados'
    });
  }
  
  return issues;
}

export function hasAnyIssues(product: any): boolean {
  return detectProductIssues(product).length > 0;
}

export function hasCriticalIssues(product: any): boolean {
  return detectProductIssues(product).some(issue => issue.severity === 'error');
}

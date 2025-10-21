/**
 * Mapeamento centralizado de lojas de e-commerce
 * Usado por todo o sistema de scraping para evitar duplicação
 */

export interface StoreInfo {
  name: string;
  isDifficult?: boolean; // Sites que requerem scraping avançado
}

/**
 * Mapa completo de domínios para nomes de lojas
 * Centralizado para evitar duplicação em 4+ arquivos
 */
export const STORE_MAP: Record<string, StoreInfo> = {
  'mercadolivre.com.br': { name: 'Mercado Livre', isDifficult: true },
  'amazon.com.br': { name: 'Amazon Brasil', isDifficult: true },
  'magazineluiza.com.br': { name: 'Magazine Luiza', isDifficult: true },
  'americanas.com.br': { name: 'Americanas', isDifficult: true },
  'submarino.com.br': { name: 'Submarino', isDifficult: true },
  'casasbahia.com.br': { name: 'Casas Bahia', isDifficult: true },
  'extra.com.br': { name: 'Extra', isDifficult: true },
  'ponto.com.br': { name: 'Ponto', isDifficult: true },
  'shopee.com.br': { name: 'Shopee', isDifficult: false },
  'shopee.com': { name: 'Shopee', isDifficult: false },
  'zara.com': { name: 'Zara', isDifficult: true },
  'hm.com': { name: 'H&M', isDifficult: true },
  'nike.com.br': { name: 'Nike Brasil', isDifficult: true },
  'netshoes.com.br': { name: 'Netshoes', isDifficult: false },
  'dafiti.com.br': { name: 'Dafiti', isDifficult: false },
  'kabum.com.br': { name: 'KaBuM', isDifficult: false },
  'pichau.com.br': { name: 'Pichau', isDifficult: false },
  'aliexpress.com': { name: 'AliExpress', isDifficult: false },
  'aliexpress.us': { name: 'AliExpress', isDifficult: false },
  'aliexpress.ru': { name: 'AliExpress', isDifficult: false },
  'pt.aliexpress.com': { name: 'AliExpress', isDifficult: false },
  'shoptime.com.br': { name: 'Shoptime', isDifficult: false },
  'sephora.com.br': { name: 'Sephora', isDifficult: false }
};

/**
 * Extrai o nome da loja a partir da URL
 * Versão centralizada e otimizada
 */
export function extractStoreFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    
    // Busca no mapa de lojas
    for (const [domain, info] of Object.entries(STORE_MAP)) {
      if (hostname.includes(domain)) {
        return info.name;
      }
    }
    
    // Fallback: formata o nome do domínio
    const domainParts = hostname.split('.');
    const storeName = domainParts[0];
    return storeName.charAt(0).toUpperCase() + storeName.slice(1);
    
  } catch {
    return 'Loja Online';
  }
}

/**
 * Verifica se um site é difícil de scrapear (requer AnyCrawl)
 */
export function isDifficultSite(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    
    for (const [domain, info] of Object.entries(STORE_MAP)) {
      if (hostname.includes(domain)) {
        return info.isDifficult || false;
      }
    }
    
    return false; // Sites desconhecidos são considerados fáceis
  } catch {
    return false;
  }
}

/**
 * Mapeamento de categorias comuns
 */
export const CATEGORY_KEYWORDS: Record<string, string> = {
  'celular': 'Eletrônicos',
  'smartphone': 'Eletrônicos',
  'iphone': 'Eletrônicos',
  'notebook': 'Eletrônicos',
  'computador': 'Eletrônicos',
  'tv': 'Eletrônicos',
  'televisão': 'Eletrônicos',
  'tenis': 'Roupas e Acessórios',
  'sapato': 'Roupas e Acessórios',
  'roupa': 'Roupas e Acessórios',
  'camisa': 'Roupas e Acessórios',
  'camiseta': 'Roupas e Acessórios',
  'calça': 'Roupas e Acessórios',
  'vestido': 'Roupas e Acessórios',
  'casa': 'Casa e Decoração',
  'movel': 'Casa e Decoração',
  'decoração': 'Casa e Decoração',
  'livro': 'Livros',
  'revista': 'Livros',
  'ebook': 'Livros',
  'jogo': 'Games',
  'game': 'Games',
  'console': 'Games',
  'playstation': 'Games',
  'xbox': 'Games',
  'esporte': 'Esportes',
  'fitness': 'Esportes',
  'academia': 'Esportes'
};

/**
 * Extrai categoria a partir da URL
 */
export function extractCategoryFromUrl(url: string): string {
  const urlLower = url.toLowerCase();
  
  for (const [keyword, category] of Object.entries(CATEGORY_KEYWORDS)) {
    if (urlLower.includes(keyword)) {
      return category;
    }
  }
  
  return 'Outros';
}

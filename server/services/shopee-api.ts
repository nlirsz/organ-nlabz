
interface ShopeeProductResult {
  name: string;
  price: number | null;
  originalPrice?: number | null;
  imageUrl: string | null;
  store: string;
  description?: string | null;
  category?: string | null;
  brand?: string | null;
  url: string;
}

// Configurações da Shopee
const SHOPEE_AFFILIATE_ID = process.env.SHOPEE_AFFILIATE_ID;
const SHOPEE_SUB_ID = process.env.SHOPEE_SUB_ID;

// Função para detectar se a URL é da Shopee
export function isShopeeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('shopee.com.br') || urlObj.hostname.includes('shopee.com');
  } catch {
    return false;
  }
}

// Função para extrair ID do produto da URL da Shopee
export function extractShopeeProductId(url: string): string | null {
  try {
    const patterns = [
      /shopee\.com\.br\/.*?-i\.(\d+)\.(\d+)/i,
      /shopee\.com\.br\/.*?\.(\d+)\.(\d+)/i,
      /product\/(\d+)\/(\d+)/i
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1] && match[2]) {
        console.log(`[Shopee] ID do produto extraído: ${match[1]}.${match[2]}`);
        return `${match[1]}.${match[2]}`;
      }
    }

    console.log(`[Shopee] ID do produto não encontrado na URL: ${url}`);
    return null;
  } catch (error) {
    console.error('[Shopee] Erro ao extrair ID do produto:', error);
    return null;
  }
}

// Função para limpar URL da Shopee removendo parâmetros existentes
export function cleanShopeeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Remove todos os parâmetros de consulta existentes
    urlObj.search = '';
    
    return urlObj.toString();
  } catch (error) {
    console.error('[Shopee] Erro ao limpar URL:', error);
    return url;
  }
}

// Função para adicionar parâmetros de afiliado à URL da Shopee
export function addShopeeAffiliateParams(url: string): string {
  if (!SHOPEE_AFFILIATE_ID || !SHOPEE_SUB_ID) {
    console.warn('[Shopee] IDs de afiliado não configurados nas variáveis de ambiente');
    return url;
  }

  try {
    // Primeiro limpa a URL
    const cleanUrl = cleanShopeeUrl(url);
    const urlObj = new URL(cleanUrl);
    
    // Adiciona os parâmetros de afiliado
    urlObj.searchParams.set('af_click_lookback', '7d');
    urlObj.searchParams.set('af_viewthrough_lookback', '1d');
    urlObj.searchParams.set('pid', 'af_app_invites');
    urlObj.searchParams.set('c', SHOPEE_SUB_ID);
    urlObj.searchParams.set('af_siteid', SHOPEE_AFFILIATE_ID);
    
    const affiliateUrl = urlObj.toString();
    
    console.log(`[Shopee] URL convertida para afiliado: ${url} → ${affiliateUrl}`);
    return affiliateUrl;
    
  } catch (error) {
    console.error('[Shopee] Erro ao adicionar parâmetros de afiliado:', error);
    return url;
  }
}

// Função para buscar informações do produto da Shopee (usando catálogo se disponível)
export async function fetchShopeeProduct(url: string): Promise<ShopeeProductResult | null> {
  const productId = extractShopeeProductId(url);
  if (!productId) {
    console.log('[Shopee] Não foi possível extrair ID do produto');
    return null;
  }

  try {
    console.log(`[Shopee] Buscando produto ID: ${productId}`);
    
    // Por enquanto, retorna informações básicas
    // Futuramente pode integrar com o catálogo da Shopee
    const result: ShopeeProductResult = {
      name: 'Produto Shopee',
      price: null,
      originalPrice: null,
      imageUrl: null,
      store: 'Shopee',
      description: 'Produto da Shopee - informações serão extraídas via scraping',
      category: 'Outros',
      brand: null,
      url: addShopeeAffiliateParams(url) // URL com parâmetros de afiliado
    };

    console.log(`[Shopee] Produto básico criado com link de afiliado`);
    return result;

  } catch (error) {
    console.error('[Shopee] Erro ao buscar produto:', error);
    return null;
  }
}

// Função para integrar com o catálogo da Shopee (futura implementação)
export async function fetchFromShopeeCatalog(): Promise<any[]> {
  const SHOPEE_CATALOG_URL = 'https://affiliate.shopee.com.br/api/v1/datafeed/download?id=YWJjZGVmZ2hpamtsbW5vcPNcbnfdFhhQkoz1FtnUm6DtED25ejObtofpYLqHBC0h';
  
  try {
    console.log('[Shopee Catalog] Baixando catálogo da Shopee...');
    
    // TODO: Implementar download e processamento do catálogo
    // Por enquanto retorna array vazio
    console.log('[Shopee Catalog] Funcionalidade será implementada em breve');
    
    return [];
  } catch (error) {
    console.error('[Shopee Catalog] Erro ao acessar catálogo:', error);
    return [];
  }
}

export { ShopeeProductResult };

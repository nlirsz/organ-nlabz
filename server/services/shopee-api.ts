
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

// Cache para o catálogo da Shopee
let shopeeCatalogCache: any[] = [];
let catalogCacheTime = 0;
const CATALOG_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

// Interface para produto do catálogo
interface ShopeeCatalogProduct {
  item_id: string;
  shop_id: string;
  name: string;
  price: number;
  original_price?: number;
  image_url: string;
  product_url: string;
  brand?: string;
  category?: string;
  description?: string;
}

// Função para buscar informações do produto da Shopee (usando catálogo)
export async function fetchShopeeProduct(url: string): Promise<ShopeeProductResult | null> {
  const productId = extractShopeeProductId(url);
  if (!productId) {
    console.log('[Shopee] Não foi possível extrair ID do produto');
    return null;
  }

  try {
    console.log(`[Shopee] Buscando produto ID: ${productId} no catálogo`);
    
    // Busca no catálogo primeiro
    const catalogProduct = await searchProductInCatalog(productId, url);
    if (catalogProduct) {
      console.log(`[Shopee] ✅ Produto encontrado no catálogo: ${catalogProduct.name}`);
      return catalogProduct;
    }

    console.log(`[Shopee] Produto não encontrado no catálogo - usando scraping como fallback`);
    return null;

  } catch (error) {
    console.error('[Shopee] Erro ao buscar produto:', error);
    return null;
  }
}

// Função para buscar produto específico no catálogo
async function searchProductInCatalog(productId: string, originalUrl: string): Promise<ShopeeProductResult | null> {
  try {
    const catalog = await fetchFromShopeeCatalog();
    if (!catalog || catalog.length === 0) {
      console.log('[Shopee Catalog] Catálogo vazio ou não disponível');
      return null;
    }

    // Extrai shop_id e item_id do productId
    const [shopId, itemId] = productId.split('.');
    
    console.log(`[Shopee Catalog] Procurando shop_id: ${shopId}, item_id: ${itemId}`);

    // BUSCA EXATA PRIORITÁRIA: shop_id E item_id devem coincidir
    let product = catalog.find((p: any) => 
      p.shop_id?.toString() === shopId && p.item_id?.toString() === itemId
    );

    if (product) {
      console.log(`[Shopee Catalog] ✅ Busca exata encontrada: ${product.name}`);
    } else {
      console.log(`[Shopee Catalog] ❌ Busca exata falhou - produto não encontrado no catálogo`);
      
      // Log para debug: mostra alguns produtos do catálogo para comparação
      const sampleProducts = catalog.slice(0, 5);
      console.log('[Shopee Catalog] Exemplos do catálogo:', sampleProducts.map(p => ({
        shop_id: p.shop_id,
        item_id: p.item_id,
        name: p.name?.substring(0, 50)
      })));
      
      return null; // Não faz busca alternativa que pode dar erro
    }

    // Validação adicional do produto encontrado
    if (!product.name || product.name.length < 5) {
      console.log(`[Shopee Catalog] ⚠️ Produto encontrado mas com nome inválido: "${product.name}"`);
      return null;
    }

    // Validação de preço
    const price = parseFloat(product.price);
    if (!price || price <= 0) {
      console.log(`[Shopee Catalog] ⚠️ Produto encontrado mas com preço inválido: ${product.price}`);
      return null;
    }

    console.log(`[Shopee Catalog] ✅ Produto válido encontrado: ${product.name} - R$ ${price}`);

    // Converte para o formato padrão
    const affiliateUrl = addShopeeAffiliateParams(originalUrl);
    
    return {
      name: product.name.trim(),
      price: price,
      originalPrice: product.original_price ? parseFloat(product.original_price) : null,
      imageUrl: product.image_url || null,
      store: 'Shopee',
      description: product.description?.trim() || `${product.name} - Produto da Shopee`,
      category: product.category || 'Outros',
      brand: product.brand || null,
      url: affiliateUrl
    };

  } catch (error) {
    console.error('[Shopee Catalog] Erro ao buscar no catálogo:', error);
    return null;
  }
}

// Função para extrair palavras-chave da URL
function extractKeywordsFromUrl(url: string): string[] {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Remove parâmetros comuns e extrai palavras significativas
    const segments = pathname.split('/').filter(segment => 
      segment.length > 3 && 
      !segment.match(/^(i\.|shopee|br|product)$/i) &&
      !segment.match(/^\d+$/) // Remove números puros
    );

    const keywords: string[] = [];
    
    for (const segment of segments) {
      // Quebra por hífens e underscores
      const words = segment.split(/[-_]/).filter(word => word.length > 2);
      keywords.push(...words);
    }

    return keywords.slice(0, 5); // Limita a 5 palavras-chave
  } catch (error) {
    console.error('[Shopee Catalog] Erro ao extrair keywords:', error);
    return [];
  }
}

// Função para baixar e processar o catálogo da Shopee
export async function fetchFromShopeeCatalog(): Promise<ShopeeCatalogProduct[]> {
  const SHOPEE_CATALOG_URL = 'https://affiliate.shopee.com.br/api/v1/datafeed/download?id=YWJjZGVmZ2hpamtsbW5vcPNcbnfdFhhQkoz1FtnUm6DtED25ejObtofpYLqHBC0h';
  
  try {
    // Verifica cache primeiro
    const now = Date.now();
    if (shopeeCatalogCache.length > 0 && (now - catalogCacheTime) < CATALOG_CACHE_DURATION) {
      console.log(`[Shopee Catalog] Usando cache (${shopeeCatalogCache.length} produtos)`);
      return shopeeCatalogCache;
    }

    console.log('[Shopee Catalog] 📥 Baixando catálogo da Shopee...');
    
    const response = await fetch(SHOPEE_CATALOG_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/csv,application/csv,text/plain,*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
      },
      timeout: 30000
    });

    if (!response.ok) {
      console.error(`[Shopee Catalog] Erro HTTP: ${response.status} - ${response.statusText}`);
      return shopeeCatalogCache; // Retorna cache antigo se disponível
    }

    const csvData = await response.text();
    console.log(`[Shopee Catalog] ✅ CSV baixado: ${Math.round(csvData.length / 1024)}KB`);

    // Processa o CSV
    const products = parseShopeeCsv(csvData);
    
    if (products.length > 0) {
      shopeeCatalogCache = products;
      catalogCacheTime = now;
      console.log(`[Shopee Catalog] ✅ Cache atualizado com ${products.length} produtos`);
    } else {
      console.warn('[Shopee Catalog] ⚠️ Nenhum produto válido encontrado no CSV');
    }

    return products;

  } catch (error) {
    console.error('[Shopee Catalog] ❌ Erro ao baixar catálogo:', error);
    
    // Se tem cache antigo, usa ele
    if (shopeeCatalogCache.length > 0) {
      console.log(`[Shopee Catalog] 🔄 Usando cache antigo (${shopeeCatalogCache.length} produtos)`);
      return shopeeCatalogCache;
    }
    
    return [];
  }
}

// Função para converter CSV em array de produtos
function parseShopeeCsv(csvData: string): ShopeeCatalogProduct[] {
  try {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) {
      console.error('[Shopee CSV] CSV muito pequeno ou inválido');
      return [];
    }

    // Primeira linha = headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    console.log(`[Shopee CSV] Headers encontrados: ${headers.slice(0, 5).join(', ')}...`);

    const products: ShopeeCatalogProduct[] = [];

    // Mapeia headers para índices (flexível para diferentes formatos)
    const headerMap = {
      item_id: findHeaderIndex(headers, ['item_id', 'itemid', 'product_id', 'id']),
      shop_id: findHeaderIndex(headers, ['shop_id', 'shopid', 'seller_id', 'shop']),
      name: findHeaderIndex(headers, ['name', 'title', 'product_name', 'item_name']),
      price: findHeaderIndex(headers, ['price', 'current_price', 'sale_price']),
      original_price: findHeaderIndex(headers, ['original_price', 'list_price', 'regular_price']),
      image_url: findHeaderIndex(headers, ['image_url', 'image', 'picture_url', 'thumbnail']),
      product_url: findHeaderIndex(headers, ['product_url', 'url', 'link', 'product_link']),
      brand: findHeaderIndex(headers, ['brand', 'manufacturer']),
      category: findHeaderIndex(headers, ['category', 'category_name', 'cat_name']),
      description: findHeaderIndex(headers, ['description', 'desc', 'summary'])
    };

    console.log(`[Shopee CSV] Mapeamento de colunas:`, headerMap);

    // Processa cada linha (pula header)
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCsvLine(lines[i]);
        
        if (values.length < headers.length) {
          continue; // Pula linhas incompletas
        }

        const product: ShopeeCatalogProduct = {
          item_id: getValue(values, headerMap.item_id) || '',
          shop_id: getValue(values, headerMap.shop_id) || '',
          name: getValue(values, headerMap.name) || '',
          price: parseFloat(getValue(values, headerMap.price) || '0') || 0,
          original_price: parseFloat(getValue(values, headerMap.original_price) || '0') || undefined,
          image_url: getValue(values, headerMap.image_url) || '',
          product_url: getValue(values, headerMap.product_url) || '',
          brand: getValue(values, headerMap.brand) || undefined,
          category: getValue(values, headerMap.category) || undefined,
          description: getValue(values, headerMap.description) || undefined
        };

        // Validação mais rigorosa
        const isValidProduct = product.item_id && 
                              product.item_id.length > 5 && 
                              product.name && 
                              product.name.length > 3 && 
                              product.price > 0 &&
                              !product.name.includes('|') && // Remove produtos com nomes estranhos
                              !product.name.match(/^\d+$/) && // Remove produtos que são só números
                              product.name.length < 200; // Remove nomes muito longos

        if (isValidProduct) {
          products.push(product);
        } else if (i <= 10) { // Log apenas primeiras linhas para debug
          console.log(`[Shopee CSV] Produto inválido linha ${i}:`, {
            item_id: product.item_id,
            name: product.name?.substring(0, 50),
            price: product.price
          });
        }

      } catch (error) {
        // Ignora linhas com erro e continua
        continue;
      }
    }

    console.log(`[Shopee CSV] ✅ ${products.length} produtos válidos processados de ${lines.length - 1} linhas`);
    return products;

  } catch (error) {
    console.error('[Shopee CSV] Erro ao processar CSV:', error);
    return [];
  }
}

// Helper para encontrar índice do header
function findHeaderIndex(headers: string[], possibleNames: string[]): number {
  for (const name of possibleNames) {
    const index = headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
    if (index !== -1) return index;
  }
  return -1;
}

// Helper para obter valor do array
function getValue(values: string[], index: number): string | null {
  if (index === -1 || index >= values.length) return null;
  return values[index]?.trim().replace(/"/g, '') || null;
}

// Parser CSV simples que lida com aspas
function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current); // Adiciona último valor
  return values;
}

export { ShopeeProductResult };

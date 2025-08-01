
import crypto from 'crypto';
import axios from 'axios';

interface AliExpressProductResult {
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

// Configurações da AliExpress API
const ALI_APP_KEY = process.env.ALI_APP_KEY;
const ALI_APP_SECRET = process.env.ALI_APP_SECRET;
const ALI_TRACK_ID = 'organapp'; // Seu track ID para comissões
const ALI_API_GATEWAY = 'https://api-sg.aliexpress.com/sync';

// Função para gerar assinatura da AliExpress
function generateAliExpressSignature(params: Record<string, any>, secret: string): string {
  // Ordena os parâmetros alfabeticamente
  const sortedKeys = Object.keys(params).sort();
  
  // Cria string de parâmetros
  let paramString = '';
  for (const key of sortedKeys) {
    paramString += key + params[key];
  }
  
  // Adiciona secret no início e fim
  const stringToSign = secret + paramString + secret;
  
  // Gera hash MD5
  return crypto.createHash('md5').update(stringToSign, 'utf8').digest('hex').toUpperCase();
}

// Função para detectar URLs da AliExpress
export function isAliExpressUrl(url: string): boolean {
  const aliexpressDomains = [
    'aliexpress.com',
    'aliexpress.us', 
    'aliexpress.ru',
    'pt.aliexpress.com',
    'es.aliexpress.com',
    'fr.aliexpress.com'
  ];
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    return aliexpressDomains.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

// Função para extrair Product ID da URL da AliExpress
export function extractAliExpressProductId(url: string): string | null {
  try {
    // Padrões comuns de URLs da AliExpress
    const patterns = [
      /\/item\/(\d+)\.html/i,
      /\/(\d+)\.html/i,
      /product\/(\d+)/i,
      /item\/([0-9]+)/i,
      /\/dp\/([A-Z0-9]+)/i
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Tenta extrair da query string
    const urlObj = new URL(url);
    const productId = urlObj.searchParams.get('productId') || 
                     urlObj.searchParams.get('item_id') ||
                     urlObj.searchParams.get('id');
    
    if (productId) {
      return productId;
    }

    return null;
  } catch (error) {
    console.error('[AliExpress] Erro ao extrair Product ID:', error);
    return null;
  }
}

// Função para adicionar parâmetros de afiliado às URLs da AliExpress
export function addAliExpressAffiliateParams(url: string): string {
  if (!isAliExpressUrl(url)) {
    return url;
  }

  try {
    const urlObj = new URL(url);
    
    // Remove parâmetros de tracking existentes
    const trackingParams = ['aff_trace_key', 'aff_platform', 'aff_short_key', 'terminal_id'];
    trackingParams.forEach(param => urlObj.searchParams.delete(param));
    
    // Adiciona nossos parâmetros de afiliado
    urlObj.searchParams.set('aff_trace_key', ALI_TRACK_ID);
    urlObj.searchParams.set('aff_platform', 'link-c-tool');
    urlObj.searchParams.set('terminal_id', ALI_TRACK_ID);
    
    console.log(`[AliExpress] URL convertida para afiliado: ${url} → ${urlObj.toString()}`);
    return urlObj.toString();
  } catch (error) {
    console.error('[AliExpress] Erro ao adicionar parâmetros de afiliado:', error);
    return url;
  }
}

// Função para buscar produto por ID via API da AliExpress
export async function fetchAliExpressProduct(url: string): Promise<AliExpressProductResult | null> {
  if (!ALI_APP_KEY || !ALI_APP_SECRET) {
    console.log('[AliExpress API] Credenciais não configuradas');
    return null;
  }

  try {
    console.log(`[AliExpress API] Buscando produto: ${url}`);
    
    const productId = extractAliExpressProductId(url);
    if (!productId) {
      console.log('[AliExpress API] Product ID não encontrado na URL');
      return null;
    }

    const timestamp = Date.now().toString();
    
    // Parâmetros da requisição
    const params = {
      app_key: ALI_APP_KEY,
      method: 'aliexpress.affiliate.productdetail.get',
      format: 'json',
      v: '2.0',
      sign_method: 'md5',
      timestamp: timestamp,
      product_ids: productId,
      fields: 'product_id,product_title,product_url,current_price,original_price,product_main_image_url,product_small_image_urls,evaluate_score,commission_rate,sale_price,discount,shop_url,shop_id,platform_product_type,lastest_volume,original_price_range,sale_price_range',
      target_currency: 'BRL',
      target_language: 'PT',
      tracking_id: ALI_TRACK_ID
    };

    // Gera assinatura
    const signature = generateAliExpressSignature(params, ALI_APP_SECRET);
    params['sign'] = signature;

    console.log(`[AliExpress API] Fazendo requisição para produto ID: ${productId}`);
    
    const response = await axios.get(ALI_API_GATEWAY, {
      params,
      timeout: 15000,
      headers: {
        'User-Agent': 'OrganApp/1.0 (affiliate-integration)'
      }
    });

    if (!response.data || response.data.error_response) {
      console.error('[AliExpress API] Erro na resposta:', response.data?.error_response);
      return null;
    }

    const productData = response.data.aliexpress_affiliate_productdetail_get_response?.resp_result?.result?.products?.[0];
    
    if (!productData) {
      console.log('[AliExpress API] Produto não encontrado');
      return null;
    }

    // Extrai dados do produto
    const name = productData.product_title || 'Produto AliExpress';
    const price = productData.sale_price?.min_price || productData.current_price || null;
    const originalPrice = productData.original_price?.min_price || null;
    const imageUrl = productData.product_main_image_url || 
                    (productData.product_small_image_urls && productData.product_small_image_urls.split(',')[0]) || 
                    null;
    
    // Cria URL de afiliado
    const affiliateUrl = addAliExpressAffiliateParams(productData.product_url || url);

    const result: AliExpressProductResult = {
      name: name,
      price: price ? parseFloat(price.toString()) : null,
      originalPrice: originalPrice ? parseFloat(originalPrice.toString()) : null,
      imageUrl: imageUrl,
      store: 'AliExpress',
      description: `Produto AliExpress com ${productData.evaluate_score || 0} de avaliação`,
      category: productData.platform_product_type || 'Outros',
      brand: null,
      url: affiliateUrl
    };

    console.log(`[AliExpress API] ✅ Produto encontrado: ${result.name} - $${result.price}`);
    return result;

  } catch (error) {
    console.error('[AliExpress API] Erro ao buscar produto:', error.message);
    return null;
  }
}

// Função para buscar produtos por termo de pesquisa
export async function searchAliExpressProducts(searchTerm: string, maxResults: number = 5): Promise<AliExpressProductResult[]> {
  if (!ALI_APP_KEY || !ALI_APP_SECRET) {
    console.log('[AliExpress Search] Credenciais não configuradas');
    return [];
  }

  try {
    console.log(`[AliExpress Search] Buscando: ${searchTerm}`);
    
    const timestamp = Date.now().toString();
    
    const params = {
      app_key: ALI_APP_KEY,
      method: 'aliexpress.affiliate.product.query',
      format: 'json',
      v: '2.0',
      sign_method: 'md5',
      timestamp: timestamp,
      keywords: searchTerm,
      fields: 'product_id,product_title,product_url,current_price,original_price,product_main_image_url,evaluate_score,commission_rate,sale_price,discount,shop_url,platform_product_type',
      target_currency: 'BRL',
      target_language: 'PT',
      tracking_id: ALI_TRACK_ID,
      page_size: maxResults.toString(),
      page_no: '1',
      sort: 'SALE_PRICE_ASC'
    };

    const signature = generateAliExpressSignature(params, ALI_APP_SECRET);
    params['sign'] = signature;

    const response = await axios.get(ALI_API_GATEWAY, {
      params,
      timeout: 15000
    });

    if (!response.data || response.data.error_response) {
      console.error('[AliExpress Search] Erro na resposta:', response.data?.error_response);
      return [];
    }

    const products = response.data.aliexpress_affiliate_product_query_response?.resp_result?.result?.products || [];
    
    if (products.length === 0) {
      console.log('[AliExpress Search] Nenhum produto encontrado');
      return [];
    }

    const results: AliExpressProductResult[] = [];

    for (const product of products.slice(0, maxResults)) {
      const price = product.sale_price?.min_price || product.current_price;
      const originalPrice = product.original_price?.min_price;

      if (price && parseFloat(price) > 0) {
        const affiliateUrl = addAliExpressAffiliateParams(product.product_url);
        
        results.push({
          name: product.product_title || 'Produto AliExpress',
          price: parseFloat(price),
          originalPrice: originalPrice ? parseFloat(originalPrice) : null,
          imageUrl: product.product_main_image_url || null,
          store: 'AliExpress',
          description: `Avaliação: ${product.evaluate_score || 0}/5`,
          category: product.platform_product_type || 'Outros',
          brand: null,
          url: affiliateUrl
        });
      }
    }

    console.log(`[AliExpress Search] ${results.length} produtos encontrados`);
    return results;

  } catch (error) {
    console.error('[AliExpress Search] Erro na busca:', error.message);
    return [];
  }
}

export { AliExpressProductResult };

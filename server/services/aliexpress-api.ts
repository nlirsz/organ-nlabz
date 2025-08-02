
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
    console.log(`[AliExpress] Extraindo Product ID de: ${url}`);
    
    // Padrões mais específicos para AliExpress
    const patterns = [
      /\/item\/(\d+)\.html/i,
      /\/(\d+)\.html/i,
      /item\/(\d+)/i,
      /product\/(\d+)/i,
      /productId[=:](\d+)/i,
      /item_id[=:](\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        console.log(`[AliExpress] Product ID encontrado: ${match[1]} usando padrão: ${pattern}`);
        return match[1];
      }
    }

    // Tenta extrair da query string e pathname
    try {
      const urlObj = new URL(url);
      
      // Verifica query parameters
      const productId = urlObj.searchParams.get('productId') || 
                       urlObj.searchParams.get('item_id') ||
                       urlObj.searchParams.get('id');
      
      if (productId) {
        console.log(`[AliExpress] Product ID encontrado nos params: ${productId}`);
        return productId;
      }

      // Extrai do pathname se for formato /item/123456789.html
      const pathMatch = urlObj.pathname.match(/\/item\/(\d+)/i);
      if (pathMatch && pathMatch[1]) {
        console.log(`[AliExpress] Product ID encontrado no path: ${pathMatch[1]}`);
        return pathMatch[1];
      }

    } catch (urlError) {
      console.warn(`[AliExpress] Erro ao parsear URL: ${urlError.message}`);
    }

    console.warn(`[AliExpress] ❌ Product ID não encontrado na URL: ${url}`);
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
    console.log('[AliExpress API] ❌ Credenciais não configuradas. Verifique ALI_APP_KEY e ALI_APP_SECRET.');
    return null;
  }

  try {
    console.log(`[AliExpress API] 🛒 Buscando produto: ${url}`);
    
    const productId = extractAliExpressProductId(url);
    if (!productId) {
      console.log('[AliExpress API] ❌ Product ID não encontrado na URL');
      return null;
    }

    console.log(`[AliExpress API] 📦 Product ID extraído: ${productId}`);

    const timestamp = Date.now().toString();
    
    // Parâmetros da requisição com configurações mais básicas primeiro
    const params = {
      app_key: ALI_APP_KEY,
      method: 'aliexpress.affiliate.product.query', // Método mais simples primeiro
      format: 'json',
      v: '2.0',
      sign_method: 'md5',
      timestamp: timestamp,
      keywords: productId, // Busca por ID como keyword
      fields: 'product_id,product_title,product_url,current_price,original_price,product_main_image_url,evaluate_score,sale_price',
      target_currency: 'BRL',
      target_language: 'PT',
      tracking_id: ALI_TRACK_ID,
      page_size: '1',
      page_no: '1'
    };

    // Gera assinatura
    const signature = generateAliExpressSignature(params, ALI_APP_SECRET);
    params['sign'] = signature;

    console.log(`[AliExpress API] 🌐 Fazendo requisição para produto ID: ${productId}`);
    console.log(`[AliExpress API] 🔑 App Key: ${ALI_APP_KEY?.substring(0, 10)}...`);
    console.log(`[AliExpress API] 📊 Params:`, {
      method: params.method,
      keywords: params.keywords,
      timestamp: params.timestamp
    });
    
    // Primeira tentativa com busca por ID
    let response = await axios.get(ALI_API_GATEWAY, {
      params,
      timeout: 20000,
      headers: {
        'User-Agent': 'OrganApp/1.0 (affiliate-integration)',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    console.log(`[AliExpress API] 📡 Response status: ${response.status}`);
    console.log(`[AliExpress API] 📄 Response data keys:`, Object.keys(response.data || {}));

    // Se não encontrou por ID, tenta busca alternativa por URL
    if (!response.data || response.data.error_response || 
        !response.data.aliexpress_affiliate_product_query_response?.resp_result?.result?.products?.length) {
      
      console.log(`[AliExpress API] 🔄 Primeira busca não retornou resultados, tentando busca alternativa...`);
      
      // Extrai termos da URL para busca alternativa
      const urlPath = new URL(url).pathname;
      const urlSegments = urlPath.split('/').filter(s => s.length > 3);
      const searchTerms = urlSegments
        .filter(s => !s.match(/^\d+$/)) // Remove números puros
        .join(' ')
        .replace(/[-_]/g, ' ')
        .trim();

      if (searchTerms.length > 5) {
        console.log(`[AliExpress API] 🔍 Tentando busca por termos extraídos da URL: "${searchTerms}"`);
        
        const altParams = {
          ...params,
          keywords: searchTerms.substring(0, 50), // Limita tamanho
          page_size: '5' // Menos resultados para ser mais específico
        };

        // Regenera assinatura para novos parâmetros
        delete altParams['sign'];
        const altSignature = generateAliExpressSignature(altParams, ALI_APP_SECRET);
        altParams['sign'] = altSignature;

        try {
          response = await axios.get(ALI_API_GATEWAY, {
            params: altParams,
            timeout: 20000,
            headers: {
              'User-Agent': 'OrganApp/1.0 (affiliate-integration)',
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });
          
          console.log(`[AliExpress API] 🔍 Busca alternativa - Status: ${response.status}`);
        } catch (altError) {
          console.warn(`[AliExpress API] ⚠️ Busca alternativa falhou:`, altError.message);
          // Continua com a resposta original
        }
      }
    }

    console.log(`[AliExpress API] 📡 Response status: ${response.status}`);
    console.log(`[AliExpress API] 📄 Response data keys:`, Object.keys(response.data || {}));

    if (!response.data) {
      console.error('[AliExpress API] ❌ Resposta vazia');
      return null;
    }

    if (response.data.error_response) {
      console.error('[AliExpress API] ❌ Erro na API:', response.data.error_response);
      return null;
    }

    // Tenta diferentes formatos de resposta
    let productData = null;
    let products = [];

    // Formato para product.query
    if (response.data.aliexpress_affiliate_product_query_response) {
      products = response.data.aliexpress_affiliate_product_query_response?.resp_result?.result?.products || [];
      productData = products[0];
      console.log(`[AliExpress API] 📦 Produtos encontrados via query: ${products.length}`);
    }
    
    // Formato para productdetail.get  
    else if (response.data.aliexpress_affiliate_productdetail_get_response) {
      products = response.data.aliexpress_affiliate_productdetail_get_response?.resp_result?.result?.products || [];
      productData = products[0];
      console.log(`[AliExpress API] 📦 Produtos encontrados via detail: ${products.length}`);
    }
    
    if (!productData) {
      console.log('[AliExpress API] ❌ Produto não encontrado na resposta');
      console.log('[AliExpress API] 🔍 Tentando método alternativo...');
      
      // Tenta método alternativo - productdetail.get
      return await fetchAliExpressProductDetail(productId, url);
    }

    // Extrai dados do produto
    const name = productData.product_title || 'Produto AliExpress';
    const price = productData.sale_price?.min_price || 
                  productData.sale_price || 
                  productData.current_price || 
                  null;
    const originalPrice = productData.original_price?.min_price || 
                         productData.original_price || 
                         null;
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
    if (error.response) {
      console.error('[AliExpress API] Status:', error.response.status);
      console.error('[AliExpress API] Data:', error.response.data);
    }
    return null;
  }
}

// Método alternativo para buscar detalhes do produto
async function fetchAliExpressProductDetail(productId: string, originalUrl: string): Promise<AliExpressProductResult | null> {
  try {
    console.log(`[AliExpress API] 🔄 Tentando método productdetail.get para ID: ${productId}`);
    
    const timestamp = Date.now().toString();
    
    const params = {
      app_key: ALI_APP_KEY,
      method: 'aliexpress.affiliate.productdetail.get',
      format: 'json',
      v: '2.0',
      sign_method: 'md5',
      timestamp: timestamp,
      product_ids: productId,
      fields: 'product_id,product_title,product_url,current_price,original_price,product_main_image_url,evaluate_score,sale_price',
      target_currency: 'BRL',
      target_language: 'PT',
      tracking_id: ALI_TRACK_ID
    };

    const signature = generateAliExpressSignature(params, ALI_APP_SECRET);
    params['sign'] = signature;

    const response = await axios.get(ALI_API_GATEWAY, {
      params,
      timeout: 20000,
      headers: {
        'User-Agent': 'OrganApp/1.0 (affiliate-integration)',
        'Accept': 'application/json'
      }
    });

    if (!response.data || response.data.error_response) {
      console.error('[AliExpress API Detail] ❌ Erro:', response.data?.error_response);
      return null;
    }

    const productData = response.data.aliexpress_affiliate_productdetail_get_response?.resp_result?.result?.products?.[0];
    
    if (!productData) {
      console.log('[AliExpress API Detail] ❌ Produto não encontrado no método detail');
      return null;
    }

    const result: AliExpressProductResult = {
      name: productData.product_title || 'Produto AliExpress',
      price: productData.sale_price?.min_price || productData.current_price ? parseFloat((productData.sale_price?.min_price || productData.current_price).toString()) : null,
      originalPrice: productData.original_price?.min_price ? parseFloat(productData.original_price.min_price.toString()) : null,
      imageUrl: productData.product_main_image_url || null,
      store: 'AliExpress',
      description: `Produto AliExpress com ${productData.evaluate_score || 0} de avaliação`,
      category: 'Outros',
      brand: null,
      url: addAliExpressAffiliateParams(productData.product_url || originalUrl)
    };

    console.log(`[AliExpress API Detail] ✅ Produto encontrado via detail: ${result.name}`);
    return result;

  } catch (error) {
    console.error('[AliExpress API Detail] Erro:', error.message);
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

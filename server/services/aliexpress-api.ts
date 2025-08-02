
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

// Função para gerar assinatura da AliExpress seguindo documentação oficial
function generateAliExpressSignature(params: Record<string, any>, secret: string): string {
  // Remove o parâmetro 'sign' se existir
  const filteredParams = { ...params };
  delete filteredParams.sign;
  
  // Ordena os parâmetros alfabeticamente
  const sortedKeys = Object.keys(filteredParams).sort();
  
  // Cria string de parâmetros no formato key+value
  let paramString = '';
  for (const key of sortedKeys) {
    if (filteredParams[key] !== undefined && filteredParams[key] !== null) {
      paramString += key + filteredParams[key];
    }
  }
  
  // Adiciona secret no início e fim conforme documentação
  const stringToSign = secret + paramString + secret;
  
  // Gera hash MD5 em uppercase
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
      console.warn(`[AliExpress] Erro ao parsear URL:`, urlError);
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

// Função para obter token de autenticação (conforme documentação)
async function getAliExpressToken(): Promise<string | null> {
  if (!ALI_APP_KEY || !ALI_APP_SECRET) {
    console.error('[AliExpress Auth] Credenciais não configuradas');
    return null;
  }

  try {
    const timestamp = Date.now().toString();
    
    const params = {
      app_key: ALI_APP_KEY,
      method: 'auth.token.security.create',
      format: 'json',
      v: '2.0',
      sign_method: 'md5',
      timestamp: timestamp
    };

    const signature = generateAliExpressSignature(params, ALI_APP_SECRET);
    (params as any)['sign'] = signature;

    console.log('[AliExpress Auth] Obtendo token de autenticação...');
    
    const response = await axios.get(ALI_API_GATEWAY, {
      params,
      timeout: 10000,
      headers: {
        'User-Agent': 'OrganApp/1.0 (affiliate-integration)',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (response.data && response.data.auth_token_security_create_response) {
      const token = response.data.auth_token_security_create_response.access_token;
      console.log('[AliExpress Auth] ✅ Token obtido com sucesso');
      return token;
    }

    console.error('[AliExpress Auth] ❌ Erro ao obter token:', response.data);
    return null;

  } catch (error) {
    console.error('[AliExpress Auth] Erro na requisição de token:', error);
    return null;
  }
}

// Função para buscar produto por ID via API da AliExpress (usando documentação oficial)
export async function fetchAliExpressProduct(url: string): Promise<AliExpressProductResult | null> {
  console.log('[AliExpress API] 🔑 Verificando credenciais...');
  console.log('[AliExpress API] ALI_APP_KEY disponível:', !!ALI_APP_KEY);
  console.log('[AliExpress API] ALI_APP_SECRET disponível:', !!ALI_APP_SECRET);
  console.log('[AliExpress API] ALI_APP_KEY length:', ALI_APP_KEY?.length || 0);
  console.log('[AliExpress API] ALI_APP_SECRET length:', ALI_APP_SECRET?.length || 0);
  
  if (!ALI_APP_KEY || !ALI_APP_SECRET) {
    console.log('[AliExpress API] ❌ Credenciais não configuradas. Verifique ALI_APP_KEY e ALI_APP_SECRET nos Secrets.');
    console.log('[AliExpress API] process.env keys:', Object.keys(process.env).filter(k => k.includes('ALI')));
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

    // Tenta buscar detalhes do produto usando o método correto da documentação
    const productDetails = await fetchProductDetails(productId);
    if (productDetails) {
      // Converte para URL de afiliado
      const affiliateUrl = addAliExpressAffiliateParams(url);
      
      return {
        ...productDetails,
        url: affiliateUrl
      };
    }

    // Se falhar, tenta busca por termos extraídos da URL
    console.log('[AliExpress API] 🔄 Tentando busca alternativa por termos...');
    return await searchProductByUrlTerms(url);

  } catch (error) {
    console.error('[AliExpress API] Erro ao buscar produto:', error);
    return null;
  }
}

// Função para buscar detalhes do produto usando método da documentação
async function fetchProductDetails(productId: string): Promise<AliExpressProductResult | null> {
  try {
    const timestamp = Date.now().toString();
    
    // Usando método correto conforme documentação
    const params = {
      app_key: ALI_APP_KEY,
      method: 'aliexpress.affiliate.productdetail.get',
      format: 'json',
      v: '2.0',
      sign_method: 'md5',
      timestamp: timestamp,
      product_ids: productId,
      fields: 'product_id,product_title,product_url,current_price,original_price,product_main_image_url,evaluate_score,sale_price,discount,shop_url,platform_product_type',
      target_currency: 'BRL',
      target_language: 'PT',
      tracking_id: ALI_TRACK_ID
    };

    if (!ALI_APP_SECRET) {
      console.error('[AliExpress API] ALI_APP_SECRET não configurado');
      return null;
    }
    const signature = generateAliExpressSignature(params, ALI_APP_SECRET);
    (params as any)['sign'] = signature;

    console.log(`[AliExpress API] 🌐 Buscando detalhes do produto ID: ${productId}`);
    
    const response = await axios.get(ALI_API_GATEWAY, {
      params,
      timeout: 15000,
      headers: {
        'User-Agent': 'OrganApp/1.0 (affiliate-integration)',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    console.log(`[AliExpress API] 📡 Response status: ${response.status}`);

    if (!response.data) {
      console.error('[AliExpress API] ❌ Resposta vazia');
      return null;
    }

    if (response.data.error_response) {
      console.error('[AliExpress API] ❌ Erro na API:', response.data.error_response);
      return null;
    }

    console.log('[AliExpress API] 🔍 Estrutura da resposta:', JSON.stringify(response.data, null, 2));

    // Processa resposta do método productdetail.get
    const detailResponse = response.data.aliexpress_affiliate_productdetail_get_response;
    if (!detailResponse) {
      console.log('[AliExpress API] ❌ Resposta não contém aliexpress_affiliate_productdetail_get_response');
      console.log('[AliExpress API] 🔍 Chaves disponíveis:', Object.keys(response.data));
      return null;
    }

    if (!detailResponse.resp_result) {
      console.log('[AliExpress API] ❌ Resposta não contém resp_result');
      console.log('[AliExpress API] 🔍 Estrutura detailResponse:', JSON.stringify(detailResponse, null, 2));
      return null;
    }

    const result = detailResponse.resp_result.result;
    if (!result) {
      console.log('[AliExpress API] ❌ Resposta não contém result');
      console.log('[AliExpress API] 🔍 resp_result:', JSON.stringify(detailResponse.resp_result, null, 2));
      return null;
    }

    const products = result.products;
    if (!products || !Array.isArray(products) || products.length === 0) {
      console.log('[AliExpress API] ❌ Produto não encontrado ou array vazio');
      console.log('[AliExpress API] 🔍 products:', products);
      return null;
    }

    const productData = products[0];
    console.log(`[AliExpress API] 📦 Produto encontrado: ${productData.product_title}`);

    // Extrai dados do produto
    const salePrice = productData.sale_price;
    const currentPrice = productData.current_price;
    const originalPrice = productData.original_price;

    // Determina preço final
    let finalPrice = null;
    let finalOriginalPrice = null;

    if (salePrice) {
      if (typeof salePrice === 'object' && salePrice.min_price) {
        finalPrice = parseFloat(salePrice.min_price);
      } else if (typeof salePrice === 'string' || typeof salePrice === 'number') {
        finalPrice = parseFloat(salePrice.toString());
      }
    } else if (currentPrice) {
      finalPrice = parseFloat(currentPrice.toString());
    }

    if (originalPrice) {
      if (typeof originalPrice === 'object' && originalPrice.min_price) {
        finalOriginalPrice = parseFloat(originalPrice.min_price);
      } else if (typeof originalPrice === 'string' || typeof originalPrice === 'number') {
        finalOriginalPrice = parseFloat(originalPrice.toString());
      }
    }

    const productResult: AliExpressProductResult = {
      name: productData.product_title || 'Produto AliExpress',
      price: finalPrice,
      originalPrice: finalOriginalPrice,
      imageUrl: productData.product_main_image_url || null,
      store: 'AliExpress',
      description: `Produto AliExpress com avaliação ${productData.evaluate_score || 0}/5`,
      category: productData.platform_product_type || 'Outros',
      brand: null,
      url: productData.product_url || ''
    };

    console.log(`[AliExpress API] ✅ Produto processado: ${productResult.name} - R$${productResult.price}`);
    return productResult;

  } catch (error: any) {
    console.error('[AliExpress API] Erro ao buscar detalhes:', error);
    if (error.response) {
      console.error('[AliExpress API] Status:', error.response.status);
      console.error('[AliExpress API] Data:', error.response.data);
    }
    return null;
  }
}

// Função para buscar produto por termos extraídos da URL
async function searchProductByUrlTerms(url: string): Promise<AliExpressProductResult | null> {
  try {
    // Extrai termos da URL para busca
    const urlPath = new URL(url).pathname;
    const urlSegments = urlPath.split('/').filter(s => s.length > 3);
    const searchTerms = urlSegments
      .filter(s => !s.match(/^\d+$/)) // Remove números puros
      .join(' ')
      .replace(/[-_]/g, ' ')
      .trim();

    if (searchTerms.length < 5) {
      console.log('[AliExpress API] ❌ Termos de busca insuficientes extraídos da URL');
      return null;
    }

    console.log(`[AliExpress API] 🔍 Buscando por termos: "${searchTerms}"`);

    const results = await searchAliExpressProducts(searchTerms, 1);
    if (results.length > 0) {
      console.log(`[AliExpress API] ✅ Produto encontrado via busca por termos`);
      return results[0];
    }

    return null;
  } catch (error) {
    console.error('[AliExpress API] Erro na busca por termos:', error);
    return null;
  }
}

// Função para buscar produtos por termo de pesquisa usando método correto da documentação
export async function searchAliExpressProducts(searchTerm: string, maxResults: number = 5): Promise<AliExpressProductResult[]> {
  if (!ALI_APP_KEY || !ALI_APP_SECRET) {
    console.log('[AliExpress Search] Credenciais não configuradas');
    return [];
  }

  try {
    console.log(`[AliExpress Search] 🔍 Buscando: ${searchTerm}`);
    
    const timestamp = Date.now().toString();
    
    // Usando método correto da documentação
    const params = {
      app_key: ALI_APP_KEY,
      method: 'aliexpress.affiliate.product.query',
      format: 'json',
      v: '2.0',
      sign_method: 'md5',
      timestamp: timestamp,
      keywords: searchTerm.substring(0, 256), // Limita tamanho conforme documentação
      fields: 'product_id,product_title,product_url,current_price,original_price,product_main_image_url,evaluate_score,commission_rate,sale_price,discount,shop_url,platform_product_type',
      target_currency: 'BRL',
      target_language: 'PT',
      tracking_id: ALI_TRACK_ID,
      page_size: Math.min(maxResults, 50).toString(), // Máximo 50 conforme documentação
      page_no: '1',
      sort: 'SALE_PRICE_ASC'
    };

    const signature = generateAliExpressSignature(params, ALI_APP_SECRET);
    (params as any)['sign'] = signature;

    const response = await axios.get(ALI_API_GATEWAY, {
      params,
      timeout: 15000,
      headers: {
        'User-Agent': 'OrganApp/1.0 (affiliate-integration)',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.data) {
      console.error('[AliExpress Search] ❌ Resposta vazia');
      return [];
    }

    if (response.data.error_response) {
      console.error('[AliExpress Search] ❌ Erro na API:', response.data.error_response);
      return [];
    }

    console.log('[AliExpress Search] 🔍 Estrutura da resposta:', JSON.stringify(response.data, null, 2));

    const queryResponse = response.data.aliexpress_affiliate_product_query_response;
    if (!queryResponse) {
      console.log('[AliExpress Search] ❌ Resposta não contém aliexpress_affiliate_product_query_response');
      console.log('[AliExpress Search] 🔍 Chaves disponíveis:', Object.keys(response.data));
      return [];
    }

    if (!queryResponse.resp_result) {
      console.log('[AliExpress Search] ❌ Resposta não contém resp_result');
      console.log('[AliExpress Search] 🔍 Estrutura queryResponse:', JSON.stringify(queryResponse, null, 2));
      return [];
    }

    const result = queryResponse.resp_result.result;
    if (!result) {
      console.log('[AliExpress Search] ❌ Resposta não contém result');
      console.log('[AliExpress Search] 🔍 resp_result:', JSON.stringify(queryResponse.resp_result, null, 2));
      return [];
    }

    const products = result.products || [];
    
    if (!Array.isArray(products) || products.length === 0) {
      console.log('[AliExpress Search] ❌ Nenhum produto encontrado ou não é array');
      console.log('[AliExpress Search] 🔍 products:', products);
      return [];
    }

    console.log(`[AliExpress Search] 📦 ${products.length} produtos encontrados`);

    const results: AliExpressProductResult[] = [];

    for (const product of products.slice(0, maxResults)) {
      try {
        // Extrai preços
        const salePrice = product.sale_price;
        const currentPrice = product.current_price;
        const originalPrice = product.original_price;

        let finalPrice = null;
        let finalOriginalPrice = null;

        if (salePrice) {
          if (typeof salePrice === 'object' && salePrice.min_price) {
            finalPrice = parseFloat(salePrice.min_price);
          } else if (typeof salePrice === 'string' || typeof salePrice === 'number') {
            finalPrice = parseFloat(salePrice.toString());
          }
        } else if (currentPrice) {
          finalPrice = parseFloat(currentPrice.toString());
        }

        if (originalPrice) {
          if (typeof originalPrice === 'object' && originalPrice.min_price) {
            finalOriginalPrice = parseFloat(originalPrice.min_price);
          } else if (typeof originalPrice === 'string' || typeof originalPrice === 'number') {
            finalOriginalPrice = parseFloat(originalPrice.toString());
          }
        }

        // Só inclui produtos com preço válido
        if (finalPrice && finalPrice > 0) {
          const affiliateUrl = addAliExpressAffiliateParams(product.product_url || '');
          
          results.push({
            name: product.product_title || 'Produto AliExpress',
            price: finalPrice,
            originalPrice: finalOriginalPrice,
            imageUrl: product.product_main_image_url || null,
            store: 'AliExpress',
            description: `Avaliação: ${product.evaluate_score || 0}/5 - Comissão: ${product.commission_rate || 0}%`,
            category: product.platform_product_type || 'Outros',
            brand: null,
            url: affiliateUrl
          });
        }
      } catch (productError) {
        console.warn('[AliExpress Search] Erro ao processar produto:', productError);
        continue;
      }
    }

    console.log(`[AliExpress Search] ✅ ${results.length} produtos processados com sucesso`);
    return results;

  } catch (error: any) {
    console.error('[AliExpress Search] Erro na busca:', error);
    if (error.response) {
      console.error('[AliExpress Search] Status:', error.response.status);
      console.error('[AliExpress Search] Data:', error.response.data);
    }
    return [];
  }
}

export { AliExpressProductResult };

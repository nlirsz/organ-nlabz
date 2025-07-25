
import crypto from 'crypto';
import axios from 'axios';

interface AmazonProductResult {
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

// Configurações da Amazon API - adicione suas credenciais no arquivo .env
const AMAZON_ACCESS_KEY = process.env.AMAZON_ACCESS_KEY;
const AMAZON_SECRET_KEY = process.env.AMAZON_SECRET_KEY;
const AMAZON_PARTNER_TAG = process.env.AMAZON_PARTNER_TAG;
const AMAZON_HOST = 'webservices.amazon.com.br'; // Para o Brasil
const AMAZON_REGION = 'us-east-1'; // Região padrão da API
const AMAZON_SERVICE = 'ProductAdvertisingAPI';

// Função para gerar assinatura AWS4
function createSignature(method: string, uri: string, queryParams: string, headers: any, payload: string, timestamp: string): string {
  const dateStamp = timestamp.substring(0, 8);
  
  // Criar canonical request
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map(key => `${key.toLowerCase()}:${headers[key]}`)
    .join('\n') + '\n';
    
  const signedHeaders = Object.keys(headers)
    .sort()
    .map(key => key.toLowerCase())
    .join(';');
    
  const payloadHash = crypto.createHash('sha256').update(payload).digest('hex');
  
  const canonicalRequest = [
    method,
    uri,
    queryParams,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');
  
  // Criar string to sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${AMAZON_REGION}/${AMAZON_SERVICE}/aws4_request`;
  const stringToSign = [
    algorithm,
    timestamp,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  ].join('\n');
  
  // Calcular assinatura
  const kDate = crypto.createHmac('sha256', `AWS4${AMAZON_SECRET_KEY}`).update(dateStamp).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(AMAZON_REGION).digest();
  const kService = crypto.createHmac('sha256', kRegion).update(AMAZON_SERVICE).digest();
  const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
  
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
  
  return `${algorithm} Credential=${AMAZON_ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

// Extrai ASIN da URL da Amazon
function extractASINFromUrl(url: string): string | null {
  try {
    const patterns = [
      /\/dp\/([A-Z0-9]{10})/i,
      /\/gp\/product\/([A-Z0-9]{10})/i,
      /\/product\/([A-Z0-9]{10})/i,
      /asin=([A-Z0-9]{10})/i,
      /\/([A-Z0-9]{10})(?:[/?]|$)/i
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        console.log(`[Amazon API] ASIN extraído: ${match[1]}`);
        return match[1];
      }
    }

    console.log(`[Amazon API] ASIN não encontrado na URL: ${url}`);
    return null;
  } catch (error) {
    console.error('[Amazon API] Erro ao extrair ASIN:', error);
    return null;
  }
}

// Busca produto na Amazon por ASIN
export async function fetchAmazonProduct(url: string): Promise<AmazonProductResult | null> {
  const asin = extractASINFromUrl(url);
  if (!asin) {
    console.log('[Amazon API] ASIN não encontrado na URL');
    return null;
  }

  // Se não temos credenciais da API, mas temos partner tag, retorna informações básicas com o link afiliado
  if (!AMAZON_ACCESS_KEY || !AMAZON_SECRET_KEY) {
    if (!AMAZON_PARTNER_TAG) {
      console.log('[Amazon API] Partner tag não configurado');
      return null;
    }

    console.log(`[Amazon API] Sem credenciais da API, criando produto básico com partner tag: ${AMAZON_PARTNER_TAG}`);
    
    return {
      name: 'Produto Amazon',
      price: null,
      originalPrice: null,
      imageUrl: null,
      store: 'Amazon Brasil',
      description: 'Produto da Amazon - adicione as informações manualmente. Link já contém seu código de afiliado.',
      category: 'Outros',
      brand: null,
      url: `https://www.amazon.com.br/dp/${asin}?tag=${AMAZON_PARTNER_TAG}`
    };
  }

  try {
    console.log(`[Amazon API] Buscando produto ASIN: ${asin}`);

    const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const payload = JSON.stringify({
      ItemIds: [asin],
      Resources: [
        'Images.Primary.Large',
        'ItemInfo.Title',
        'ItemInfo.Features',
        'ItemInfo.ByLineInfo',
        'ItemInfo.ProductInfo',
        'ItemInfo.Classifications',
        'Offers.Listings.Price',
        'Offers.Listings.SavingsPercentage'
      ],
      PartnerTag: AMAZON_PARTNER_TAG,
      PartnerType: 'Associates',
      Marketplace: 'www.amazon.com.br'
    });

    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Host': AMAZON_HOST,
      'X-Amz-Date': timestamp,
      'X-Amz-Target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems'
    };

    const signature = createSignature('POST', '/paapi5/getitems', '', headers, payload, timestamp);
    headers['Authorization'] = signature;

    const response = await axios.post(`https://${AMAZON_HOST}/paapi5/getitems`, payload, {
      headers,
      timeout: 15000
    });

    if (!response.data || !response.data.ItemsResult || !response.data.ItemsResult.Items) {
      console.log('[Amazon API] Nenhum item encontrado');
      return null;
    }

    const item = response.data.ItemsResult.Items[0];
    
    // Extrai informações do produto
    const name = item.ItemInfo?.Title?.DisplayValue || 'Produto Amazon';
    
    let price: number | null = null;
    let originalPrice: number | null = null;
    
    if (item.Offers?.Listings && item.Offers.Listings.length > 0) {
      const listing = item.Offers.Listings[0];
      if (listing.Price?.Amount) {
        price = listing.Price.Amount;
      }
      if (listing.SavingsPercentage && price) {
        const savingsPercent = listing.SavingsPercentage / 100;
        originalPrice = price / (1 - savingsPercent);
      }
    }

    const imageUrl = item.Images?.Primary?.Large?.URL || null;
    
    const brand = item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue || null;
    
    const category = item.ItemInfo?.Classifications?.ProductGroup?.DisplayValue || 'Outros';
    
    const features = item.ItemInfo?.Features?.DisplayValues || [];
    const description = features.length > 0 ? features.slice(0, 3).join('. ') : null;

    const result: AmazonProductResult = {
      name,
      price,
      originalPrice,
      imageUrl,
      store: 'Amazon Brasil',
      description,
      category,
      brand,
      url: `https://www.amazon.com.br/dp/${asin}?tag=${AMAZON_PARTNER_TAG}`
    };

    console.log(`[Amazon API] ✅ Produto encontrado: ${name} - R$ ${price}`);
    return result;

  } catch (error) {
    console.error('[Amazon API] Erro ao buscar produto:', error.message);
    
    // Se a API falhar, retorna informações básicas da URL
    return {
      name: 'Produto Amazon',
      price: null,
      originalPrice: null,
      imageUrl: null,
      store: 'Amazon Brasil',
      description: 'Produto da Amazon - informações precisam ser adicionadas manualmente',
      category: 'Outros',
      brand: null,
      url: url
    };
  }
}

// Busca produtos da Amazon por termo
export async function searchAmazonProducts(searchTerm: string, maxResults: number = 5): Promise<AmazonProductResult[]> {
  if (!AMAZON_ACCESS_KEY || !AMAZON_SECRET_KEY || !AMAZON_PARTNER_TAG) {
    console.log('[Amazon Search] Credenciais da API não configuradas');
    return [];
  }

  try {
    console.log(`[Amazon Search] Buscando: ${searchTerm}`);

    const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const payload = JSON.stringify({
      Keywords: searchTerm,
      Resources: [
        'Images.Primary.Medium',
        'ItemInfo.Title',
        'ItemInfo.ByLineInfo',
        'ItemInfo.Classifications',
        'Offers.Listings.Price'
      ],
      PartnerTag: AMAZON_PARTNER_TAG,
      PartnerType: 'Associates',
      Marketplace: 'www.amazon.com.br',
      ItemCount: Math.min(maxResults, 10)
    });

    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Host': AMAZON_HOST,
      'X-Amz-Date': timestamp,
      'X-Amz-Target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems'
    };

    const signature = createSignature('POST', '/paapi5/searchitems', '', headers, payload, timestamp);
    headers['Authorization'] = signature;

    const response = await axios.post(`https://${AMAZON_HOST}/paapi5/searchitems`, payload, {
      headers,
      timeout: 15000
    });

    if (!response.data || !response.data.SearchResult || !response.data.SearchResult.Items) {
      console.log('[Amazon Search] Nenhum resultado encontrado');
      return [];
    }

    const results: AmazonProductResult[] = [];

    for (const item of response.data.SearchResult.Items.slice(0, maxResults)) {
      const name = item.ItemInfo?.Title?.DisplayValue || 'Produto Amazon';
      
      let price: number | null = null;
      if (item.Offers?.Listings && item.Offers.Listings.length > 0) {
        const listing = item.Offers.Listings[0];
        if (listing.Price?.Amount) {
          price = listing.Price.Amount;
        }
      }

      const imageUrl = item.Images?.Primary?.Medium?.URL || null;
      const brand = item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue || null;
      const category = item.ItemInfo?.Classifications?.ProductGroup?.DisplayValue || 'Outros';

      if (price && price > 0) {
        results.push({
          name,
          price,
          originalPrice: null,
          imageUrl,
          store: 'Amazon Brasil',
          description: null,
          category,
          brand,
          url: `https://www.amazon.com.br/dp/${item.ASIN}?tag=${AMAZON_PARTNER_TAG}`
        });
      }
    }

    console.log(`[Amazon Search] ${results.length} produtos encontrados`);
    return results;

  } catch (error) {
    console.error('[Amazon Search] Erro na busca:', error.message);
    return [];
  }
}

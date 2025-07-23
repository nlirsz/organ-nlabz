
interface APIProductResult {
  name: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  store: string;
  description?: string;
  category?: string;
  brand?: string;
  url: string;
}

// Mercado Livre API (gratuita)
async function fetchFromMercadoLivreAPI(productId: string): Promise<APIProductResult | null> {
  try {
    const response = await fetch(`https://api.mercadolibre.com/items/${productId}`);
    if (!response.ok) return null;
    
    const data = await response.json();
    
    return {
      name: data.title,
      price: data.price,
      originalPrice: data.original_price,
      imageUrl: data.pictures?.[0]?.secure_url || data.thumbnail,
      store: 'Mercado Livre',
      description: data.descriptions?.[0]?.plain_text,
      category: data.category_id,
      brand: data.attributes?.find((attr: any) => attr.id === 'BRAND')?.value_name,
      url: data.permalink
    };
  } catch (error) {
    console.error('Erro ao buscar no Mercado Livre API:', error);
    return null;
  }
}

// Google Shopping API (com chave gratuita)
async function fetchFromGoogleShopping(query: string): Promise<APIProductResult[] | null> {
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
  const GOOGLE_CX = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;
  
  if (!GOOGLE_API_KEY || !GOOGLE_CX) return null;
  
  try {
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}&searchType=image&num=5`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    return data.items?.map((item: any) => ({
      name: item.title,
      price: 0, // Precisa ser extraído do snippet
      imageUrl: item.link,
      store: new URL(item.displayLink).hostname,
      description: item.snippet,
      category: 'Outros',
      url: item.displayLink
    })) || [];
  } catch (error) {
    console.error('Erro ao buscar no Google Shopping:', error);
    return null;
  }
}

// Extrai ID do produto de URLs conhecidas
function extractProductId(url: string): { platform: string; id: string } | null {
  const patterns = [
    { platform: 'mercadolivre', regex: /mercadolivre\.com\.br\/.*?-([A-Z0-9-]+)$/ },
    { platform: 'mercadolivre', regex: /produto\.mercadolivre\.com\.br\/([A-Z0-9-]+)/ },
    { platform: 'amazon', regex: /amazon\.com\.br\/.*\/dp\/([A-Z0-9]+)/ },
    { platform: 'amazon', regex: /amazon\.com\.br\/.*\/product\/([A-Z0-9]+)/ }
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern.regex);
    if (match) {
      return { platform: pattern.platform, id: match[1] };
    }
  }
  
  return null;
}

export async function tryAPIFirst(url: string): Promise<APIProductResult | null> {
  const productInfo = extractProductId(url);
  
  if (!productInfo) return null;
  
  switch (productInfo.platform) {
    case 'mercadolivre':
      return await fetchFromMercadoLivreAPI(productInfo.id);
    
    case 'amazon':
      // Implementar Amazon Product Advertising API se necessário
      return null;
    
    default:
      return null;
  }
}

export { APIProductResult };

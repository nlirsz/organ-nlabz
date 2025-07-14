import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY não está definida!");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const generationConfig = {
  temperature: 0.2,
  maxOutputTokens: 800,
};

export interface ScrapedProduct {
  name: string;
  price: number | null;
  originalPrice: number | null;
  imageUrl: string | null;
  store: string | null;
  description: string | null;
  category: string | null;
  brand: string | null;
}

function normalizePrice(price: any): number | null {
  if (typeof price === 'number') return price;
  if (typeof price !== 'string') return null;
  
  // Remove R$ e espaços
  let priceStr = price.replace(/[R$\s]/g, '');
  
  // Se tem vírgula, assume formato brasileiro (123.456,78)
  if (priceStr.includes(',')) {
    // Remove pontos (separadores de milhares) e troca vírgula por ponto
    priceStr = priceStr.replace(/\./g, '').replace(',', '.');
  }
  // Se só tem ponto, verifica se é separador decimal ou de milhares
  else if (priceStr.includes('.')) {
    const dotCount = (priceStr.match(/\./g) || []).length;
    
    if (dotCount > 1) {
      // Remove todos os pontos (são separadores de milhares)
      priceStr = priceStr.replace(/\./g, '');
    }
    // Se tem apenas um ponto, verifica a posição
    else {
      const dotIndex = priceStr.indexOf('.');
      const afterDot = priceStr.substring(dotIndex + 1);
      
      // Se tem mais de 2 dígitos após o ponto, é separador de milhares
      if (afterDot.length > 2) {
        priceStr = priceStr.replace(/\./g, '');
      }
      // Se tem 1 ou 2 dígitos após o ponto, é separador decimal - mantém
    }
  }
  
  const priceNum = parseFloat(priceStr);
  return isNaN(priceNum) ? null : priceNum;
}

// Método 1: Analisa o HTML diretamente
async function scrapeByAnalyzingHtml(productUrl: string, htmlContent: string): Promise<ScrapedProduct> {
  console.log(`[Gemini HTML Mode] Iniciando para: ${productUrl}`);
  
  const prompt = `Extraia informações do produto brasileiro deste HTML.

OBRIGATÓRIO - retorne JSON com:
{
  "name": "Nome do produto",
  "price": "1234.56",
  "image": "URL da imagem",
  "category": "Categoria"
}

REGRAS PREÇO:
- Procure R$ com números: R$ 1.234,56 ou R$1234,56
- Classes CSS: price, preco, valor, product-price
- Meta tags: og:price, product:price
- Formato retorno: "1234.56" (ponto decimal)

REGRAS NOME:
- Procure: <title>, <h1>, .product-name, .product-title
- Limpe texto extra, mantenha só o nome

REGRAS IMAGEM:
- Procure: og:image, product:image, .product-image src
- URL completa da imagem

CATEGORIAS: Eletrônicos, Roupas, Casa, Livros, Games, Presentes, Outros

HTML: ${htmlContent.substring(0, 50000)}`;
  
  const result = await model.generateContent({ 
    contents: [{ role: "user", parts: [{ text: prompt }] }], 
    generationConfig 
  });
  
  const responseText = result.response.text();
  console.log(`[Gemini HTML] Resposta bruta: ${responseText.substring(0, 300)}`);
  
  if (!responseText || responseText.trim() === '') {
    throw new Error('Resposta vazia do Gemini');
  }
  
  // Limpa a resposta removendo markdown se presente
  const cleanResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  let jsonData;
  try {
    jsonData = JSON.parse(cleanResponse);
  } catch (parseError) {
    console.error(`[Gemini HTML] Erro ao parsear JSON: ${parseError}`);
    console.error(`[Gemini HTML] Resposta completa: ${responseText}`);
    throw new Error(`Falha ao parsear resposta JSON: ${parseError}`);
  }
  
  if (jsonData && jsonData.price) {
    const normalizedPrice = normalizePrice(jsonData.price);
    console.log(`[Gemini HTML] Preço: ${jsonData.price} -> R$ ${normalizedPrice}`);
    jsonData.price = normalizedPrice;
  }
  
  return {
    name: jsonData.name || "Produto Desconhecido",
    price: jsonData.price || null,
    originalPrice: null,
    imageUrl: jsonData.image || null,
    store: extractStoreFromUrl(productUrl),
    description: jsonData.description || null,
    category: mapCategoryToApp(jsonData.category),
    brand: jsonData.brand || null
  };
}

// Método 2: Usa a busca interna da IA
async function scrapeBySearching(productUrl: string): Promise<ScrapedProduct> {
  console.log(`[Gemini Search Mode] Iniciando para: ${productUrl}`);

  const prompt = `Encontre informações do produto em: ${productUrl}

OBRIGATÓRIO - retorne JSON:
{
  "name": "Nome do produto",
  "price": "1234.56",
  "image": "URL da imagem",
  "category": "Categoria"
}

ESSENCIAL:
- Nome: nome real do produto
- Preço: formato brasileiro R$ convertido para "1234.56"
- Imagem: URL pública da imagem
- Categoria: Eletrônicos, Roupas, Casa, Livros, Games, Presentes, Outros`;
  
  const result = await model.generateContent({ 
    contents: [{ role: "user", parts: [{ text: prompt }] }], 
    generationConfig 
  });
  
  const responseText = result.response.text();
  console.log(`[Gemini Search] Resposta bruta: ${responseText.substring(0, 300)}`);
  
  if (!responseText || responseText.trim() === '') {
    throw new Error('Resposta vazia do Gemini Search');
  }
  
  const cleanResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  let jsonData;
  try {
    jsonData = JSON.parse(cleanResponse);
  } catch (parseError) {
    console.error(`[Gemini Search] Erro ao parsear JSON: ${parseError}`);
    throw new Error(`Falha ao parsear resposta JSON do Search: ${parseError}`);
  }

  if (jsonData && jsonData.price) {
    jsonData.price = normalizePrice(jsonData.price);
  }

  return {
    name: jsonData.name || "Produto Desconhecido",
    price: jsonData.price || null,
    originalPrice: null,
    imageUrl: jsonData.image || null,
    store: extractStoreFromUrl(productUrl),
    description: jsonData.description || null,
    category: mapCategoryToApp(jsonData.category),
    brand: jsonData.brand || null
  };
}

// Função auxiliar para extrair nome da loja da URL
function extractStoreFromUrl(url: string): string | null {
  try {
    const domain = new URL(url).hostname;
    const storeName = domain.replace('www.', '').replace('.com.br', '').replace('.com', '');
    return storeName.charAt(0).toUpperCase() + storeName.slice(1);
  } catch {
    return null;
  }
}

// Função auxiliar para mapear categorias
function mapCategoryToApp(category: string | null): string {
  if (!category) return "Geral";
  
  const categoryMap: { [key: string]: string } = {
    'eletrônicos': 'Eletronicos',
    'electronics': 'Eletronicos',
    'roupas': 'Roupas',
    'acessórios': 'Roupas',
    'casa': 'Casa',
    'decoração': 'Casa',
    'livros': 'Livros',
    'mídia': 'Livros',
    'games': 'Games',
    'jogos': 'Games',
    'presentes': 'Presentes'
  };
  
  const normalized = category.toLowerCase();
  return categoryMap[normalized] || "Geral";
}

// Função de fallback que extrai dados básicos do HTML
async function createFallbackProduct(url: string, htmlContent: string): Promise<ScrapedProduct> {
  console.log(`[Fallback] Extraindo dados básicos para: ${url}`);
  
  // Extrai nome básico do HTML
  let name = "Produto Extraído";
  
  // Procura pelo title
  const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    name = titleMatch[1].trim().replace(/\s+/g, ' ').substring(0, 100);
  }
  
  // Procura por h1 se não encontrou um bom title
  if (name === "Produto Extraído" || name.length < 10) {
    const h1Match = htmlContent.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match && h1Match[1]) {
      name = h1Match[1].trim().replace(/\s+/g, ' ').substring(0, 100);
    }
  }
  
  // Extrai preço com análise de contexto mais inteligente
  let price = null;
  const foundPrices = [];
  
  // Primeiro, procura por preços principais com padrões específicos
  const primaryPricePatterns = [
    // Preço principal do produto (h1, h2, h3 com preço próximo)
    /<h[1-3][^>]*>[^<]*Cockpit[^<]*<\/h[1-3]>[^<]*(?:<[^>]*>)*[^<]*R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
    // Preço após título do produto
    /Cockpit[^<]*<[^>]*>[^<]*R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
    // Preço em contexto de "à vista" (individual)
    /(?:à\s*vista|a\s*vista)(?![^<]*total)[^<]*R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
    // Preço de produto isolado (evita combo/total)
    /(?:preço|valor)(?![^<]*(?:total|combo|junto))[^<]*R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi
  ];
  
  for (const pattern of primaryPricePatterns) {
    const matches = Array.from(htmlContent.matchAll(pattern));
    for (const match of matches) {
      const normalizedPrice = normalizePrice(match[1]);
      if (normalizedPrice && normalizedPrice > 100 && normalizedPrice < 20000) {
        foundPrices.push({
          price: normalizedPrice,
          context: match[0],
          priority: 1, // Preços principais têm prioridade máxima
          source: 'primary'
        });
      }
    }
  }
  
  // Segundo, procura por preços em meta tags (confiável)
  const metaPricePatterns = [
    /property=["']product:price:amount["'][^>]*content=["']([^"']+)["']/gi,
    /property=["']og:price:amount["'][^>]*content=["']([^"']+)["']/gi,
    /name=["']price["'][^>]*content=["']([^"']+)["']/gi
  ];
  
  for (const pattern of metaPricePatterns) {
    const matches = Array.from(htmlContent.matchAll(pattern));
    for (const match of matches) {
      const normalizedPrice = normalizePrice(match[1]);
      if (normalizedPrice && normalizedPrice > 10 && normalizedPrice < 50000) {
        foundPrices.push({
          price: normalizedPrice,
          context: match[0],
          priority: 2, // Meta tags têm prioridade alta
          source: 'meta'
        });
      }
    }
  }
  
  // Terceiro, procura por preços em classes e IDs específicos
  const specificPricePatterns = [
    // Classes específicas de preço principal (evita combo/total)
    /class=["'][^"']*(?:price|preco|valor|current-price|product-price|final-price)[^"']*["'][^>]*>[^<]*?R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
    // IDs específicos
    /id=["'][^"']*(?:price|preco|valor)[^"']*["'][^>]*>[^<]*?R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
    // Data attributes
    /data-price=["']([^"']+)["']/gi,
    /data-valor=["']([^"']+)["']/gi,
    /data-amount=["']([^"']+)["']/gi
  ];
  
  for (const pattern of specificPricePatterns) {
    const matches = Array.from(htmlContent.matchAll(pattern));
    for (const match of matches) {
      const normalizedPrice = normalizePrice(match[1]);
      if (normalizedPrice && normalizedPrice > 10 && normalizedPrice < 50000) {
        // Verifica se não é preço de combo/total (evita contextos com "total", "combo", "junto")
        const context = match[0].toLowerCase();
        const isComboPrice = context.includes('total') || context.includes('combo') || context.includes('junto');
        
        foundPrices.push({
          price: normalizedPrice,
          context: match[0],
          priority: isComboPrice ? 5 : 3, // Preços de combo têm prioridade menor
          source: isComboPrice ? 'combo' : 'specific'
        });
      }
    }
  }
  
  // Quarto, procura por preços em contextos gerais
  const generalPricePatterns = [
    // Preços em spans e divs (evita contextos de combo)
    /<(?:span|div|strong|b)[^>]*>[^<]*?R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi
  ];
  
  for (const pattern of generalPricePatterns) {
    const matches = Array.from(htmlContent.matchAll(pattern));
    for (const match of matches) {
      const normalizedPrice = normalizePrice(match[1]);
      if (normalizedPrice && normalizedPrice > 10 && normalizedPrice < 50000) {
        // Evita preços muito próximos (diferença < 10%)
        const isDuplicate = foundPrices.some(p => 
          Math.abs(p.price - normalizedPrice) / normalizedPrice < 0.1
        );
        
        // Verifica se não é preço de combo/total
        const context = match[0].toLowerCase();
        const isComboPrice = context.includes('total') || context.includes('combo') || context.includes('junto') || context.includes('comprando');
        
        if (!isDuplicate) {
          foundPrices.push({
            price: normalizedPrice,
            context: match[0],
            priority: isComboPrice ? 6 : 4, // Preços de combo têm prioridade bem menor
            source: isComboPrice ? 'combo' : 'general'
          });
        }
      }
    }
  }
  
  // Ordena por prioridade e escolhe o melhor preço
  if (foundPrices.length > 0) {
    foundPrices.sort((a, b) => a.priority - b.priority);
    price = foundPrices[0].price;
    console.log(`[Fallback] Preços encontrados: ${foundPrices.map(p => `${p.price}(${p.source})`).join(', ')}, escolhido: ${price}`);
  }
  
  // Extrai imagem básica
  let imageUrl = null;
  
  // Procura por og:image
  const ogImageMatch = htmlContent.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  if (ogImageMatch && ogImageMatch[1]) {
    imageUrl = ogImageMatch[1];
  }
  
  // Procura por product:image se não encontrou og:image
  if (!imageUrl) {
    const prodImageMatch = htmlContent.match(/<meta[^>]*property=["']product:image["'][^>]*content=["']([^"']+)["']/i);
    if (prodImageMatch && prodImageMatch[1]) {
      imageUrl = prodImageMatch[1];
    }
  }
  
  // Procura por primeira imagem com src se não encontrou meta tags
  if (!imageUrl) {
    const imgMatch = htmlContent.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
    if (imgMatch && imgMatch[1] && !imgMatch[1].includes('data:')) {
      imageUrl = imgMatch[1];
    }
  }
  
  // Garante URL absoluta para a imagem
  if (imageUrl && !imageUrl.startsWith('http')) {
    const urlObj = new URL(url);
    if (imageUrl.startsWith('/')) {
      imageUrl = `${urlObj.protocol}//${urlObj.host}${imageUrl}`;
    } else {
      imageUrl = `${urlObj.protocol}//${urlObj.host}/${imageUrl}`;
    }
  }
  
  // Categoria baseada na URL
  let category = "Geral";
  const urlLower = url.toLowerCase();
  if (urlLower.includes('games') || urlLower.includes('jogo')) category = "Games";
  else if (urlLower.includes('roupa') || urlLower.includes('moda')) category = "Roupas";
  else if (urlLower.includes('casa') || urlLower.includes('decoracao')) category = "Casa";
  else if (urlLower.includes('eletronico') || urlLower.includes('tech')) category = "Eletronicos";
  else if (urlLower.includes('livro') || urlLower.includes('book')) category = "Livros";
  
  console.log(`[Fallback] Dados extraídos - Nome: ${name}, Preço: ${price}, Imagem: ${imageUrl ? 'Sim' : 'Não'}`);
  
  return {
    name,
    price,
    originalPrice: null,
    imageUrl,
    store: extractStoreFromUrl(url),
    description: `Produto extraído da URL: ${url}`,
    category,
    brand: null
  };
}

export async function extractProductInfo(url: string, htmlContent: string): Promise<ScrapedProduct> {
  try {
    console.log(`[Gemini] Iniciando extração para: ${url}`);
    
    // Primeira tentativa: análise do HTML
    try {
      console.log(`[Gemini] Tentando método HTML para: ${url}`);
      const htmlResult = await scrapeByAnalyzingHtml(url, htmlContent);
      
      // Se encontrou preço válido, retorna o resultado
      if (htmlResult.price && htmlResult.price > 0) {
        console.log(`[Gemini] ✓ Sucesso com método HTML - Preço: R$ ${htmlResult.price}`);
        return htmlResult;
      }
      
      // Se não encontrou preço mas tem nome válido, guarda o resultado
      if (htmlResult.name && htmlResult.name !== "Produto Desconhecido") {
        console.log(`[Gemini] Método HTML encontrou produto sem preço: ${htmlResult.name}`);
        
        // Tenta método de busca para complementar
        try {
          console.log(`[Gemini] Tentando método Search para complementar...`);
          const searchResult = await scrapeBySearching(url);
          
          if (searchResult.price && searchResult.price > 0) {
            console.log(`[Gemini] ✓ Sucesso complementar com método Search - Preço: R$ ${searchResult.price}`);
            // Combina dados do HTML (mais confiável) com preço da busca
            return {
              ...htmlResult,
              price: searchResult.price
            };
          }
        } catch (searchError) {
          console.warn(`[Gemini] Método Search falhou:`, searchError);
        }
        
        // Retorna resultado HTML mesmo sem preço
        return htmlResult;
      }
      
    } catch (htmlError) {
      console.warn(`[Gemini] Método HTML falhou:`, htmlError);
    }
    
    // Segunda tentativa: busca interna como fallback
    try {
      console.log(`[Gemini] Tentando método Search como fallback...`);
      const searchResult = await scrapeBySearching(url);
      
      if (searchResult.price && searchResult.price > 0) {
        console.log(`[Gemini] ✓ Sucesso com método Search - Preço: R$ ${searchResult.price}`);
        return searchResult;
      }
      
      if (searchResult.name && searchResult.name !== "Produto Desconhecido") {
        console.log(`[Gemini] Método Search encontrou produto sem preço: ${searchResult.name}`);
        return searchResult;
      }
    } catch (searchError) {
      console.warn(`[Gemini] Método Search falhou:`, searchError);
    }
    
    throw new Error("Ambos os métodos de extração falharam");
    
  } catch (error) {
    console.error(`[Gemini] Extração falhou completamente para ${url}:`, error);
    
    // Fallback com extração básica da URL
    const fallbackProduct = await createFallbackProduct(url, htmlContent);
    return fallbackProduct;
  }
}
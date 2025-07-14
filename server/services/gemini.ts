import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY não está definida!");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const generationConfig = {
  temperature: 0.3,
  responseMimeType: "application/json",
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
  
  console.log(`[normalizePrice] Entrada: "${price}"`);
  
  // Remove R$ e espaços
  let priceStr = price.replace(/[R$\s]/g, '');
  console.log(`[normalizePrice] Após remoção R$/espaços: "${priceStr}"`);
  
  // Se tem vírgula, assume formato brasileiro (123.456,78)
  if (priceStr.includes(',')) {
    console.log(`[normalizePrice] Detectado formato brasileiro com vírgula`);
    // Remove pontos (separadores de milhares) e troca vírgula por ponto
    priceStr = priceStr.replace(/\./g, '').replace(',', '.');
    console.log(`[normalizePrice] Após conversão brasileiro: "${priceStr}"`);
  }
  // Se só tem ponto, verifica se é separador decimal ou de milhares
  else if (priceStr.includes('.')) {
    const dotCount = (priceStr.match(/\./g) || []).length;
    console.log(`[normalizePrice] Detectado ${dotCount} ponto(s)`);
    
    if (dotCount > 1) {
      // Remove todos os pontos (são separadores de milhares)
      priceStr = priceStr.replace(/\./g, '');
      console.log(`[normalizePrice] Múltiplos pontos removidos: "${priceStr}"`);
    }
    // Se tem apenas um ponto, verifica a posição
    else {
      const dotIndex = priceStr.indexOf('.');
      const afterDot = priceStr.substring(dotIndex + 1);
      console.log(`[normalizePrice] Após ponto: "${afterDot}" (${afterDot.length} dígitos)`);
      
      // Se tem mais de 2 dígitos após o ponto, é separador de milhares
      if (afterDot.length > 2) {
        priceStr = priceStr.replace(/\./g, '');
        console.log(`[normalizePrice] Ponto como separador de milhares removido: "${priceStr}"`);
      }
      // Se tem 1 ou 2 dígitos após o ponto, é separador decimal - mantém
      else {
        console.log(`[normalizePrice] Ponto mantido como separador decimal`);
      }
    }
  }
  
  const priceNum = parseFloat(priceStr);
  console.log(`[normalizePrice] Resultado final: ${priceNum}`);
  return isNaN(priceNum) ? null : priceNum;
}

// Método 1: Analisa o HTML diretamente
async function scrapeByAnalyzingHtml(productUrl: string, htmlContent: string): Promise<ScrapedProduct> {
  console.log(`[Gemini HTML Mode] Iniciando para: ${productUrl}`);
  
  const prompt = `Analise o HTML a seguir para extrair os detalhes de um produto BRASILEIRO.
  
CRÍTICO - REGRAS PARA PREÇOS BRASILEIROS:
- Procure por preços no formato brasileiro: R$ 1.234,56 ou R$1234,56 ou 1234,56
- IMPORTANTE: No Brasil, ponto é separador de milhares e vírgula é separador decimal
- Exemplos corretos: R$ 4.941,00 = 4941.00 | R$ 123,45 = 123.45 | R$ 12.345,67 = 12345.67
- Procure por classes CSS: price, preco, valor, amount, cost, product-price, current-price, price-current, price-value
- Procure por IDs: #price, #preco, #valor, #product-price
- Procure por atributos: data-price, data-valor, data-amount
- Procure por textos próximos: "R$", "BRL", "reais", "por:", "de:", "à vista", "preço", "valor"
- Se encontrar parcelas como "12x de R$ 100,00", o preço total é 1200.00
- Ignore preços muito baixos (<5 reais) ou muito altos (>500.000 reais)
- Procure por elementos span, div, p, strong, em que contenham números com R$
- Analise meta tags: og:price, product:price, twitter:data1
- Procure por schemas JSON-LD com preços
- SEMPRE retorne o preço como string no formato "1234.56" (ponto como decimal)

Retorne um objeto JSON com:
{
  "name": "Nome do produto",
  "price": "4941.00",
  "image": "URL da imagem",
  "brand": "Marca",
  "category": "Categoria",
  "description": "Descrição"
}

Categorias válidas: Eletrônicos, Roupas e Acessórios, Casa e Decoração, Livros e Mídia, Esportes e Lazer, Ferramentas e Construção, Alimentos e Bebidas, Saúde e Beleza, Automotivo, Pet Shop, Outros

HTML: ${htmlContent.substring(0, 200000)}`;
  
  const result = await model.generateContent({ 
    contents: [{ role: "user", parts: [{ text: prompt }] }], 
    generationConfig 
  });
  
  const responseText = result.response.text();
  console.log(`[Gemini HTML] Resposta bruta: ${responseText.substring(0, 300)}`);
  
  let jsonData = JSON.parse(responseText);
  
  if (jsonData && jsonData.price) {
    console.log(`[Gemini HTML] Preço original: "${jsonData.price}" (tipo: ${typeof jsonData.price})`);
    const normalizedPrice = normalizePrice(jsonData.price);
    console.log(`[Gemini HTML] Preço normalizado: ${jsonData.price} -> ${normalizedPrice}`);
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

  const prompt = 'Use sua ferramenta de busca para encontrar os detalhes do produto na URL: "' + productUrl + '".' +
    ' Retorne um objeto JSON com: "name", "price", "image", "brand", "category", "description".' +
    ' Para "image", encontre uma URL de imagem pública e de alta resolução.' +
    ' "price" deve ser um número ou um texto que inclua o valor numérico.';
  
  const result = await model.generateContent({ 
    contents: [{ role: "user", parts: [{ text: prompt }] }], 
    generationConfig 
  });
  
  let jsonData = JSON.parse(result.response.text());

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
    
    // Fallback mais básico
    return {
      name: "Produto Extraído",
      price: null,
      originalPrice: null,
      imageUrl: null,
      store: extractStoreFromUrl(url),
      description: `Produto extraído da URL: ${url}`,
      category: "Geral",
      brand: null
    };
  }
}
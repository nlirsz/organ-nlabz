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
  
  // Remove R$, espaços, pontos como separadores de milhares
  const priceStr = price.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  const priceNum = parseFloat(priceStr);
  return isNaN(priceNum) ? null : priceNum;
}

// Método 1: Analisa o HTML diretamente
async function scrapeByAnalyzingHtml(productUrl: string, htmlContent: string): Promise<ScrapedProduct> {
  console.log(`[Gemini HTML Mode] Iniciando para: ${productUrl}`);
  
  const prompt = `Analise o HTML a seguir para extrair os detalhes de um produto BRASILEIRO.
  
MUITO IMPORTANTE - REGRAS PARA PREÇOS BRASILEIROS:
- Procure por preços no formato: R$ 123,45 ou R$123,45 ou 123,45 ou R$ 123.45
- Procure por classes CSS: price, preco, valor, amount, cost, product-price, current-price, price-current
- Procure por seletores: [data-price], [data-valor], .price-value, .preco-atual
- Procure por textos: "R$", "BRL", "reais", "por:", "de:", "à vista", "preço", "valor"
- Se encontrar parcelas como "3x de R$ 50,00", calcule o total (150,00)
- Ignore preços muito baixos (<1 real) ou muito altos (>100.000 reais)
- Procure por elementos span, div, p que contenham números com R$
- Analise meta tags com preços: og:price, product:price

Retorne um objeto JSON com:
{
  "name": "Nome do produto",
  "price": "123.45",
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
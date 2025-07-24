import { GoogleGenerativeAI } from "@google/generative-ai";
import * as cheerio from 'cheerio';
import { extractJSONLD } from './scraper.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

interface ProductInfo {
  name: string;
  price: number | null;
  originalPrice?: number | null;
  imageUrl: string | null;
  store: string;
  description?: string | null;
  category?: string | null;
  brand?: string | null;
}

export async function extractProductInfo(url: string, html: string): Promise<ProductInfo> {
  console.log(`[ExtractInfo] Iniciando extração para: ${url}`);

  // PRIMEIRA TENTATIVA: Extrair dados JSON-LD estruturados
  try {
    console.log(`[ExtractInfo] Tentativa 1: Extração via JSON-LD`);
    const jsonLdData = extractJSONLD(html);

    if (jsonLdData?.name && jsonLdData?.price) {
      console.log(`[ExtractInfo] ✅ JSON-LD bem-sucedido: ${jsonLdData.name}`);

      return {
        name: jsonLdData.name,
        price: jsonLdData.price,
        originalPrice: jsonLdData.originalPrice || null,
        imageUrl: jsonLdData.imageUrl || extractFallbackImage(html),
        store: extractStoreFromUrl(url),
        description: jsonLdData.description || null,
        category: jsonLdData.category || extractCategoryFromUrl(url),
        brand: jsonLdData.brand || null
      };
    } else {
      console.log(`[ExtractInfo] JSON-LD incompleto ou não encontrado`);
    }
  } catch (error) {
    console.warn(`[ExtractInfo] Erro no JSON-LD:`, error);
  }

  // SEGUNDA TENTATIVA: Usar API Gemini
  if (GEMINI_API_KEY) {
    try {
      console.log(`[ExtractInfo] Tentativa 2: Extração via Gemini AI`);
      const geminiData = await scrapeByAnalyzingHtml(html, url);

      if (geminiData?.name && geminiData?.price) {
        console.log(`[ExtractInfo] ✅ Gemini bem-sucedido: ${geminiData.name}`);
        return geminiData;
      } else {
        console.log(`[ExtractInfo] Gemini retornou dados incompletos`);
      }
    } catch (error) {
      console.warn(`[ExtractInfo] Erro na API Gemini:`, error);
    }
  } else {
    console.log(`[ExtractInfo] API Gemini não configurada`);
  }

  // TERCEIRA TENTATIVA: Fallback com extração básica
  console.log(`[ExtractInfo] Tentativa 3: Fallback com extração básica`);
  return createFallbackProductFromHtml(url, html);
}

async function scrapeByAnalyzingHtml(html: string, url: string): Promise<ProductInfo | null> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY não configurada");
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Limpa o HTML mantendo apenas o essencial
    const cleanHtml = cleanHtmlForAnalysis(html);

    const prompt = `
INSTRUÇÃO: Analise este HTML de uma página de produto e extraia as informações principais.
URL: ${url}

REGRAS IMPORTANTES:
1. PREÇO: Extraia apenas o preço principal do produto, ignore valores de frete, parcelamento ou taxas
2. IMAGEM: Prefira URLs de imagem em alta resolução, evite miniaturas
3. NOME: Use o título principal do produto, sem informações de entrega ou promoção
4. RETORNO: Responda APENAS com um objeto JSON válido, sem texto adicional

FORMATO DE RESPOSTA (JSON):
{
  "name": "Nome exato do produto",
  "price": 99.99,
  "originalPrice": 129.99,
  "imageUrl": "URL da melhor imagem disponível",
  "description": "Descrição concisa do produto",
  "brand": "Marca do produto",
  "category": "Categoria do produto"
}

HTML para análise:
${cleanHtml}
`;

    console.log(`[Gemini] Enviando requisição para análise...`);
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log(`[Gemini] Resposta recebida: ${text.substring(0, 200)}...`);

    // Tenta extrair JSON da resposta
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Resposta não contém JSON válido");
    }

    const productData = JSON.parse(jsonMatch[0]);

    // Valida se tem dados essenciais
    if (!productData.name) {
      throw new Error("Nome do produto não encontrado na resposta");
    }

    // Normaliza o preço
    let price: number | null = null;
    if (productData.price && !isNaN(parseFloat(productData.price))) {
      price = parseFloat(productData.price);
    }

    let originalPrice: number | null = null;
    if (productData.originalPrice && !isNaN(parseFloat(productData.originalPrice))) {
      originalPrice = parseFloat(productData.originalPrice);
    }

    return {
      name: productData.name.trim(),
      price: price,
      originalPrice: originalPrice,
      imageUrl: productData.imageUrl || extractFallbackImage(html),
      store: extractStoreFromUrl(url),
      description: productData.description?.trim() || null,
      category: productData.category || extractCategoryFromUrl(url),
      brand: productData.brand?.trim() || null
    };

  } catch (error) {
    console.error(`[Gemini] Erro na análise:`, error);
    throw error;
  }
}

function cleanHtmlForAnalysis(html: string): string {
  try {
    const $ = cheerio.load(html);

    // Remove scripts, styles e outros elementos desnecessários
    $('script, style, noscript, iframe, svg').remove();

    // Foca em elementos relevantes para produtos
    const relevantSelectors = [
      'h1, h2, h3',
      '[class*="price"], [class*="valor"], [class*="cost"]',
      '[class*="product"], [class*="item"]',
      '[class*="title"], [class*="name"], [class*="titulo"]',
      '[class*="description"], [class*="desc"]',
      '[class*="brand"], [class*="marca"]',
      'img[src*="product"], img[alt*="product"]'
    ].join(', ');

    let relevantContent = '';
    $(relevantSelectors).each((_, element) => {
      const $el = $(element);
      const text = $el.text().trim();
      const src = $el.attr('src');
      const alt = $el.attr('alt');

      if (text && text.length > 2) {
        relevantContent += `${text}\n`;
      }
      if (src) {
        relevantContent += `IMG: ${src}\n`;
      }
      if (alt && alt.length > 2) {
        relevantContent += `ALT: ${alt}\n`;
      }
    });

    // Limita o tamanho para não exceder limites da API
    const maxLength = 8000;
    if (relevantContent.length > maxLength) {
      relevantContent = relevantContent.substring(0, maxLength) + '...';
    }

    return relevantContent || html.substring(0, maxLength);
  } catch (error) {
    console.warn(`[Gemini] Erro ao limpar HTML:`, error);
    return html.substring(0, 8000);
  }
}

function createFallbackProductFromHtml(url: string, html: string): ProductInfo {
  console.log(`[Fallback] Criando produto fallback...`);

  const $ = cheerio.load(html);
  let name = 'Produto encontrado';
  let price: number | null = null;
  let imageUrl: string | null = null;
  let description: string | null = null;

  // Tenta extrair nome do title ou h1
  const title = $('title').text().trim() || $('h1').first().text().trim();
  if (title && title.length > 3) {
    name = title.substring(0, 100);
  }

  // Tenta extrair preço com seletores comuns
  const priceSelectors = [
    '[class*="price"]',
    '[class*="valor"]',
    '[class*="cost"]',
    '[data-price]'
  ];

  for (const selector of priceSelectors) {
    const priceText = $(selector).first().text();
    const priceMatch = priceText.match(/[\d,]+\.?\d*/);
    if (priceMatch) {
      const priceValue = parseFloat(priceMatch[0].replace(',', '.'));
      if (!isNaN(priceValue) && priceValue > 0) {
        price = priceValue;
        break;
      }
    }
  }

  // Tenta extrair imagem
  imageUrl = extractFallbackImage(html);

  // Tenta extrair descrição
  const descSelectors = ['[class*="description"]', '[class*="desc"]', 'meta[name="description"]'];
  for (const selector of descSelectors) {
    const desc = $(selector).first().text().trim() || $(selector).attr('content');
    if (desc && desc.length > 10) {
      description = desc.substring(0, 200);
      break;
    }
  }

  return {
    name: name,
    price: price,
    originalPrice: null,
    imageUrl: imageUrl,
    store: extractStoreFromUrl(url),
    description: description,
    category: extractCategoryFromUrl(url),
    brand: null
  };
}

function extractFallbackImage(html: string): string | null {
  try {
    const $ = cheerio.load(html);

    // Prioridade de seletores para imagem
    const imageSelectors = [
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      'img[class*="product"]',
      'img[class*="main"]',
      'img[alt*="product"]'
    ];

    for (const selector of imageSelectors) {
      const imgSrc = $(selector).attr('content') || $(selector).attr('src');
      if (imgSrc && imgSrc.startsWith('http')) {
        console.log(`[Fallback] Imagem encontrada: ${imgSrc}`);
        return imgSrc;
      }
    }

    // Se não encontrar, usa primeira imagem válida
    const firstImg = $('img[src^="http"]').first().attr('src');
    if (firstImg) {
      return firstImg;
    }

    return 'https://via.placeholder.com/400x400/e0e5ec/6c757d?text=Produto';
  } catch (error) {
    console.warn(`[Fallback] Erro ao extrair imagem:`, error);
    return 'https://via.placeholder.com/400x400/e0e5ec/6c757d?text=Produto';
  }
}

function extractStoreFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    const storeMap: Record<string, string> = {
      'mercadolivre.com.br': 'Mercado Livre',
      'amazon.com.br': 'Amazon Brasil',
      'magazineluiza.com.br': 'Magazine Luiza',
      'americanas.com.br': 'Americanas',
      'submarino.com.br': 'Submarino',
      'casasbahia.com.br': 'Casas Bahia',
      'extra.com.br': 'Extra',
      'shopee.com.br': 'Shopee',
      'zara.com': 'Zara',
      'nike.com.br': 'Nike Brasil',
      'netshoes.com.br': 'Netshoes'
    };

    for (const [domain, name] of Object.entries(storeMap)) {
      if (hostname.includes(domain)) return name;
    }

    return hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
  } catch {
    return 'Loja Online';
  }
}

function extractCategoryFromUrl(url: string): string {
  const categoryMap: Record<string, string> = {
    'celular': 'Eletrônicos',
    'smartphone': 'Eletrônicos',
    'notebook': 'Eletrônicos',
    'tenis': 'Roupas e Acessórios',
    'roupa': 'Roupas e Acessórios',
    'casa': 'Casa e Decoração',
    'decoracao': 'Casa e Decoração',
    'livro': 'Livros e Mídia',
    'jogo': 'Games',
    'game': 'Games'
  };

  const urlLower = url.toLowerCase();
  for (const [keyword, category] of Object.entries(categoryMap)) {
    if (urlLower.includes(keyword)) {
      return category;
    }
  }

  return 'Outros';
}
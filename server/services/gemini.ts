import { GoogleGenerativeAI } from "@google/generative-ai";
import * as cheerio from 'cheerio';
import { extractJSONLD } from './scraper.js';
import { geminiWrapper, createAPIError } from './api-wrapper.js';

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

/**
 * ESTRATÉGIA HIERÁRQUICA DE EXTRAÇÃO:
 * 1. Tentativa JSON-LD (mais confiável)
 * 2. Tentativa Gemini AI (plano B inteligente)
 * 3. Fallback com seletores CSS (último recurso)
 */
export async function extractProductInfo(url: string, html: string): Promise<ProductInfo> {
  console.log(`[ExtractInfo] 🎯 Iniciando extração hierárquica para: ${url}`);

  // ========== TENTATIVA #1: EXTRAÇÃO JSON-LD (MAIS CONFIÁVEL) ==========
  try {
    console.log(`[ExtractInfo] 🥇 TENTATIVA 1: Extração via JSON-LD`);
    const jsonLdData = extractJSONLD(html);

    if (jsonLdData?.name && jsonLdData?.price && jsonLdData.price > 0) {
      console.log(`[ExtractInfo] ✅ JSON-LD SUCESSO: "${jsonLdData.name}" - R$ ${jsonLdData.price}`);

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
      console.log(`[ExtractInfo] ⚠️ JSON-LD incompleto:`, {
        hasName: !!jsonLdData?.name,
        hasPrice: !!jsonLdData?.price,
        priceValue: jsonLdData?.price
      });
    }
  } catch (error: any) {
    console.warn(`[ExtractInfo] ❌ Erro no JSON-LD:`, error.message);
  }

  // ========== TENTATIVA #2: GEMINI AI (PLANO B INTELIGENTE) ==========
  if (GEMINI_API_KEY) {
    try {
      console.log(`[ExtractInfo] 🥈 TENTATIVA 2: Extração via Gemini AI`);
      const geminiData = await extractViaGeminiAI(html, url);

      if (geminiData?.name && geminiData?.price && geminiData.price > 0) {
        console.log(`[ExtractInfo] ✅ GEMINI SUCESSO: "${geminiData.name}" - R$ ${geminiData.price}`);
        return geminiData;
      } else {
        console.log(`[ExtractInfo] ⚠️ Gemini retornou dados incompletos:`, {
          hasName: !!geminiData?.name,
          hasPrice: !!geminiData?.price,
          priceValue: geminiData?.price
        });
      }
    } catch (error: any) {
      console.warn(`[ExtractInfo] ❌ Erro na Gemini AI:`, error.message);
    }
  } else {
    console.log(`[ExtractInfo] ⚠️ GEMINI_API_KEY não configurada, pulando tentativa 2`);
  }

  // ========== TENTATIVA #3: FALLBACK COM SELETORES CSS (ÚLTIMO RECURSO) ==========
  console.log(`[ExtractInfo] 🥉 TENTATIVA 3: Fallback com seletores CSS`);
  return extractViaCSSelectors(url, html);
}

/**
 * TENTATIVA #2: Extração via Gemini AI com rate limiting e timeout
 */
async function extractViaGeminiAI(html: string, url: string): Promise<ProductInfo | null> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY não configurada");
  }

  try {
    // Limpa o HTML para análise mais eficiente
    const cleanHtml = cleanHtmlForGeminiAnalysis(html);
    const store = extractStoreFromUrl(url);
    
    console.log(`[Gemini] 📝 HTML limpo para análise (${cleanHtml.length} chars)`);
    console.log(`[Gemini] 📄 Preview do conteúdo:`, cleanHtml.substring(0, 800));

    const optimizedPrompt = `
ESPECIALISTA EM E-COMMERCE: Extraia informações de produto desta página ${store}.

URL: ${url}

INSTRUÇÕES CRÍTICAS PARA PREÇOS:
1. PREÇO PRINCIPAL: Procure o preço mais VISÍVEL e DESTACADO na página
2. FORMATOS ACEITOS: "R$ 8.399,00", "8399.00", "8.399", etc.
3. IGNORE: preços de frete, parcelamento, promoções antigas, preços "de" ou "por"
4. PRIORIZE: preço atual de venda, preço final, preço à vista
5. Se houver múltiplos preços, escolha o MAIOR (geralmente o preço principal)

OUTRAS INFORMAÇÕES:
- NOME: Título principal do produto (sem informações promocionais)
- IMAGEM: URL da imagem principal do produto
- MARCA: Identifique a marca/fabricante
- DESCRIÇÃO: Resumo das características principais
- CATEGORIA: Classifique o produto (Eletrônicos, Moda, Casa, etc.)

REGRAS CRÍTICAS:
- Preços devem ser números decimais precisos (ex: 8399.00)
- URLs de imagem devem começar com http/https
- Responda APENAS JSON válido, sem markdown
- Se não encontrar informação, use null
- DUPLIQUE A VERIFICAÇÃO do preço antes de retornar

FORMATO OBRIGATÓRIO:
{
  "name": "Nome do produto",
  "price": 299.99,
  "originalPrice": 399.99,
  "imageUrl": "https://...",
  "description": "Descrição breve",
  "brand": "Marca",
  "category": "Categoria"
}

CONTEÚDO DA PÁGINA:
${cleanHtml}
`;

    // Para AliExpress, usa prompt mais específico
    let finalPrompt = optimizedPrompt;
    if (url.includes('aliexpress.com')) {
      finalPrompt = `Você é um especialista em extração de dados de produtos da AliExpress.

    INSTRUÇÕES ESPECÍFICAS PARA ALIEXPRESS:
    1. Procure dados de produto em estruturas JSON, especialmente em scripts com window.runParams ou similar
    2. O nome do produto geralmente está em elementos com "product-title", data-pl="product-title" ou similar
    3. Preços estão em elementos com classes como "product-price", "notranslate", ou data-spm contendo price
    4. Imagens estão em elementos img com src contendo "alicdn.com"
    5. CRÍTICO: Analise cuidadosamente o HTML para extrair dados do produto ESPECÍFICO da URL fornecida
    6. Se a página contém redirecionamentos ou dados de múltiplos produtos, foque no produto principal
    7. IMPORTANTE: Se não conseguir extrair dados precisos do produto correto, retorne null

    URL do produto: ${url}

    Analise este HTML da AliExpress e extraia APENAS dados do produto específico desta página.
    Verifique se o produto extraído corresponde ao ID ${url.match(/\/(\d+)\.html/)?.[1] || 'não encontrado'} da URL.

    Retorne um JSON válido com:
    - name: nome exato do produto (obrigatório)
    - price: preço em número (obrigatório) 
    - originalPrice: preço original se houver desconto
    - imageUrl: URL da imagem principal (deve ser do produto correto)
    - description: descrição do produto
    - category: categoria inferida
    - brand: marca se identificada

    Se não conseguir extrair dados confiáveis do produto correto, retorne: {"error": "Dados não encontrados"}
    
    CONTEÚDO DA PÁGINA:
    ${cleanHtml}`;
    }

    console.log(`[Gemini] 🤖 Enviando análise via rate-limited wrapper para ${store}...`);
    
    // USA O WRAPPER COM RATE LIMITING E TIMEOUT
    const result = await geminiWrapper.generateContent(finalPrompt, {
      model: "gemini-1.5-flash",
      temperature: 0.1,
      maxTokens: 1000,
      timeout: 30000,
      priority: 'normal'
    });
    
    if (!result.response || !result.response.text()) {
      console.log(`[Gemini] ⚠️ Resposta vazia ou inválida`);
      return null;
    }

    const text = result.response.text();
    console.log(`[Gemini] 📥 Resposta recebida (${text.length} chars)`);
    console.log(`[Gemini] 📄 Conteúdo da resposta:`, text.substring(0, 500));

    // Parse da resposta JSON
    let productData;
    try {
      // Remove possível markdown se presente
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/```json\n/, '').replace(/\n```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/```\n/, '').replace(/\n```$/, '');
      }

      productData = JSON.parse(cleanText);
      console.log(`[Gemini] ✅ JSON parseado com sucesso:`, {
        name: productData.name,
        rawPrice: productData.price,
        rawImageUrl: productData.imageUrl,
        hasDescription: !!productData.description
      });
    } catch (jsonError) {
      // Último recurso: busca por JSON no texto
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Resposta não contém JSON válido: " + text.substring(0, 200));
      }
      productData = JSON.parse(jsonMatch[0]);
    }

    // Valida campos obrigatórios
    if (!productData.name || typeof productData.name !== 'string' || productData.name.trim().length === 0) {
      throw new Error("Nome do produto não encontrado ou inválido");
    }

    // Normaliza preços com validação rigorosa
    let price: number | null = null;
    if (productData.price !== null && productData.price !== undefined) {
      let priceStr = String(productData.price);

      // Remove caracteres não numéricos exceto ponto e vírgula
      priceStr = priceStr.replace(/[^\d.,]/g, '');

      // Converte formato brasileiro (8.399,00 -> 8399.00)
      if (priceStr.includes(',') && priceStr.includes('.')) {
        // Formato: 8.399,00
        priceStr = priceStr.replace(/\./g, '').replace(',', '.');
      } else if (priceStr.includes(',') && !priceStr.includes('.')) {
        // Formato: 8399,00
        priceStr = priceStr.replace(',', '.');
      }

      const priceNum = parseFloat(priceStr);

      // Validação: preço deve ser realista para produtos de e-commerce
      if (!isNaN(priceNum) && priceNum >= 1 && priceNum < 1000000) {
        price = priceNum;

        // LOG para debug de preços suspeitos
        if (priceNum < 50) {
          console.warn(`[Gemini] ⚠️ Preço muito baixo detectado: R$ ${priceNum} - verifique se está correto`);
        }
      } else {
        console.warn(`[Gemini] ⚠️ Preço inválido ignorado: "${productData.price}" -> ${priceNum}`);
      }
    }

    let originalPrice: number | null = null;
    if (productData.originalPrice !== null && productData.originalPrice !== undefined) {
      const origPriceNum = parseFloat(String(productData.originalPrice).replace(',', '.'));
      if (!isNaN(origPriceNum) && origPriceNum > 0 && origPriceNum < 1000000) {
        originalPrice = origPriceNum;
      }
    }

    // Valida URL da imagem
    let imageUrl: string | null = null;
    if (productData.imageUrl && 
        typeof productData.imageUrl === 'string' && 
        productData.imageUrl.startsWith('http')) {
      imageUrl = productData.imageUrl;
    } else {
      imageUrl = extractFallbackImage(html);
    }

    const result_product = {
      name: productData.name.trim(),
      price: price,
      originalPrice: originalPrice,
      imageUrl: imageUrl,
      store: store,
      description: productData.description && typeof productData.description === 'string' 
        ? productData.description.trim().substring(0, 500) 
        : null,
      category: productData.category && typeof productData.category === 'string'
        ? productData.category.trim()
        : extractCategoryFromUrl(url),
      brand: productData.brand && typeof productData.brand === 'string'
        ? productData.brand.trim()
        : null
    };

    console.log(`[Gemini] ✅ Produto extraído com SUCESSO:`, {
      name: result_product.name,
      price: result_product.price,
      imageUrl: result_product.imageUrl,
      hasImage: !!result_product.imageUrl,
      hasDescription: !!result_product.description,
      brand: result_product.brand,
      category: result_product.category,
      store: store
    });

    // LOG CRÍTICO: Verifica se dados essenciais estão faltando
    if (!result_product.price) {
      console.error(`[Gemini] 🚨 PROBLEMA: Preço não foi extraído! Raw price:`, productData.price);
    }
    if (!result_product.imageUrl || result_product.imageUrl.includes('placeholder')) {
      console.error(`[Gemini] 🚨 PROBLEMA: Imagem não foi extraída! Raw imageUrl:`, productData.imageUrl);
    }

    return result_product;

  } catch (error: any) {
    console.error(`[Gemini] ❌ Erro na análise:`, error.message);
    throw error;
  }
}

/**
 * TENTATIVA #3: Fallback com seletores CSS
 */
function extractViaCSSelectors(url: string, html: string): ProductInfo {
  console.log(`[CSS-Fallback] 🔧 Iniciando extração com seletores CSS...`);

  const $ = cheerio.load(html);
  let name = 'Produto encontrado';
  let price: number | null = null;
  let imageUrl: string | null = null;
  let description: string | null = null;
  let brand: string | null = null;

  // Extrai nome com seletores hierárquicos
  const nameSelectors = [
    'h1[class*="title"], h1[class*="name"], h1[class*="product"]',
    'h1:not([class*="cart"]):not([class*="button"])',
    '[class*="product-title"], [class*="product-name"]',
    '[data-testid*="title"], [data-testid*="name"]',
    'title'
  ];

  // Simplified approach: Only filter by element type, not keywords
  // Gemini AI handles the heavy lifting - CSS fallback is last resort
  for (const selector of nameSelectors) {
    const element = $(selector).first();
    const nameText = element.text().trim();
    const tagName = element.prop('tagName')?.toLowerCase();
    
    // Simple validation: proper length + not a button/link element
    const isValid = nameText && 
                    nameText.length > 3 && 
                    nameText.length < 200 &&
                    tagName !== 'button' &&
                    tagName !== 'a' &&
                    !element.is('button, a, [role="button"]');
    
    if (isValid) {
      name = nameText;
      console.log(`[CSS-Fallback] 📛 Nome encontrado via ${selector}: ${name}`);
      break;
    }
  }

  // Extrai preço com seletores hierárquicos (Amazon específicos incluídos)
  const priceSelectors = [
    // Amazon específicos
    '.a-price-whole, .a-price .a-offscreen',
    '#apex_desktop .a-price .a-offscreen',
    '.a-price-current .a-price-fraction',

    // Genéricos
    '[class*="price"]:not([class*="original"]):not([class*="old"])',
    '[data-testid*="price"]',
    '[class*="valor"]',
    '[class*="cost"]',
    '[data-price]',
    '.price, .valor, .preco'
  ];

  for (const selector of priceSelectors) {
    const priceElements = $(selector);
    for (let i = 0; i < priceElements.length; i++) {
      const priceText = $(priceElements[i]).text();
      const priceMatch = priceText.match(/[\d.,]+/);
      if (priceMatch) {
        // Normaliza formato brasileiro (1.234,56 -> 1234.56)
        let priceStr = priceMatch[0];
        if (priceStr.includes(',') && priceStr.includes('.')) {
          priceStr = priceStr.replace(/\./g, '').replace(',', '.');
        } else if (priceStr.includes(',') && !priceStr.includes('.')) {
          priceStr = priceStr.replace(',', '.');
        }

        const priceValue = parseFloat(priceStr);
        if (!isNaN(priceValue) && priceValue > 0 && priceValue < 1000000) {
          price = priceValue;
          console.log(`[CSS-Fallback] 💰 Preço encontrado via ${selector}: R$ ${price}`);
          break;
        }
      }
    }
    if (price) break;
  }

  // Extrai imagem
  imageUrl = extractFallbackImage(html);

  // Extrai descrição
  const descSelectors = [
    '[class*="description"], [class*="desc"]', 
    'meta[name="description"]',
    '[class*="detail"], [class*="info"]'
  ];

  for (const selector of descSelectors) {
    const descText = $(selector).first().text().trim() || $(selector).attr('content');
    if (descText && descText.length > 10) {
      description = descText.substring(0, 300);
      break;
    }
  }

  // Extrai marca
  const brandSelectors = [
    '[class*="brand"], [class*="marca"]',
    'meta[property="product:brand"]'
  ];

  for (const selector of brandSelectors) {
    const brandText = $(selector).first().text().trim() || $(selector).attr('content');
    if (brandText && brandText.length > 1 && brandText.length < 50) {
      brand = brandText;
      break;
    }
  }

  console.log(`[CSS-Fallback] 📊 Extração concluída:`, {
    name: name,
    price: price,
    hasImage: !!imageUrl,
    hasDescription: !!description,
    hasBrand: !!brand
  });

  return {
    name: name,
    price: price,
    originalPrice: null,
    imageUrl: imageUrl,
    store: extractStoreFromUrl(url),
    description: description,
    category: extractCategoryFromUrl(url),
    brand: brand
  };
}

/**
 * Limpa HTML para análise mais eficiente pela Gemini
 */
function cleanHtmlForGeminiAnalysis(html: string): string {
  try {
    const $ = cheerio.load(html);

    // Remove elementos desnecessários
    $('script, style, noscript, iframe, svg, nav, footer, header').remove();

    // Foca em elementos relevantes para produtos, priorizando preços
    const relevantSelectors = [
      // PREÇOS (PRIORIDADE MÁXIMA)
      '[class*="price"]:not([class*="old"]):not([class*="original"])',
      '[class*="valor"]:not([class*="antigo"])',
      '[class*="cost"], [class*="preco"]',
      '[data-testid*="price"], [data-price]',
      '.price, .valor, .preco, .cost',
      '[id*="price"], [id*="valor"]',

      // Títulos e nomes
      'h1, h2, h3',
      '[class*="title"], [class*="name"], [class*="titulo"]',

      // Produto geral
      '[class*="product"], [class*="item"]',

      // Descrições
      '[class*="description"], [class*="desc"], [class*="detail"]',

      // Marcas
      '[class*="brand"], [class*="marca"]',

      // Imagens
      'img[src*="product"], img[alt*="product"]',

      // Meta tags importantes
      'meta[property*="og:"], meta[name="description"]'
    ].join(', ');

    let relevantContent = '';
    $(relevantSelectors).each((_, element) => {
      const $el = $(element);
      const text = $el.text().trim();
      const src = $el.attr('src');
      const alt = $el.attr('alt');
      const content = $el.attr('content');

      if (text && text.length > 2 && text.length < 500) {
        relevantContent += `${text}\n`;
      }
      if (src && src.startsWith('http')) {
        relevantContent += `IMG: ${src}\n`;
      }
      if (alt && alt.length > 2) {
        relevantContent += `ALT: ${alt}\n`;
      }
      if (content && content.length > 2) {
        relevantContent += `META: ${content}\n`;
      }
    });

    // Limita o tamanho para otimizar a API
    const maxLength = 12000;
    if (relevantContent.length > maxLength) {
      relevantContent = relevantContent.substring(0, maxLength) + '\n[CONTEÚDO TRUNCADO...]';
    }

    return relevantContent || html.substring(0, maxLength);
  } catch (error: any) {
    console.warn(`[Gemini] ⚠️ Erro ao limpar HTML:`, error.message);
    return html.substring(0, 12000);
  }
}

/**
 * Extrai imagem com múltiplas estratégias
 */
function extractFallbackImage(html: string): string | null {
  try {
    const $ = cheerio.load(html);

    // Prioridade de seletores para imagem
    const imageSelectors = [
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      'img[class*="product"][class*="main"], img[class*="produto"][class*="principal"]',
      'img[class*="product"]:not([class*="thumb"]):not([class*="mini"])',
      'img[alt*="product"], img[alt*="produto"]',
      'img[src*="product"], img[src*="produto"]'
    ];

    for (const selector of imageSelectors) {
      const imgSrc = $(selector).attr('content') || $(selector).attr('src');
      if (imgSrc && imgSrc.startsWith('http') && !imgSrc.includes('placeholder')) {
        console.log(`[FallbackImage] 🖼️ Imagem encontrada via ${selector}: ${imgSrc}`);
        return imgSrc;
      }
    }

    // Se não encontrar, usa primeira imagem http válida
    const firstImg = $('img[src^="http"]').first().attr('src');
    if (firstImg && !firstImg.includes('placeholder')) {
      return firstImg;
    }

    return 'https://via.placeholder.com/400x400/e0e5ec/6c757d?text=Sem+Imagem';
  } catch (error: any) {
    console.warn(`[FallbackImage] ⚠️ Erro ao extrair imagem:`, error.message);
    return 'https://via.placeholder.com/400x400/e0e5ec/6c757d?text=Erro+Imagem';
  }
}

/**
 * Extrai nome da loja da URL
 */
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
      'netshoes.com.br': 'Netshoes',
      'kabum.com.br': 'KaBuM',
      'pichau.com.br': 'Pichau',
      'shopee.com': 'Shopee'
    };

    for (const [domain, name] of Object.entries(storeMap)) {
      if (hostname.includes(domain)) return name;
    }

    return hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
  } catch {
    return 'Loja Online';
  }
}

/**
 * Extrai categoria da URL
 */
function extractCategoryFromUrl(url: string): string {
  const categoryMap: Record<string, string> = {
    'celular': 'Eletrônicos',
    'smartphone': 'Eletrônicos',
    'iphone': 'Eletrônicos',
    'notebook': 'Eletrônicos',
    'computador': 'Eletrônicos',
    'tenis': 'Roupas e Acessórios',
    'roupa': 'Roupas e Acessórios',
    'camisa': 'Roupas e Acessórios',
    'casa': 'Casa e Decoração',
    'decoracao': 'Casa e Decoração',
    'movel': 'Casa e Decoração',
    'livro': 'Livros e Mídia',
    'jogo': 'Games',
    'game': 'Games',
    'esporte': 'Esportes e Lazer',
    'fitness': 'Esportes e Lazer'
  };

  const urlLower = url.toLowerCase();
  for (const [keyword, category] of Object.entries(categoryMap)) {
    if (urlLower.includes(keyword)) {
      return category;
    }
  }

  return 'Outros';
}
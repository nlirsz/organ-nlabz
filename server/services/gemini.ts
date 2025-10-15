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

      // Normaliza URL da imagem se presente (JSON-LD pode retornar string, array ou objeto)
      let imageUrl: string | null = null;
      if (jsonLdData.imageUrl) {
        const imgData: any = jsonLdData.imageUrl; // Type-safe cast para lidar com Schema.org variants

        if (typeof imgData === 'string') {
          imageUrl = imgData;
        } else if (Array.isArray(imgData) && imgData.length > 0) {
          // Pega primeira imagem do array
          imageUrl = typeof imgData[0] === 'string' 
            ? imgData[0] 
            : imgData[0]?.url || null;
        } else if (typeof imgData === 'object' && imgData.url) {
          // Objeto ImageObject do Schema.org
          imageUrl = imgData.url;
        }

        // Normaliza se não for absoluta
        if (imageUrl && typeof imageUrl === 'string' && !imageUrl.startsWith('http')) {
          imageUrl = normalizeImageUrl(imageUrl, url);
          console.log(`[ExtractInfo] 🔄 Imagem JSON-LD normalizada: ${imageUrl.substring(0, 80)}...`);
        }
      }

      return {
        name: jsonLdData.name,
        price: jsonLdData.price,
        originalPrice: jsonLdData.originalPrice || null,
        imageUrl: imageUrl || extractFallbackImage(html, url),
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

    // Detecta se é uma página de bloqueio/redirecionamento
    const isBlockedPage = html.includes('bm-verify') || 
                          html.includes('refresh') || 
                          html.length < 5000 ||
                          html.includes('noscript') && html.length < 10000;

    if (isBlockedPage) {
      console.log(`[Gemini] 🚫 Página de bloqueio detectada - usando extração via URL`);
      return await extractFromUrlWithGemini(url, store);
    }

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
    if (productData.imageUrl && typeof productData.imageUrl === 'string') {
      // Normaliza se for relativa
      if (!productData.imageUrl.startsWith('http')) {
        imageUrl = normalizeImageUrl(productData.imageUrl, url);
      } else {
        imageUrl = productData.imageUrl;
      }
    } else {
      imageUrl = extractFallbackImage(html, url);
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

  // Extrai nome com seletores hierárquicos e validação aprimorada
  const nameSelectors = [
    'h1[class*="title"], h1[class*="name"], h1[class*="product"]',
    'h1[itemprop="name"], h1[data-testid*="product"]',
    '[class*="product-title"], [class*="product-name"]',
    '[class*="ProductTitle"], [class*="ProductName"]',
    '[data-testid*="title"], [data-testid*="name"]',
    'h1:not([class*="cart"]):not([class*="button"])',
    'meta[property="og:title"]',
    'title'
  ];

  // Lista de palavras que indicam que NÃO é um nome de produto
  const invalidKeywords = [
    'carrinho', 'cart', 'checkout', 'login', 'entrar', 'cadastro',
    'seu pedido', 'meu pedido', 'minha conta', 'finalizar compra',
    'adicionar ao', 'comprar agora', 'sign in', 'register'
  ];

  for (const selector of nameSelectors) {
    const element = $(selector).first();
    let nameText = element.text().trim();
    const tagName = element.prop('tagName')?.toLowerCase();

    // Para meta tags, usa o atributo content
    if (tagName === 'meta') {
      nameText = element.attr('content') || '';
    }

    // Validação rigorosa do nome
    const hasInvalidKeyword = invalidKeywords.some(keyword => 
      nameText.toLowerCase().includes(keyword)
    );

    const isValid = nameText && 
                    nameText.length >= 3 &&  // Mínimo 3 caracteres (aceita "PS5", "SSD", etc.)
                    nameText.length < 200 &&
                    !hasInvalidKeyword &&
                    tagName !== 'button' &&
                    tagName !== 'a' &&
                    !element.is('button, a, [role="button"]') &&
                    !/^(home|início|loja|store|shop)$/i.test(nameText); // Não aceita títulos genéricos

    if (isValid) {
      name = nameText;
      console.log(`[CSS-Fallback] 📛 Nome encontrado via ${selector}: ${name}`);
      break;
    }
  }

  // Se não encontrou nome válido, tenta extrair da URL
  if (name === 'Produto encontrado' && url) {
    const urlName = extractProductNameFromUrl(url);
    if (urlName && urlName !== 'Produto' && urlName.length >= 3) {
      name = urlName;
      console.log(`[CSS-Fallback] 📛 Nome extraído da URL: ${name}`);
    }
  }

  // Extrai preço com seletores hierárquicos e validação melhorada
  const priceSelectors = [
    // Meta tags (mais confiáveis)
    'meta[property="product:price:amount"]',
    'meta[property="og:price:amount"]',

    // Amazon específicos
    '.a-price-whole, .a-price .a-offscreen',
    '#apex_desktop .a-price .a-offscreen',
    '.a-price-current',

    // Atributos data com preço
    '[data-price]',
    '[data-product-price]',
    '[itemprop="price"]',

    // Classes comuns de preço (excluindo antigas/originais)
    '[class*="price"]:not([class*="original"]):not([class*="old"]):not([class*="was"]):not([class*="from"])',
    '[class*="Price"]:not([class*="Original"]):not([class*="Old"]):not([class*="Was"])',
    '[data-testid*="price"]:not([data-testid*="original"])',
    '[class*="valor"]:not([class*="antigo"])',
    '[class*="preco"]:not([class*="antigo"])',

    // Genéricos
    '.price, .valor, .preco, .cost'
  ];

  // Palavras que indicam que o preço NÃO é o preço atual
  const invalidPriceKeywords = ['de:', 'era:', 'was:', 'original:', 'antigo:', 'from:', 'antes:'];

  for (const selector of priceSelectors) {
    const priceElements = $(selector);
    for (let i = 0; i < priceElements.length; i++) {
      const $el = $(priceElements[i]);
      let priceText = $el.text().trim();

      // Para meta tags e data attributes, usa o valor do atributo
      if ($el.is('[data-price]')) {
        priceText = $el.attr('data-price') || priceText;
      } else if ($el.is('[data-product-price]')) {
        priceText = $el.attr('data-product-price') || priceText;
      } else if ($el.is('meta')) {
        priceText = $el.attr('content') || '';
      }

      // Ignora preços com palavras-chave inválidas
      const hasInvalidKeyword = invalidPriceKeywords.some(keyword => 
        priceText.toLowerCase().includes(keyword)
      );

      if (hasInvalidKeyword) continue;

      // Extrai números do texto
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
        // Validação: preço realista para e-commerce (entre R$ 1 e R$ 1 milhão)
        if (!isNaN(priceValue) && priceValue >= 1 && priceValue < 1000000) {
          price = priceValue;
          console.log(`[CSS-Fallback] 💰 Preço encontrado via ${selector}: R$ ${price}`);
          break;
        }
      }
    }
    if (price) break;
  }

  // Extrai imagem (passa a URL para normalização)
  imageUrl = extractFallbackImage(html, url);

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
 * Extrai informações do produto usando apenas a URL com Gemini Search
 */
async function extractFromUrlWithGemini(url: string, store: string): Promise<ProductInfo | null> {
  try {
    console.log(`[Gemini URL] 🔍 Extraindo informações via busca: ${url}`);

    const prompt = `
Você é um assistente especializado em e-commerce. Analise esta URL de produto e retorne as informações do produto.

URL: ${url}
Loja: ${store}

IMPORTANTE:
1. Use sua capacidade de busca para encontrar informações sobre este produto específico
2. Extraia nome, preço, descrição, categoria e marca do produto
3. Para imagens, tente encontrar a URL da imagem principal do produto
4. Se não encontrar informações completas, use os dados da URL para inferir o nome do produto

REGRAS:
- Preço deve ser um número decimal (ex: 279.00, 309.00)
- Nome deve ser limpo e descritivo, sem códigos
- Se encontrar "CAMISA ESTRUTURA EASY CARE" na URL, o nome é "Camisa Estrutura Easy Care"
- Se encontrar "CALCA DE CINTURA JOGGER CONFORT" na URL, o nome é "Calça de Cintura Jogger Confort"

Retorne APENAS um JSON válido no formato:
{
  "name": "Nome do produto",
  "price": 299.99,
  "originalPrice": null,
  "imageUrl": "https://...",
  "description": "Descrição do produto",
  "brand": "Marca",
  "category": "Categoria"
}

Se não conseguir encontrar o preço, retorne null no campo price.
`;

    const result = await geminiWrapper.generateContent(prompt, {
      model: "gemini-1.5-flash",
      temperature: 0.1,
      maxTokens: 1000,
      timeout: 30000,
      priority: 'normal'
    });

    if (!result.response || !result.response.text()) {
      console.log(`[Gemini URL] ⚠️ Resposta vazia`);
      return null;
    }

    const text = result.response.text();
    console.log(`[Gemini URL] 📥 Resposta recebida:`, text.substring(0, 300));

    // Parse JSON
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/```json\n/, '').replace(/\n```$/, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/```\n/, '').replace(/\n```$/, '');
    }

    const productData = JSON.parse(cleanText);

    // Valida dados básicos
    if (!productData.name || productData.name.length < 3) {
      console.log(`[Gemini URL] ⚠️ Nome inválido, usando fallback da URL`);
      productData.name = extractProductNameFromUrl(url);
    }

    // Normaliza preço
    let price: number | null = null;
    if (productData.price !== null && productData.price !== undefined) {
      const priceStr = String(productData.price).replace(/[^\d.,]/g, '');
      const normalized = priceStr.includes(',') ? priceStr.replace(/\./g, '').replace(',', '.') : priceStr;
      const priceNum = parseFloat(normalized);
      if (!isNaN(priceNum) && priceNum >= 1 && priceNum < 1000000) {
        price = priceNum;
      }
    }

    const result_product = {
      name: productData.name.trim(),
      price: price,
      originalPrice: null,
      imageUrl: productData.imageUrl || null,
      store: store,
      description: productData.description?.trim()?.substring(0, 500) || null,
      category: productData.category?.trim() || extractCategoryFromUrl(url),
      brand: productData.brand?.trim() || null
    };

    console.log(`[Gemini URL] ✅ Produto extraído:`, {
      name: result_product.name,
      price: result_product.price,
      hasImage: !!result_product.imageUrl
    });

    return result_product;

  } catch (error: any) {
    console.error(`[Gemini URL] ❌ Erro:`, error.message);
    return null;
  }
}

/**
 * Extrai nome do produto a partir da URL
 */
function extractProductNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Remove extensões e parâmetros
    let productSlug = pathname.split('/').filter(s => s.length > 3).pop() || '';
    productSlug = productSlug.replace(/\.html.*$/, '').replace(/\?.*$/, '');
    
    // Remove códigos de produto (ex: p07545715, p07484303)
    productSlug = productSlug.replace(/[-_]?p\d+$/i, '');
    
    // Converte para nome legível
    const name = productSlug
      .split('-')
      .filter(word => word.length > 1)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    return name || 'Produto';
  } catch {
    return 'Produto';
  }
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
 * Normaliza URL de imagem (relativa, protocol-relative ou absoluta) para URL absoluta
 */
function normalizeImageUrl(imgUrl: string, baseUrl: string): string {
  try {
    // Se já é absoluta, retorna como está
    if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) {
      return imgUrl;
    }

    // Se é protocol-relative (//cdn.example.com/img.jpg)
    if (imgUrl.startsWith('//')) {
      const protocol = baseUrl.startsWith('https') ? 'https:' : 'http:';
      return protocol + imgUrl;
    }

    // Se é relativa, combina com a URL base
    if (imgUrl.startsWith('/')) {
      const urlObj = new URL(baseUrl);
      return `${urlObj.protocol}//${urlObj.host}${imgUrl}`;
    }

    // Relativa sem barra inicial
    const urlObj = new URL(baseUrl);
    const pathParts = urlObj.pathname.split('/').slice(0, -1);
    return `${urlObj.protocol}//${urlObj.host}${pathParts.join('/')}/${imgUrl}`;
  } catch (error) {
    console.warn(`[NormalizeImageUrl] ⚠️ Erro ao normalizar URL: ${imgUrl}`, error);
    return imgUrl;
  }
}

/**
 * Extrai imagem com múltiplas estratégias
 */
function extractFallbackImage(html: string, baseUrl?: string): string | null {
  try {
    const $ = cheerio.load(html);

    // Prioridade de seletores para imagem (ordem de confiabilidade)
    const imageSelectors = [
      // Meta tags (mais confiáveis)
      'meta[property="og:image"]',
      'meta[property="og:image:secure_url"]',
      'meta[name="twitter:image"]',
      'meta[itemprop="image"]',

      // Imagens com itemprop (Schema.org)
      'img[itemprop="image"]',

      // AMAZON ESPECÍFICO (prioridade máxima para produto)
      'img[data-a-dynamic-image]', // Imagem principal da Amazon
      'img#landingImage', // ID da imagem principal
      'img.a-dynamic-image', // Classe principal
      
      // Classes específicas de produto
      'img[class*="ProductImage"], img[class*="product-image"]',
      'img[class*="product"][class*="main"], img[class*="produto"][class*="principal"]',
      'img[class*="product"]:not([class*="thumb"]):not([class*="mini"]):not([class*="related"])',

      // Data attributes
      'img[data-testid*="product-image"]',
      'img[data-image-role="main"]',

      // Alt text
      'img[alt*="product"], img[alt*="produto"]',

      // Src contém product (mas não /images/I/ da Amazon que são produtos reais)
      'img[src*="/images/I/"]', // Amazon product images
      'img[src*="product"], img[src*="produto"]'
    ];

    // Palavras que indicam que a imagem NÃO é a principal
    const invalidImageKeywords = [
      'logo', 'icon', 'banner', 'ad', 'advertisement', 
      'thumbnail', 'thumb', 'mini', 'small', 'related',
      'similar', 'sponsored', 'promo', 'badge'
    ];

    for (const selector of imageSelectors) {
      const imgElement = $(selector).first();
      let imgUrl = imgElement.attr('content') || imgElement.attr('src') || imgElement.attr('data-src') || imgElement.attr('data-lazy');

      // Para Amazon: extrai URL de alta resolução do atributo data-a-dynamic-image
      if (!imgUrl && selector.includes('data-a-dynamic-image')) {
        const dynamicImageData = imgElement.attr('data-a-dynamic-image');
        if (dynamicImageData) {
          try {
            const imageObj = JSON.parse(dynamicImageData);
            const imageUrls = Object.keys(imageObj);
            if (imageUrls.length > 0) {
              // Pega a primeira URL (geralmente a de maior resolução)
              imgUrl = imageUrls[0];
              console.log(`[FallbackImage] 🔍 Imagem Amazon extraída de data-a-dynamic-image: ${imgUrl}`);
            }
          } catch (e) {
            console.warn(`[FallbackImage] ⚠️ Erro ao parsear data-a-dynamic-image`);
          }
        }
      }

      // Filtros RIGOROSOS para ignorar imagens que não são de produto
      const isInvalidImage = imgUrl && (
        imgUrl.includes('placeholder') ||
        imgUrl.includes('loading') ||
        imgUrl.includes('sprite') ||
        imgUrl.includes('nav-sprite') || // Sprites de navegação
        imgUrl.includes('gno/sprites') || // Sprites globais da Amazon
        imgUrl.includes('nav-') ||
        imgUrl.includes('icon') ||
        imgUrl.includes('logo') ||
        imgUrl.includes('/G/') || // Sprites da Amazon geralmente estão em /G/
        imgUrl.includes('_CB') || // IDs de cache da Amazon em sprites
        imgUrl.match(/\.(png|jpg|jpeg|webp)\?.*sprite/i) || // Query params com sprite
        imgUrl.match(/sprite.*\.(png|jpg|jpeg|webp)/i) // Nome contém sprite
      );

      if (imgUrl && !isInvalidImage) {
        console.log(`[FallbackImage] 🖼️ Imagem encontrada via ${selector}: ${imgUrl.substring(0, 100)}...`);

        // Normaliza a URL da imagem
        const normalizedUrl = normalizeImageUrl(imgUrl, baseUrl || ''); // Passa baseUrl como string vazia se for undefined
        return normalizedUrl;
      }
    }

    // Se não encontrar, tenta primeira imagem com validações (aceita relativas também)
    const allImages = $('img[src]');
    for (let i = 0; i < allImages.length; i++) {
      const $img = $(allImages[i]);
      let src = $img.attr('src');

      if (!src) continue;

      // Normaliza URL se necessário
      if (baseUrl && !src.startsWith('http')) {
        src = normalizeImageUrl(src, baseUrl);
      }

      if (!src.startsWith('http') || src.includes('placeholder') || src.includes('logo') || src.includes('icon')) {
        continue;
      }

      const width = parseInt($img.attr('width') || '0');
      const height = parseInt($img.attr('height') || '0');

      // Aceita imagens sem dimensões especificadas ou com dimensões razoáveis
      if ((width === 0 || width >= 200) && (height === 0 || height >= 200)) {
        console.log(`[FallbackImage] 🖼️ Imagem genérica encontrada: ${src.substring(0, 80)}...`);
        return src;
      }
    }

    console.log(`[FallbackImage] ⚠️ Nenhuma imagem válida encontrada, usando placeholder`);
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
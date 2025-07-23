import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY not found in environment variables");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const generationConfig = {
  temperature: 0.2,
  responseMimeType: "application/json",
};

export interface ScrapedProduct {
  name: string;
  price?: number;
  originalPrice?: number;
  imageUrl?: string;
  store?: string;
  description?: string;
  category?: string;
  brand?: string;
}

function normalizePrice(price: any): number | null {
  if (typeof price === 'number') return price;
  if (typeof price !== 'string') return null;

  // Remove símbolos de moeda e espaços
  let priceStr = price.replace(/[R$€£¥\s]/g, '');

  // Para preços brasileiros (R$ 1.234,56), converte para formato americano
  if (priceStr.includes(',')) {
    // Se tem vírgula, assume formato brasileiro
    const parts = priceStr.split(',');
    if (parts.length === 2) {
      // Remove pontos como separadores de milhares
      const integerPart = parts[0].replace(/\./g, '');
      const decimalPart = parts[1];
      priceStr = `${integerPart}.${decimalPart}`;
    }
  }

  const priceNum = parseFloat(priceStr);
  return isNaN(priceNum) ? null : priceNum;
}

function optimizeImageUrl(imageUrl: string, domain: string): string {
  if (!imageUrl || !imageUrl.startsWith('http')) {
    return 'https://via.placeholder.com/400x400/e0e5ec/6c757d?text=Produto';
  }

  try {
    const url = new URL(imageUrl);

    // Otimizações específicas por domínio
    if (domain.includes('amazon.com') && url.hostname.includes('media-amazon.com')) {
      let pathname = url.pathname;

      // Otimiza para melhor compatibilidade (SX679 é mais estável que SL1500)
      pathname = pathname
        .replace(/_AC_SL\d+_/g, '_AC_SX679_')
        .replace(/_AC_UY\d+_/g, '_AC_UY400_')
        .replace(/_AC_UL\d+_/g, '_AC_SX679_');

      return `https://${url.hostname}${pathname}`;
    }

    if (domain.includes('mercadolivre.com') && url.hostname.includes('mlstatic.com')) {
      let pathname = url.pathname;

      // CRÍTICO: Remove .webp e substitui por .jpg para compatibilidade máxima
      pathname = pathname
        .replace(/\.webp$/i, '.jpg')
        .replace(/-I\.jpg$/i, '-O.jpg')    // 500px → 1000px
        .replace(/-W\.jpg$/i, '-O.jpg')    // webp retina → jpg alta
        .replace(/-F\.jpg$/i, '-W.jpg')    // mantém alta resolução
        .replace(/-S\.jpg$/i, '-O.jpg')    // small → original
        .replace(/-T\.jpg$/i, '-O.jpg');   // tiny → original

      return `https://${url.hostname}${pathname}`;
    }

    // Para outros domínios, retorna a URL original se for válida
    return imageUrl;

  } catch (error) {
    console.warn(`[Image Optimizer] Erro ao processar URL: ${imageUrl}`, error);
    return 'https://via.placeholder.com/400x400/e0e5ec/6c757d?text=Produto';
  }
}

async function scrapeByAnalyzingHtml(productUrl: string, htmlContent: string): Promise<ScrapedProduct> {
  console.log(`[Gemini HTML Mode] Starting for: ${productUrl}`);

  const domain = new URL(productUrl).hostname;

  const prompt = `Analise esta página de produto brasileira e extraia informações estruturadas.

URL: ${productUrl}
Domínio: ${domain}

REGRAS CRÍTICAS PARA PREÇO:
${getSpecificPriceRules(domain)}

${domain.includes('amazon.com.br') ? `
⚠️ INSTRUÇÕES CRÍTICAS PARA AMAZON BRASIL:

PREÇO (OBRIGATÓRIO):
- PRIORIDADE 1: .a-price-current .a-offscreen (texto oculto com preço completo)
- PRIORIDADE 2: span.a-price-whole + span.a-price-fraction dentro de .a-price
- PRIORIDADE 3: #price_inside_buybox .a-price-current
- PRIORIDADE 4: span[data-a-offscreen] com texto de preço
- PRIORIDADE 5: meta[property="product:price:amount"]
- FORMATO: "R$ 4.859,10" → 4859.10 (remova R$ e converta vírgula para ponto)
- IGNORE: preços com "Prime", "frete", "parcelamento", "economia", "a partir de"

IMAGEM (OBRIGATÓRIA):
- PRIORIDADE 1: meta[property="og:image"]
- PRIORIDADE 2: #landingImage[src]
- PRIORIDADE 3: .a-dynamic-image[src] da primeira imagem
- VALIDAÇÃO: URL deve começar com https:// e conter "media-amazon.com"
` : ''}

${domain.includes('mercadolivre.com') ? `
⚠️ INSTRUÇÕES CRÍTICAS PARA MERCADO LIVRE:

PREÇO (ALTÍSSIMA PRIORIDADE):
- PRIORIDADE 1: .andes-money-amount__fraction dentro de [data-testid="price-part"]
- PRIORIDADE 2: .price-tag-fraction (classe principal de preço)
- PRIORIDADE 3: span[data-testid="price-part-integer"] + span[data-testid="price-part-decimal"]
- PRIORIDADE 4: .ui-pdp-price__fraction (páginas de produto)
- PRIORIDADE 5: JSON-LD com @type="Product" → "offers" → "price"
- PRIORIDADE 6: meta[property="product:price:amount"]
- COMBINAÇÃO INTELIGENTE: Se encontrar partes separadas, combine corretamente
- FORMATO CORRETO: "8.320" + ",00" = 8320.00 (note a vírgula decimal)
- IGNORE COMPLETAMENTE: preços com "frete", "entrega", "parcelamento", "a partir de", "Pix"
- VALIDAÇÃO: iPhone 16 Pro Max deve estar entre R$ 7000-10000

IMAGEM (OBRIGATÓRIA - MÁXIMA COMPATIBILIDADE):
- PRIORIDADE 1: meta[property="og:image"] - SEMPRE funciona e é otimizada
- PRIORIDADE 2: .ui-pdp-gallery__figure img[src] da primeira imagem da galeria
- PRIORIDADE 3: img[data-zoom] ou img[data-testid="gallery-image"] 
- PRIORIDADE 4: JSON-LD com @type="Product" → "image" (primeira imagem do array)
- PRIORIDADE 5: figure img[src] com maior resolução disponível
- VALIDAÇÃO CRÍTICA: URL deve conter "mlstatic.com" e começar com https://
- OTIMIZAÇÃO CRÍTICA: SEMPRE termine a URL com ".jpg" (NUNCA .webp)
- OTIMIZAÇÃO CRÍTICA: Substitua "-I.webp" por "-O.jpg" (500px webp → 1000px jpg)
- OTIMIZAÇÃO CRÍTICA: Substitua "-W.webp" por "-O.jpg" (webp retina → jpg alta)
- OTIMIZAÇÃO CRÍTICA: Substitua qualquer ".webp" por ".jpg" para compatibilidade
- EXEMPLO PERFEITO: https://http2.mlstatic.com/D_NQ_NP_652166-MLA83590374671_042025-O.jpg
- REJEITE SEMPRE: URLs que terminam com .webp, "/photos///" ou placeholder
- TESTE FINAL: URL deve terminar com .jpg e ser acessível
` : ''}

REGRAS PARA IMAGEM:
${getSpecificImageRules(domain)}

REGRAS GERAIS:
- "name": Título limpo, sem promoções ou texto desnecessário
- "store": Nome da loja extraído da página ou domínio
- "category": Eletrônicos, Roupas, Casa, Livros, Games, Automotivo, Esportes, Outros

HTML (primeiros 80k caracteres):
\`\`\`html
${htmlContent.substring(0, 80000)}
\`\`\`

Retorne JSON válido:
{
  "name": "Nome do produto",
  "price": 3899.99,
  "originalPrice": 4999.99,
  "imageUrl": "https://images.exemplo.com/produto.jpg",
  "store": "Nome da Loja",
  "description": "Descrição",
  "category": "Categoria",
  "brand": "Marca"
}`;

  function getSpecificPriceRules(domain: string): string {
    if (domain.includes('zara.com')) {
      return `- PRIORIDADE 1: Procure por [data-qa-anchor="product.price.current"] ou classes .money-amount, .price
- PRIORIDADE 2: meta[property="product:price:amount"] 
- PRIORIDADE 3: JSON-LD estruturado com @type="Product"
- PRIORIDADE 4: span ou div contendo "€" seguido de números
- Para preços em EUR, converta para BRL multiplicando por 6.2
- Exemplo: se encontrar "89,95 €", calcule: 89.95 * 6.2 = 557.69
- Ignore preços de frete, taxas ou valores promocionais pequenos`;
    }

    if (domain.includes('nike.com')) {
      return `- Procure por classes: .price-current, .product-price, .price-reduced
- Meta tags: meta[property="product:price:amount"]
- Ignore preços de parcelamento ou frete`;
    }

    if (domain.includes('mercadolivre.com')) {
      return `- PRIORIDADE 1: Procure por classes .price-tag-fraction, .price-tag-cents, .andes-money-amount__fraction
- PRIORIDADE 2: span[data-testid="price-part"] ou elementos com "price" no data-testid
- PRIORIDADE 3: JSON-LD com @type="Product" → "offers" → "price"
- PRIORIDADE 4: meta[property="product:price:amount"]
- PRIORIDADE 5: Elementos com classes contendo "price", "valor", "preco"
- Combine parte inteira + centavos se separados
- Formato: R$ 8.320,00 → 8320.00
- IGNORE: preços de frete, parcelamento, ou valores muito baixos (< R$ 10)
- IGNORE: preços com texto "a partir de", "até", "frete"`;
    }

    if (domain.includes('amazon.com')) {
      return `- PRIORIDADE 1: span.a-price-whole + span.a-price-fraction dentro de .a-price[data-a-color="price"]
- PRIORIDADE 2: .a-price-current .a-offscreen (preço em texto oculto)
- PRIORIDADE 3: #price_inside_buybox, #corePrice_feature_div .a-price
- PRIORIDADE 4: JSON-LD com @type="Product" → "offers" → "price"
- PRIORIDADE 5: meta[property="product:price:amount"]
- PRIORIDADE 6: span contendo "R$" seguido de números
- Formato: R$ 3.899,99 → 3899.99
- IGNORE: preços Prime, frete, parcelamento, cashback
- IGNORE: preços com "a partir de", "até", "economia"
- PROCURE: preço principal do produto, não promoções`;
    }

    return `- Procure pelo preço PRINCIPAL do produto individual
- Ignore preços de combo, frete ou parcelamento
- Priorize: preços em destaque, classes "price", "valor", "preco-principal"
- Para sites brasileiros: formato R$ 1.299,99 → 1299.99
- Para sites internacionais: converta para BRL se necessário
- Formato final: números com ponto decimal (ex: 1299.99)`;
  }

  function getSpecificImageRules(domain: string): string {
  if (domain.includes('amazon.com')) {
    return `- PRIORIDADE 1: meta[property="og:image"] (melhor compatibilidade e sempre funciona)
- PRIORIDADE 2: #landingImage[src] (imagem principal interativa do produto)
- PRIORIDADE 3: img[data-a-image-name="landingImage"][src] (imagem principal)
- PRIORIDADE 4: .a-dynamic-image[src] da primeira imagem da galeria
- VALIDAÇÃO CRÍTICA: URL deve começar com https:// e conter media-amazon.com
- OTIMIZAÇÃO INTELIGENTE: Para URLs com "_AC_", use "_AC_SX679_" (melhor compatibilidade que SL1500)
- OTIMIZAÇÃO INTELIGENTE: Para URLs com "_UY", use "_AC_UY400_" (resolução boa e compatível)
- REJEITAR: URLs com "_SL1500_" podem ser muito pesadas
- EXEMPLO ÓTIMO: https://m.media-amazon.com/images/I/51nHt+jXdjL._AC_SX679_.jpg
- TESTE FINAL: Certifique-se que a URL não retorna 403 ou 404`;
  }
  if (domain.includes('mercadolivre.com')) {
    return `- PRIORIDADE 1: meta[property="og:image"] (sempre funciona e é otimizada)
- PRIORIDADE 2: .ui-pdp-gallery__figure img[src] (primeira imagem da galeria principal)
- PRIORIDADE 3: img[data-zoom][src] (imagem com zoom da galeria)
- PRIORIDADE 4: figure.ui-pdp-gallery__figure img[src] (imagem destacada)
- VALIDAÇÃO CRÍTICA: URL deve conter mlstatic.com e começar com https://
- OTIMIZAÇÃO CRÍTICA: SEMPRE substitua ".webp" por ".jpg" para compatibilidade máxima
- OTIMIZAÇÃO CRÍTICA: Substitua "-I.webp" por "-O.jpg" (de 500px webp para 1000px jpg)
- OTIMIZAÇÃO CRÍTICA: Substitua "-W.webp" por "-O.jpg" (de webp retina para jpg alta)
- OTIMIZAÇÃO CRÍTICA: Substitua "-F.webp" por "-W.jpg" (mantém alta resolução sem webp)
- EXEMPLO PERFEITO: https://http2.mlstatic.com/D_NQ_NP_652166-MLA83590374671_042025-O.jpg
- REJEITAR SEMPRE: URLs que terminam com .webp (problemas de compatibilidade)
- TESTE FINAL: Certifique-se que a URL termina com .jpg e não .webp`;
  }
  if (domain.includes('nike.com')) {
    return '- PRIORIDADE: meta[property="og:image"]\n- Alternativa: img[data-qa="product-image"]';
  }
  if (domain.includes('zara.com')) {
    return `- PRIORIDADE 1: meta[property="og:image"] - deve ser URL completa e válida
- PRIORIDADE 2: meta[name="twitter:image"]
- PRIORIDADE 3: JSON-LD procure por "image" dentro de @type="Product"
- PRIORIDADE 4: picture source com maior resolução (procure por width=2048 ou similar)
- PRIORIDADE 5: img[src*="static.zara.net/assets/public"] (prefira URLs com /assets/public/)
- PRIORIDADE 6: img[src*="static.zara.net"] que NÃO contenha "/photos///" (evite URLs com barras triplas)
- IMPORTANTE: URL deve começar com https:// e ser acessível
- IMPORTANTE: Evite URLs que contenham "/photos///" ou barras duplas/triplas
- IMPORTANTE: Prefira URLs que contenham "/assets/public/" e parâmetros como "&w=1500"
- TESTE: Valide se a URL não contém "/photos///" que indica URL quebrada`;
  }
  if (domain.includes('dafiti.com') || domain.includes('netshoes.com')) {
    return '- PRIORIDADE: meta[property="og:image"]\n- Alternativa: .product-image img';
  }
  return '- PRIORIDADE 1: meta[property="og:image"]\n- PRIORIDADE 2: img dentro de divs de produto com maior resolução';
}

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig
  });

  let responseText = result.response.text();

  // Limpa markdown se presente
  if (responseText.includes('```')) {
    responseText = responseText.replace(/```json\s*|\s*```/g, '');
  }

  let jsonData = JSON.parse(responseText);

  if (jsonData && jsonData.price) {
    jsonData.price = normalizePrice(jsonData.price);
  }
  if (jsonData && jsonData.originalPrice) {
    jsonData.originalPrice = normalizePrice(jsonData.originalPrice);
  }

  // Otimiza URLs de imagem para melhor compatibilidade
  if (jsonData && jsonData.imageUrl) {
    jsonData.imageUrl = optimizeImageUrl(jsonData.imageUrl, domain);
  }

  if (!jsonData.store) {
    try {
      const urlObj = new URL(productUrl);
      const hostname = urlObj.hostname.replace('www.', '');
      const storeName = hostname.split('.')[0];
      jsonData.store = storeName.charAt(0).toUpperCase() + storeName.slice(1);
    } catch (e) {
      jsonData.store = "Loja Online";
    }
  }

  return jsonData;
}

async function scrapeBySearching(productUrl: string): Promise<ScrapedProduct> {
  console.log(`[Gemini Search Mode] Starting for: ${productUrl}`);

  const prompt = `Busque informações precisas sobre o produto nesta URL: "${productUrl}".

FOQUE NO PREÇO CORRETO:
- Encontre o preço de venda atual do produto individual
- Ignore preços de frete, parcelamento ou valores promocionais
- Se há desconto, retorne o preço atual e o original
- Para moedas estrangeiras, converta para BRL (EUR * 6.2)
- Formato numérico: 3899.99 (não texto)

FOQUE NA IMAGEM:
- Encontre uma URL de imagem de alta qualidade do produto
- Prefira imagens oficiais do produto, não logos da loja
- URL deve ser acessível publicamente

Retorne JSON com:
{
  "name": "Nome exato do produto",
  "price": 3899.99,
  "originalPrice": null,
  "imageUrl": "https://images.site.com/produto-hd.jpg",
  "store": "Nome da Loja",
  "description": "Descrição técnica",
  "category": "Categoria específica",
  "brand": "Marca do produto"
}

Categorias: Eletrônicos, Roupas, Casa, Livros, Games, Automotivo, Esportes, Outros`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig
  });

  let responseText = result.response.text();

  // Limpa markdown se presente
  if (responseText.includes('```')) {
    responseText = responseText.replace(/```json\s*|\s*```/g, '');
  }

  let jsonData = JSON.parse(responseText);

  if (jsonData && jsonData.price) {
    jsonData.price = normalizePrice(jsonData.price);
  }
  if (jsonData && jsonData.originalPrice) {
    jsonData.originalPrice = normalizePrice(jsonData.originalPrice);
  }

  return jsonData;
}

export async function extractProductInfo(url: string, htmlContent?: string): Promise<ScrapedProduct> {
  console.log(`[Gemini] Starting extraction for: ${url}`);

  try {
    if (htmlContent) {
      try {
        console.log(`[Gemini] Trying HTML method...`);
        const htmlResult = await scrapeByAnalyzingHtml(url, htmlContent);

        if (htmlResult.price && htmlResult.price > 0) {
          console.log(`[Gemini] ✓ Success with HTML method - Price: R$ ${htmlResult.price}`);
          return htmlResult;
        }

        if (htmlResult.name && htmlResult.name !== "Produto Desconhecido") {
          console.log(`[Gemini] HTML method found product without price: ${htmlResult.name}`);

          try {
            console.log(`[Gemini] Trying Search method for price...`);
            const searchResult = await scrapeBySearching(url);

            if (searchResult.price && searchResult.price > 0) {
              console.log(`[Gemini] ✓ Found price with Search method: R$ ${searchResult.price}`);
              return {
                ...htmlResult,
                price: searchResult.price,
                originalPrice: searchResult.originalPrice
              };
            }
          } catch (searchError) {
            console.warn(`[Gemini] Search method failed:`, searchError);
          }

          return htmlResult;
        }
      } catch (htmlError) {
        console.warn(`[Gemini] HTML method failed:`, htmlError);
      }
    }

    try {
      console.log(`[Gemini] Trying Search method as fallback...`);
      const searchResult = await scrapeBySearching(url);

      if (searchResult.price && searchResult.price > 0) {
        console.log(`[Gemini] ✓ Success with Search method - Price: R$ ${searchResult.price}`);
        return searchResult;
      }

      if (searchResult.name && searchResult.name !== "Produto Desconhecido") {
        console.log(`[Gemini] Search method found product without price: ${searchResult.name}`);
        return searchResult;
      }
    } catch (searchError) {
      console.warn(`[Gemini] Search method failed:`, searchError);
    }

    throw new Error("Both extraction methods failed");

  } catch (error) {
    console.error(`[Gemini] Complete extraction failed for ${url}:`, error);

    return {
      name: "Produto extraído da URL: " + url.substring(0, 50) + "...",
      price: null,
      imageUrl: "https://via.placeholder.com/300x300/CCCCCC/666666?text=Produto",
      store: "Loja Online",
      description: "Produto extraído da URL: " + url,
      category: "Outros",
      brand: "N/A"
    };
  }
}
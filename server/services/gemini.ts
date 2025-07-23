
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

PREÇO (OBRIGATÓRIO - VALOR INCORRETO REPORTADO):
- FOQUE no preço principal do produto, não em ofertas ou descontos
- Procure primeiro por: span.a-price-whole + span.a-price-fraction dentro de .a-price[data-a-color="price"]
- Alternativa: .a-price-current .a-offscreen (texto oculto com preço completo)
- Alternativa: #price_inside_buybox .a-price-current
- Formato correto: "R$ 3.899,99" → 3899.99 (remova R$ e converta vírgula para ponto)
- IGNORE: preços com "Prime", "frete", "parcelamento", "economia", "a partir de"
- IGNORE: valores muito baixos (< R$ 100 para eletrônicos)
- VALIDAÇÃO: preço deve ser razoável para o produto (iPhones > R$ 2000)

IMAGEM (OBRIGATÓRIA - SEM IMAGEM REPORTADO):
- PRIORIDADE 1: meta[property="og:image"] - deve ser URL completa e válida
- PRIORIDADE 2: #landingImage[src] (imagem principal do produto)
- PRIORIDADE 3: img[data-a-image-name="landingImage"]
- PRIORIDADE 4: .a-dynamic-image[src] com boa resolução
- VALIDAÇÃO: URL deve começar com https:// e conter "media-amazon.com"
- VALIDAÇÃO: URL deve terminar com .jpg ou .webp
- VALIDAÇÃO: Prefira URLs com "_AC_" para alta qualidade
- EXEMPLO: https://m.media-amazon.com/images/I/616p2eYk-iL._AC_UY218_.jpg
` : ''}

${domain.includes('mercadolivre.com') ? `
⚠️ INSTRUÇÕES CRÍTICAS PARA MERCADO LIVRE:

PREÇO (DEVE SER PRECISO):
- Procure por: .andes-money-amount__fraction ou .price-tag-fraction
- Alternativa: span[data-testid*="price"] ou elementos com "price" no testid
- JSON-LD: @type="Product" → "offers" → "price"
- Formato: "R$ 8.320,00" → 8320.00
- IGNORE: preços de frete, parcelamento, "a partir de"

IMAGEM (OBRIGATÓRIA - IMAGEM INVÁLIDA REPORTADA):
- PRIORIDADE 1: meta[property="og:image"] - validar se URL funciona
- PRIORIDADE 2: img[data-testid="gallery-image"] ou similar
- PRIORIDADE 3: JSON-LD com @type="Product" → "image"
- VALIDAÇÃO CRÍTICA: URL deve começar com https:// e conter "mlstatic.com"
- VALIDAÇÃO CRÍTICA: Prefira URLs terminando em "-W.webp" ou "-O.jpg" (alta resolução)
- VALIDAÇÃO CRÍTICA: Evite URLs terminando em "-I.jpg" (baixa resolução/inválidas)
- SUBSTITUA automaticamente: "-I.jpg" por "-W.webp" para melhor qualidade
- EXEMPLO VÁLIDO: https://http2.mlstatic.com/D_NQ_NP_758297-MLB51362436710_072023-W.webp
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
    if (domain.includes('zara.com')) {
      return `- PRIORIDADE 1: meta[property="og:image"] com URL completa
- PRIORIDADE 2: picture source[media] com maior resolução  
- PRIORIDADE 3: .media__wrapper img ou .product-detail-images img
- PRIORIDADE 4: img[src*="zara.com/assets"] com width=2048 ou similar
- URL deve ser completa (https://) e acessível`;
    }
    
    if (domain.includes('mercadolivre.com')) {
      return `- PRIORIDADE 1: meta[property="og:image"] - deve ser URL completa e válida
- PRIORIDADE 2: .gallery img[src] com maior resolução (prefira URLs com "-W.jpg" ou "-O.jpg")
- PRIORIDADE 3: img[data-zoom] ou img[data-testid="gallery-image"]
- PRIORIDADE 4: JSON-LD com @type="Product" → "image"
- PRIORIDADE 5: img[src*="mlstatic.com"] com dimensões maiores
- VALIDAÇÃO: URL deve começar com https:// e conter mlstatic.com
- VALIDAÇÃO: Prefira URLs que terminem com "-W.webp", "-O.jpg", ou similares (alta resolução)
- VALIDAÇÃO: Evite URLs com "-I.jpg" (baixa resolução)
- EXEMPLO VÁLIDO: https://http2.mlstatic.com/D_NQ_NP_758297-MLB51362436710_072023-W.webp`;
    }
    
    if (domain.includes('amazon.com')) {
      return `- PRIORIDADE 1: meta[property="og:image"] - deve ser URL completa e de alta resolução
- PRIORIDADE 2: #landingImage[src] (imagem principal do produto)
- PRIORIDADE 3: img[data-a-image-name="landingImage"] ou similar
- PRIORIDADE 4: .a-dynamic-image[src] com maior resolução
- PRIORIDADE 5: JSON-LD com @type="Product" → "image"
- PRIORIDADE 6: img[src*="media-amazon.com/images/I"] com "_AC_" (alta qualidade)
- VALIDAÇÃO: URL deve começar com https:// e conter media-amazon.com
- VALIDAÇÃO: Prefira URLs com "_AC_UY218_", "_AC_SX425_", ou dimensões maiores
- VALIDAÇÃO: Evite URLs muito pequenas (< 200px)
- EXEMPLO VÁLIDO: https://m.media-amazon.com/images/I/616p2eYk-iL._AC_UY218_.jpg`;
    }
    
    return `- PRIORIDADE 1: meta[property="og:image"] com URL completa
- PRIORIDADE 2: meta[name="twitter:image"]
- PRIORIDADE 3: img com classes "product-image", "main-image", "zoom"
- URL deve ser completa e acessível (https://)`;
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

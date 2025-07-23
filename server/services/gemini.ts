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

  console.log(`[Price Normalize] Entrada: "${price}"`);

  // Remove símbolos de moeda e espaços extras
  let priceStr = price.replace(/[R$€£¥\s]/g, '').trim();
  
  console.log(`[Price Normalize] Após limpar símbolos: "${priceStr}"`);

  // Para preços brasileiros (formato: 1.234,56 ou 1234,56)
  if (priceStr.includes(',')) {
    const parts = priceStr.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Remove pontos como separadores de milhares da parte inteira
      const integerPart = parts[0].replace(/\./g, '');
      const decimalPart = parts[1].padEnd(2, '0'); // Garante 2 dígitos decimais
      priceStr = `${integerPart}.${decimalPart}`;
      console.log(`[Price Normalize] Formato brasileiro convertido: "${priceStr}"`);
    }
  }
  // Para preços sem vírgula mas com pontos (ex: 1.234 → pode ser 1234.00)
  else if (priceStr.includes('.')) {
    const parts = priceStr.split('.');
    // Se tem só uma parte após o ponto e são 3+ dígitos, provavelmente é separador de milhares
    if (parts.length === 2 && parts[1].length >= 3) {
      priceStr = parts.join('') + '.00';
      console.log(`[Price Normalize] Assumindo separador de milhares: "${priceStr}"`);
    }
  }

  const priceNum = parseFloat(priceStr);
  const finalPrice = isNaN(priceNum) ? null : priceNum;
  
  console.log(`[Price Normalize] Resultado final: ${finalPrice}`);
  
  // Validação de sanidade
  if (finalPrice && (finalPrice < 1 || finalPrice > 50000)) {
    console.warn(`[Price Normalize] Preço suspeito: ${finalPrice}, retornando null`);
    return null;
  }
  
  return finalPrice;
}

function optimizeImageUrl(imageUrl: string, domain: string): string {
  if (!imageUrl || !imageUrl.startsWith('http')) {
    return 'https://via.placeholder.com/400x400/e0e5ec/6c757d?text=Produto';
  }

  try {
    const url = new URL(imageUrl);

    // ESTRATÉGIA: Simula o "copiar link da imagem" do navegador
    // Remove parâmetros desnecessários que podem quebrar a imagem
    const cleanUrl = new URL(imageUrl);

    // Remove parâmetros de tracking e cache que podem causar problemas
    const paramsToRemove = ['cache', 'v', 'timestamp', 't', '_', 'cb', 'nocache'];
    paramsToRemove.forEach(param => cleanUrl.searchParams.delete(param));

    // Otimizações específicas por domínio
    if (domain.includes('amazon.com') && url.hostname.includes('media-amazon.com')) {
      let pathname = cleanUrl.pathname;

      // Otimiza para melhor compatibilidade e carregamento
      pathname = pathname
        .replace(/_AC_SL\d+_/g, '_AC_SX679_')     // Tamanho mais compatível
        .replace(/_AC_UY\d+_/g, '_AC_UY400_')     // Altura otimizada
        .replace(/_AC_UL\d+_/g, '_AC_SX679_')     // Lista para produto
        .replace(/_SL\d+_/g, '_SX679_');          // Remove SL alto

      // Reconstrói URL limpa
      return `https://${url.hostname}${pathname}`;
    }

    if (domain.includes('mercadolivre.com') && url.hostname.includes('mlstatic.com')) {
      let pathname = cleanUrl.pathname;

      // ESTRATÉGIA NOVA: Mantém a URL mais original possível, apenas melhora formato
      // Remove .webp apenas se presente (para compatibilidade máxima)
      if (pathname.includes('.webp')) {
        pathname = pathname.replace(/\.webp$/i, '.jpg');
      }

      // Melhora resolução apenas se for muito baixa
      if (pathname.includes('-I.')) {
        pathname = pathname.replace(/-I\.(jpg|webp)$/i, '-O.jpg');
      } else if (pathname.includes('-S.')) {
        pathname = pathname.replace(/-S\.(jpg|webp)$/i, '-O.jpg');
      }

      // Reconstrói URL sem parâmetros problemáticos
      const finalUrl = `https://${url.hostname}${pathname}`;
      console.log(`[ML Image] Original: ${imageUrl} → Otimizada: ${finalUrl}`);
      return finalUrl;
    }

    // Para outros domínios, remove apenas parâmetros problemáticos
    return cleanUrl.toString();

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

PREÇO (ALTÍSSIMA PRIORIDADE - SIGA EXATAMENTE):
- PRIORIDADE 1: span.a-price-whole seguido de span.a-price-fraction dentro de .a-price[data-a-color="price"]
- PRIORIDADE 2: .a-price-current .a-offscreen (texto oculto completo, ex: "R$ 3.899,99")
- PRIORIDADE 3: #corePrice_feature_div .a-price .a-offscreen
- PRIORIDADE 4: #price_inside_buybox .a-price-current .a-offscreen
- PRIORIDADE 5: span[aria-hidden="true"] dentro de .a-price que contenha "R$"
- PRIORIDADE 6: JSON-LD @type="Product" → "offers" → "price"
- PRIORIDADE 7: meta[property="product:price:amount"]

VALIDAÇÃO CRÍTICA DE PREÇO:
- DEVE estar entre R$ 100,00 e R$ 15.000,00 para ser válido
- FORMATO CORRETO: "R$ 3.899,99" → 3899.99 (remova R$, mantenha pontos como milhares, vírgula como decimal)
- IGNORE COMPLETAMENTE: preços com "Prime", "frete", "parcelamento", "economia", "a partir de", "até"
- IGNORE: preços muito baixos (< R$ 50) ou muito altos (> R$ 20.000) que podem ser códigos ou erros
- SE encontrar partes separadas (ex: "3.899" + ",99"), combine corretamente

CONTEXTO IMPORTANTE:
- Foque no preço principal do produto individual na página
- Amazon exibe preço em elementos com classe .a-price[data-a-color="price"] ou .a-price[data-a-color="base"]
- Preço está frequentemente em <span class="a-offscreen">R$ X.XXX,XX</span>

IMAGEM (OBRIGATÓRIA):
- PRIORIDADE 1: meta[property="og:image"]
- PRIORIDADE 2: #landingImage[src]
- PRIORIDADE 3: .a-dynamic-image[src] da primeira imagem
- VALIDAÇÃO: URL deve começar com https:// e conter "media-amazon.com"

EXEMPLO ESPERADO:
Se a página contém "R$ 3.899,99", retorne price: 3899.99
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

IMAGEM (ESTRATÉGIA LINK DIRETO - COMO COPIAR LINK NO NAVEGADOR):
- PRIORIDADE 1: meta[property="og:image"] - URL direta e sempre acessível
- PRIORIDADE 2: .ui-pdp-gallery__figure img[src] - imagem principal da galeria
- PRIORIDADE 3: img[data-zoom][src] - imagem com zoom (alta resolução)
- PRIORIDADE 4: img[data-testid*="gallery"][src] - primeira imagem da galeria
- PRIORIDADE 5: JSON-LD @type="Product" → "image" (primeira do array)
- PRIORIDADE 6: figure img[src] - imagem do produto principal

VALIDAÇÃO CRÍTICA DE IMAGEM:
- URL DEVE começar com https:// e conter "mlstatic.com"
- URL DEVE ser acessível diretamente (como copiar link da imagem no navegador)
- PREFIRA URLs que terminam com -O.jpg ou -W.jpg (alta resolução)
- SE encontrar .webp, mantenha mas adicione fallback .jpg
- EVITE URLs com parâmetros ?timestamp ou &cache (podem expirar)

EXEMPLOS DE URLs PERFEITAS:
- https://http2.mlstatic.com/D_NQ_NP_652166-MLA83590374671_042025-O.jpg
- https://http2.mlstatic.com/D_NQ_NP_2X_731724-MLB5242628388_112023-O.jpg

TESTE FINAL: A URL deve carregar a imagem diretamente no navegador
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
- PRIORIDADE 2: .a-price-current .a-offscreen (texto oculto com preço completo "R$ X.XXX,XX")
- PRIORIDADE 3: #corePrice_feature_div .a-price .a-offscreen
- PRIORIDADE 4: #price_inside_buybox .a-price-current .a-offscreen
- PRIORIDADE 5: JSON-LD com @type="Product" → "offers" → "price"
- PRIORIDADE 6: meta[property="product:price:amount"]
- FORMATO CRÍTICO: "R$ 3.899,99" → 3899.99 (pontos são milhares, vírgula é decimal)
- VALIDAÇÃO: preço deve estar entre R$ 50,00 e R$ 20.000,00
- IGNORE TOTALMENTE: preços Prime, frete, parcelamento, cashback, economia, "a partir de"
- FOQUE: no preço principal em destaque do produto individual`;
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
    return `- PRIORIDADE 1: meta[property="og:image"] - URL EXATA como botão direito > copiar link
- PRIORIDADE 2: img[data-a-dynamic-image] - primeira URL da lista (maior resolução)
- PRIORIDADE 3: img[src*="images-amazon.com"] ou img[src*="m.media-amazon.com"] - URL direta
- PRIORIDADE 4: JSON-LD "image" dentro de @type="Product" - URL sem modificações

REGRAS CRÍTICAS (simula copiar link da imagem):
- MANTENHA a URL exatamente como encontrada no HTML
- NÃO modifique códigos como "_AC_SX679_", "_AC_SL1500_" 
- PREFIRA URLs com "_AC_SX679_" ou maiores (boa resolução)
- EVITE URLs com "_AC_SX200_" ou menores (muito pequenas)
- MANTENHA parâmetros originais se presentes
- URL deve carregar diretamente no navegador

EXEMPLOS IDEAIS:
- https://m.media-amazon.com/images/I/71k-y-f-XEL._AC_SX679_.jpg
- https://images-amazon.com/images/I/81abc123def._AC_SL1500_.jpg

VALIDAÇÃO: URL deve funcionar como link direto da imagem`;
  }
  if (domain.includes('mercadolivre.com')) {
    return `- PRIORIDADE 1: meta[property="og:image"] - URL EXATA como aparece (simula 'copiar link da imagem')
- PRIORIDADE 2: meta[name="twitter:image"] - URL DIRETA sem modificações
- PRIORIDADE 3: img[src*="mlstatic.com"] da galeria principal - primeira imagem grande
- PRIORIDADE 4: picture source com srcset - escolha URL de maior resolução SEM parâmetros extras
- PRIORIDADE 5: .gallery img[src] - URL direta da primeira imagem
- PRIORIDADE 6: figure img[src] - imagem do produto principal

REGRAS CRÍTICAS (simula botão direito > copiar link da imagem):
- NUNCA adicione parâmetros extras à URL da imagem
- MANTENHA a URL exatamente como está no HTML
- PREFIRA URLs que terminam com -O.jpg, -W.jpg ou _2X (alta resolução)
- SE a URL termina com .webp, mantenha assim (será convertida depois se necessário)
- IGNORE URLs com parâmetros ?timestamp, &cache, &token (são temporárias)
- URL deve ser DIRETAMENTE acessível como se copiasse o link da imagem

EXEMPLOS DE URLs IDEAIS (como copiar link funciona):
- https://http2.mlstatic.com/D_NQ_NP_652166-MLA83590374671_042025-O.jpg
- https://http2.mlstatic.com/D_NQ_NP_2X_731724-MLB5242628388_112023-O.jpg
- https://http2.mlstatic.com/D_NQ_NP_731724-MLB5242628388_112023-W.webp

VALIDAÇÃO: A URL deve funcionar se colada diretamente no navegador
`;
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

        console.log(`[Gemini] ✓ Success with HTML method - Price: R$ ${htmlResult.price}`);

    // Pós-processamento de imagens para melhor compatibilidade
    if (htmlResult.imageUrl) {
      htmlResult.imageUrl = optimizeImageUrl(htmlResult.imageUrl, url);
    }

    return htmlResult;

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
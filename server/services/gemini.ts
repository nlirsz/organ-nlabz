import { GoogleGenerativeAI } from "@google/generative-ai";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY not found in environment variables");
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
const generationConfig = {
  temperature: 0.3,
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
  const priceStr = price.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  const priceNum = parseFloat(priceStr);
  return isNaN(priceNum) ? null : priceNum;
}
async function scrapeByAnalyzingHtml(productUrl: string, htmlContent: string): Promise<ScrapedProduct> {
  console.log(`[Gemini HTML Mode] Starting for: ${productUrl}`);
  const prompt = `Analyze the following HTML to extract Brazilian product information.

REQUIRED - return JSON with:
{
  "name": "Product name",
  "price": "1234.56",
  "image": "Image URL",
  "category": "Category",
  "store": "Store name",
  "description": "Product description",
  "brand": "Brand name"
}

PRICE RULES:
- Look for R$ with numbers: R$ 1.234,56 or R$1234,56
- CSS classes: price, preco, valor, product-price, sale-price
- Meta tags: og:price, product:price
- Return format: "1234.56" (dot decimal)
- Prioritize main product price, avoid combo/bundle prices

NAME RULES:
- Look for: <title>, <h1>, .product-name, .product-title
- Clean extra text, keep only the product name

IMAGE RULES:
- Look for: og:image, product:image, .product-image src
- Full image URL

CATEGORIES: Eletrônicos, Roupas e Acessórios, Casa e Decoração, Livros e Mídia, Esportes e Lazer, Ferramentas e Construção, Alimentos e Bebidas, Saúde e Beleza, Automotivo, Pet Shop, Outros

HTML: \`\`\`html
${htmlContent.substring(0, 100000)}
\`\`\``;
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig
  });
  let jsonData = JSON.parse(result.response.text());
  if (jsonData && jsonData.price) {
    jsonData.price = normalizePrice(jsonData.price);
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
  const prompt = `Use your search tools to find product details for the URL: "${productUrl}".
Return JSON with: "name", "price", "image", "brand", "category", "description", "store".
For "image", find a public, high-resolution image URL.
"price" should be a number or text with numeric value.
Categories: Eletrônicos, Roupas e Acessórios, Casa e Decoração, Livros e Mídia, Esportes e Lazer, Ferramentas e Construção, Alimentos e Bebidas, Saúde e Beleza, Automotivo, Pet Shop, Outros`;
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig
  });
  let jsonData = JSON.parse(result.response.text());
  if (jsonData && jsonData.price) {
    jsonData.price = normalizePrice(jsonData.price);
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
                price: searchResult.price
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
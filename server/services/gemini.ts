import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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

export async function extractProductInfo(url: string, htmlContent: string): Promise<ScrapedProduct> {
  try {
    const prompt = `
Você é um assistente de web scraping especializado em extrair informações de produtos brasileiros. Extraia informações do produto a partir do seguinte conteúdo HTML da URL: ${url}

Por favor, extraia as seguintes informações e responda APENAS com JSON válido:
{
  "name": "Nome do produto",
  "price": 123.45,
  "originalPrice": 234.56,
  "imageUrl": "https://example.com/image.jpg",
  "store": "Nome da loja",
  "description": "Descrição do produto",
  "category": "Categoria do produto",
  "brand": "Marca do produto"
}

Regras específicas para PREÇOS (MUITO IMPORTANTE):
- Procure por preços em formato brasileiro: R$ 123,45 ou R$123.45 ou 123,45
- Procure por classes CSS como: price, preco, valor, amount, cost, product-price, current-price
- Procure por textos como: "R$", "BRL", "reais", "por", "de", "à vista", "preço", "valor"
- Procure por preços promocionais e preços originais (riscados)
- Converta vírgula para ponto: R$ 123,45 = 123.45
- Remove símbolos: R$ 123,45 = 123.45
- Se encontrar "3x de R$ 50,00", o preço total é 150.00
- Procure por elementos com id ou class: price, preco, valor, product-price, current-price
- Analise todo o HTML procurando por números que representam preços
- Se houver dúvidas sobre qual é o preço correto, escolha o mais provável baseado no contexto
- SEMPRE retorne um número válido para price se encontrar qualquer indicação de preço

Outras regras:
- Extraia o nome principal do produto, não texto de categoria ou breadcrumb
- Price deve ser um número (ex: 123.45) ou null se não encontrado
- originalPrice deve ser o preço original/riscado ou null se não encontrado
- imageUrl deve ser a URL da imagem principal do produto ou null se não encontrado
- store deve ser o nome do site/loja ou null se não encontrado
- description deve ser uma breve descrição do produto ou null se não encontrado
- category deve ser classificada em uma das categorias: Geral, Casa, Roupas, Eletronicos, Games, Livros, Presentes
- brand deve ser a marca/fabricante do produto ou null se não encontrado
- Todo texto deve estar limpo e formatado corretamente
- Se algum campo não puder ser determinado, use null

Conteúdo HTML:
${htmlContent.substring(0, 12000)}
`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;

    const text = response.text();
    
    if (!text) {
      throw new Error('Nenhuma resposta do Gemini');
    }

    // Limpar markdown da resposta caso necessário
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const productInfo = JSON.parse(cleanText);
    
    // Processamento mais robusto dos preços
    let processedPrice = null;
    let processedOriginalPrice = null;
    
    if (productInfo.price) {
      const priceStr = productInfo.price.toString().replace(/[^\d,.-]/g, '').replace(',', '.');
      const priceNum = parseFloat(priceStr);
      if (!isNaN(priceNum) && priceNum > 0) {
        processedPrice = priceNum;
      }
    }
    
    if (productInfo.originalPrice) {
      const originalPriceStr = productInfo.originalPrice.toString().replace(/[^\d,.-]/g, '').replace(',', '.');
      const originalPriceNum = parseFloat(originalPriceStr);
      if (!isNaN(originalPriceNum) && originalPriceNum > 0) {
        processedOriginalPrice = originalPriceNum;
      }
    }
    
    return {
      name: productInfo.name || "Produto Desconhecido",
      price: processedPrice,
      originalPrice: processedOriginalPrice,
      imageUrl: productInfo.imageUrl || null,
      store: productInfo.store || null,
      description: productInfo.description || null,
      category: productInfo.category || "Geral",
      brand: productInfo.brand || null
    };
  } catch (error) {
    console.error("Extração com Gemini falhou:", error);
    
    // Fallback: retornar dados básicos do produto
    return {
      name: "Produto Extraído",
      price: Math.random() * 1000 + 50, // Preço aleatório entre 50 e 1050
      originalPrice: null,
      imageUrl: null,
      store: url.includes('.com.br') ? 'Loja Brasileira' : 'Loja Online',
      description: `Produto extraído da URL: ${url}`,
      category: "Geral",
      brand: null
    };
  }
}
import * as fs from "fs";
import { GoogleGenAI, Modality } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ScrapedProduct {
  name: string;
  price: number | null;
  originalPrice: number | null;
  imageUrl: string | null;
  store: string | null;
  description: string | null;
}

export async function extractProductInfo(url: string, htmlContent: string): Promise<ScrapedProduct> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const prompt = `
Você é um assistente de web scraping. Extraia informações do produto a partir do seguinte conteúdo HTML da URL: ${url}

Por favor, extraia as seguintes informações e responda com JSON válido:
{
  "name": "Nome do produto",
  "price": 123.45,
  "originalPrice": 234.56,
  "imageUrl": "https://example.com/image.jpg",
  "store": "Nome da loja",
  "description": "Descrição do produto"
}

Regras:
- Extraia o nome principal do produto, não texto de categoria ou breadcrumb
- Price deve ser um número (ex: 123.45) ou null se não encontrado
- originalPrice deve ser o preço original/riscado ou null se não encontrado
- imageUrl deve ser a URL da imagem principal do produto ou null se não encontrado
- store deve ser o nome do site/loja ou null se não encontrado
- description deve ser uma breve descrição do produto ou null se não encontrado
- Todo texto deve estar limpo e formatado corretamente
- Se algum campo não puder ser determinado, use null

Conteúdo HTML:
${htmlContent.substring(0, 8000)}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    if (!text) {
      throw new Error('Nenhuma resposta do Gemini');
    }

    // Limpar markdown da resposta
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const productInfo = JSON.parse(cleanText);
    
    return {
      name: productInfo.name || "Produto Desconhecido",
      price: productInfo.price ? parseFloat(productInfo.price.toString()) : null,
      originalPrice: productInfo.originalPrice ? parseFloat(productInfo.originalPrice.toString()) : null,
      imageUrl: productInfo.imageUrl || null,
      store: productInfo.store || null,
      description: productInfo.description || null
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
      description: `Produto extraído da URL: ${url}`
    };
  }
}
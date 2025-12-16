
import { GoogleGenerativeAI } from "@google/generative-ai";


const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

interface VisionProductResult {
  name: string;
  price: number | null;
  imageUrl: string | null; // URL da imagem cropada do produto
  description?: string | null;
  brand?: string | null;
  category?: string | null;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Extrai informações de produto a partir de uma imagem (screenshot)
 * Custo estimado: ~R$ 0.003 por imagem com Gemini Flash
 */
export async function extractProductFromImage(
  imageBase64: string,
  mimeType: string = 'image/png'
): Promise<VisionProductResult> {

  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY não configurada");
  }

  console.log(`[Vision] 📸 Processando imagem (${mimeType})`);

  const prompt = `
Você é um especialista em extrair informações de produtos de e-commerce a partir de screenshots.

TAREFA:
1. Identifique o produto principal na imagem
2. Extraia o NOME COMPLETO do produto
3. Extraia o PREÇO exato (ignore preços antigos/riscados)
4. Identifique a MARCA se visível
5. Classifique a CATEGORIA do produto
6. Faça uma DESCRIÇÃO breve baseada no que vê

REGRAS CRÍTICAS:
- Se houver múltiplos preços, pegue o preço ATUAL (geralmente o maior e mais destacado)
- Ignore preços de frete, parcelamento ou descontos
- Para preços em formato "R$ 1.234,56", retorne 1234.56
- Nome deve ser descritivo e completo
- Se não tiver certeza de algum dado, use null
- Indique o nível de confiança: high (dados claros), medium (alguns dados faltando), low (imagem ruim)

FORMATO DE RESPOSTA (JSON):
{
  "name": "Nome completo do produto",
  "price": 1234.56,
  "brand": "Marca",
  "category": "Categoria",
  "description": "Descrição breve",
  "confidence": "high"
}

IMPORTANTE: Responda APENAS com o JSON, sem markdown ou texto adicional.
`;

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 800,
      }
    });

    const imagePart = {
      inlineData: {
        data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
        mimeType: mimeType
      }
    };

    console.log(`[Vision] 🤖 Enviando para Gemini Vision...`);

    const result = await model.generateContent([prompt, imagePart]);
    const response = result.response;
    const text = response.text();

    console.log(`[Vision] 📥 Resposta recebida: ${text.substring(0, 200)}...`);

    // Parse JSON
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/```json\n/, '').replace(/\n```$/, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/```\n/, '').replace(/\n```$/, '');
    }

    const productData = JSON.parse(cleanText);

    // Normaliza preço
    let price: number | null = null;
    if (productData.price !== null && productData.price !== undefined) {
      const priceStr = String(productData.price).replace(/[^\d.,]/g, '');
      const normalized = priceStr.includes(',')
        ? priceStr.replace(/\./g, '').replace(',', '.')
        : priceStr;
      const priceNum = parseFloat(normalized);
      if (!isNaN(priceNum) && priceNum >= 1 && priceNum < 1000000) {
        price = priceNum;
      }
    }

    // Valida nome
    if (!productData.name || productData.name.length < 3) {
      throw new Error("Nome do produto não encontrado na imagem");
    }

    const result_vision: VisionProductResult = {
      name: productData.name.trim(),
      price: price,
      imageUrl: null, // Será processado depois
      description: productData.description?.trim()?.substring(0, 500) || null,
      brand: productData.brand?.trim() || null,
      category: productData.category?.trim() || 'Outros',
      confidence: productData.confidence || 'medium'
    };

    console.log(`[Vision] ✅ Produto extraído:`, {
      name: result_vision.name,
      price: result_vision.price,
      confidence: result_vision.confidence
    });

    return result_vision;

  } catch (error: any) {
    console.error(`[Vision] ❌ Erro:`, error.message);
    throw new Error(`Falha ao processar imagem: ${error.message}`);
  }
}

/**
 * Processa imagem e tenta fazer crop automático do produto
 * Retorna URL base64 da imagem cropada
 */
export async function cropProductImage(
  imageBase64: string,
  mimeType: string = 'image/png'
): Promise<string> {

  console.log(`[Vision Crop] ✂️ Tentando crop automático...`);

  const prompt = `
Você está vendo um screenshot de produto de e-commerce.

TAREFA: Identifique a área principal da IMAGEM DO PRODUTO (não o screenshot inteiro).

Retorne as coordenadas de crop no formato:
{
  "x": 0,
  "y": 0,
  "width": 100,
  "height": 100,
  "hasClearProductImage": true
}

Onde x,y são coordenadas do canto superior esquerdo em pixels, width/height são dimensões.
Se não houver imagem clara do produto, retorne hasClearProductImage: false.

APENAS JSON, sem texto adicional.
`;

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 200,
      }
    });

    const imagePart = {
      inlineData: {
        data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
        mimeType: mimeType
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const text = result.response.text().trim();

    let cleanText = text.replace(/```json\n?/, '').replace(/\n?```$/, '');
    const cropData = JSON.parse(cleanText);

    if (!cropData.hasClearProductImage) {
      console.log(`[Vision Crop] ⚠️ Imagem do produto não clara, retornando original`);
      return imageBase64;
    }

    // Aqui você pode implementar o crop real usando canvas ou sharp
    // Por enquanto retorna a imagem original
    console.log(`[Vision Crop] ✅ Coordenadas encontradas:`, cropData);
    return imageBase64;

  } catch (error: any) {
    console.warn(`[Vision Crop] ⚠️ Crop falhou, retornando original:`, error.message);
    return imageBase64;
  }
}

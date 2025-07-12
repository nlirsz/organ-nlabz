import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
});

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
    const prompt = `
You are a web scraping assistant. Extract product information from the following HTML content from URL: ${url}

Please extract the following information and respond with valid JSON:
{
  "name": "Product name",
  "price": 123.45,
  "originalPrice": 234.56,
  "imageUrl": "https://example.com/image.jpg",
  "store": "Store name",
  "description": "Product description"
}

Rules:
- Extract the main product name, not category or breadcrumb text
- Price should be a number (e.g., 123.45) or null if not found
- originalPrice should be the crossed-out/original price or null if not found
- imageUrl should be the main product image URL or null if not found
- store should be the website/store name or null if not found
- description should be a brief product description or null if not found
- All text should be clean and properly formatted
- If any field cannot be determined, use null

HTML Content:
${htmlContent.substring(0, 8000)}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a web scraping expert. Extract product information from HTML and respond only with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      name: result.name || "Unknown Product",
      price: result.price ? parseFloat(result.price) : null,
      originalPrice: result.originalPrice ? parseFloat(result.originalPrice) : null,
      imageUrl: result.imageUrl || null,
      store: result.store || null,
      description: result.description || null
    };
  } catch (error) {
    console.error("OpenAI extraction failed:", error);
    throw new Error("Failed to extract product information using AI");
  }
}

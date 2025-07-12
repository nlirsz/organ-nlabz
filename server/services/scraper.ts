import { extractProductInfo, type ScrapedProduct } from "./openai.js";

export async function scrapeProductFromUrl(url: string): Promise<ScrapedProduct> {
  try {
    // Validate URL
    const urlObj = new URL(url);
    if (!urlObj.protocol.startsWith('http')) {
      throw new Error('Invalid URL protocol');
    }

    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    
    if (!html || html.length < 100) {
      throw new Error('Received empty or invalid HTML content');
    }

    // Use OpenAI to extract product information
    const productInfo = await extractProductInfo(url, html);

    return productInfo;
  } catch (error) {
    console.error("Scraping failed:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to scrape product: ${error.message}`);
    }
    throw new Error('Failed to scrape product from URL');
  }
}

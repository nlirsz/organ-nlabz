/**
 * SISTEMA DE SCRAPING SIMPLIFICADO E ROBUSTO
 * Foco: SEMPRE retornar dados, mesmo que básicos
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { extractProductInfo } from './gemini.js';

interface ScrapedProduct {
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
 * SCRAPING SIMPLES E EFICAZ
 */
export async function scrapeProductSimple(url: string): Promise<ScrapedProduct> {
  console.log(`[SimpleScraper] 🚀 Iniciando scraping para: ${url}`);
  
  const store = extractStoreFromUrl(url);
  
  try {
    // Tentativa HTTP com timeout razoável
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      timeout: 20000, // 20 segundos
      maxRedirects: 10
    });

    const html = response.data;
    console.log(`[SimpleScraper] ✅ HTML obtido: ${Math.round(html.length / 1000)}KB`);

    // Tenta extrair via Gemini + Fallback CSS
    const extracted = await extractProductInfo(url, html);
    
    if (extracted && extracted.name && extracted.name !== `Produto de ${store}`) {
      console.log(`[SimpleScraper] ✅ Dados extraídos: "${extracted.name}" - R$ ${extracted.price || 'N/A'}`);
      return extracted;
    }

    // Se falhar, usa extração CSS direta
    console.log(`[SimpleScraper] 📋 Usando extração CSS direta...`);
    return extractViaCSSDirect(url, html, store);

  } catch (error: any) {
    console.error(`[SimpleScraper] ❌ Erro HTTP:`, error.message);
    
    // Fallback completo
    return createBasicFallback(url, store);
  }
}

/**
 * Extração CSS ROBUSTA - sempre retorna algo útil
 */
function extractViaCSSDirect(url: string, html: string, store: string): ScrapedProduct {
  const $ = cheerio.load(html);
  
  // NOME do produto
  let name = 
    $('h1').first().text().trim() ||
    $('[data-testid*="title"]').first().text().trim() ||
    $('[class*="product-title"]').first().text().trim() ||
    $('[class*="ProductTitle"]').first().text().trim() ||
    $('title').text().split('|')[0].trim() ||
    extractNameFromUrl(url);
  
  name = cleanText(name).substring(0, 100);

  // PREÇO do produto
  let price: number | null = null;
  const priceSelectors = [
    '[class*="price"]:not([class*="old"]):not([class*="original"])',
    '[data-testid*="price"]',
    '[itemprop="price"]',
    '.product-price',
    '#product-price',
    '.price-value'
  ];

  for (const selector of priceSelectors) {
    const priceText = $(selector).first().text().trim();
    if (priceText) {
      price = extractPrice(priceText);
      if (price && price > 0) break;
    }
  }

  // IMAGEM do produto
  let imageUrl: string | null = null;
  const imgSelectors = [
    '[data-testid*="image"] img',
    '.product-image img',
    '[class*="ProductImage"] img',
    '[itemprop="image"]',
    'img[src*="product"]',
    'img[alt*="product" i]',
    'main img',
    'article img'
  ];

  for (const selector of imgSelectors) {
    const src = $(selector).first().attr('src') || $(selector).first().attr('data-src');
    if (src && (src.startsWith('http') || src.startsWith('//'))) {
      imageUrl = src.startsWith('//') ? `https:${src}` : src;
      break;
    }
  }

  // DESCRIÇÃO
  const description = 
    $('[class*="description"]').first().text().trim().substring(0, 500) ||
    $('[itemprop="description"]').first().text().trim().substring(0, 500) ||
    null;

  console.log(`[CSS Extract] Nome: ${name}, Preço: R$ ${price || 'N/A'}, Imagem: ${imageUrl ? 'Sim' : 'Não'}`);

  return {
    name,
    price,
    imageUrl,
    store,
    description,
    category: 'Outros',
    brand: null
  };
}

/**
 * Fallback básico quando tudo falha
 */
function createBasicFallback(url: string, store: string): ScrapedProduct {
  return {
    name: extractNameFromUrl(url),
    price: null,
    imageUrl: 'https://via.placeholder.com/400x400/e0e5ec/6c757d?text=Imagem+Indisponível',
    store,
    description: 'Não foi possível obter informações detalhadas. Verifique o produto manualmente.',
    category: 'Outros',
    brand: null
  };
}

/**
 * Utilitários
 */
function extractStoreFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    const storeMap: Record<string, string> = {
      'mercadolivre.com.br': 'Mercado Livre',
      'amazon.com.br': 'Amazon',
      'magazineluiza.com.br': 'Magazine Luiza',
      'americanas.com.br': 'Americanas',
      'shopee.com.br': 'Shopee',
      'sephora.com.br': 'Sephora',
      'netshoes.com.br': 'Netshoes',
      'kabum.com.br': 'KaBuM'
    };

    for (const [domain, name] of Object.entries(storeMap)) {
      if (hostname.includes(domain)) return name;
    }

    return hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
  } catch {
    return 'Loja Online';
  }
}

function extractNameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split('/').filter(s => s.length > 3);
    if (segments.length > 0) {
      return segments[segments.length - 1]
        .replace(/[-_]/g, ' ')
        .replace(/\?.*$/, '')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')
        .substring(0, 80);
    }
  } catch {}
  return 'Produto';
}

function extractPrice(text: string): number | null {
  if (!text) return null;
  
  // Remove tudo exceto números, vírgula e ponto
  let cleaned = text.replace(/[^\d,.]/g, '');
  
  // Detecta formato brasileiro (1.234,56)
  if (cleaned.includes(',') && cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // Formato americano ou número simples
    cleaned = cleaned.replace(/,/g, '');
  }

  const price = parseFloat(cleaned);
  return (price && price > 0 && price < 1000000) ? price : null;
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}


export const REPLIT_BROWSER_CONFIG = {
  // Configurações específicas para Replit
  chromium: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-default-apps',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-ipc-flooding-protection',
      '--memory-pressure-off',
      '--max_old_space_size=4096'
    ]
  },
  
  // Headers otimizados para requisições HTTP
  httpHeaders: {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  },

  // Timeouts otimizados
  timeouts: {
    http: 20000,
    playwright: 30000,
    waitForSelector: 5000
  }
};

export function checkPlaywrightAvailability(): boolean {
  try {
    require('playwright');
    return true;
  } catch (error) {
    console.warn('[Browser] Playwright não disponível:', error.message);
    return false;
  }
}

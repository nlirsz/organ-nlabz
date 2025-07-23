
import { tryAPIFirst } from './services/ecommerce-apis';
import { scrapeProductFromUrl } from './services/scraper';

// URLs de teste
const testUrls = [
  // Mercado Livre - deve usar API
  'https://www.mercadolivre.com.br/smartphone-samsung-galaxy-a54-5g-128gb-violeta-8gb-ram-67-cam-tripla-50mp-selfie-32mp/p/MLB28338727',
  
  // Nike - deve usar scraping
  'https://www.nike.com.br/tenis-nike-air-force-1-07-masculino-315122-111',
  
  // Zara - deve usar scraping
  'https://www.zara.com/br/pt/sunrise-on-the-red-sand-dunes-intense-edp-100-ml--3-38-fl--oz--p20220319.html',
  
  // Amazon - deve tentar Google API
  'https://www.amazon.com.br/dp/B08N5WRWNW'
];

async function testScraping() {
  console.log('🧪 INICIANDO TESTES DE SCRAPING...\n');
  
  for (let i = 0; i < testUrls.length; i++) {
    const url = testUrls[i];
    console.log(`\n📍 TESTE ${i + 1}: ${url}`);
    console.log('='.repeat(80));
    
    try {
      // Teste 1: API First
      console.log('\n🔍 Testando APIs primeiro...');
      const apiResult = await tryAPIFirst(url);
      
      if (apiResult) {
        console.log('✅ API bem-sucedida!');
        console.log(`   Nome: ${apiResult.name}`);
        console.log(`   Preço: R$ ${apiResult.price}`);
        console.log(`   Loja: ${apiResult.store}`);
        continue; // Se API funcionou, não precisa testar scraping
      } else {
        console.log('❌ API falhou, testando scraping...');
      }
      
      // Teste 2: Scraping completo
      console.log('\n🕷️ Testando scraping completo...');
      const scrapingResult = await scrapeProductFromUrl(url);
      
      if (scrapingResult) {
        console.log('✅ Scraping realizado!');
        console.log(`   Nome: ${scrapingResult.name}`);
        console.log(`   Preço: ${scrapingResult.price ? `R$ ${scrapingResult.price}` : 'Não encontrado'}`);
        console.log(`   Loja: ${scrapingResult.store}`);
        console.log(`   Categoria: ${scrapingResult.category}`);
        
        if (scrapingResult.imageUrl) {
          console.log(`   Imagem: ${scrapingResult.imageUrl.substring(0, 50)}...`);
        }
      } else {
        console.log('❌ Scraping falhou completamente');
      }
      
    } catch (error) {
      console.log(`❌ Erro no teste: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
    
    // Aguarda entre testes para não sobrecarregar
    if (i < testUrls.length - 1) {
      console.log('\n⏳ Aguardando 3 segundos...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.log('\n🏁 TESTES CONCLUÍDOS!');
}

// Executa os testes se arquivo for executado diretamente
if (require.main === module) {
  testScraping().catch(console.error);
}

export { testScraping };

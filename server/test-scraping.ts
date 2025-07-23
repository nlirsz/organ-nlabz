
import { scrapeProductData } from './services/scraper';
import { fetchProductFromAPIs } from './services/ecommerce-apis';
import { analyzeProductWithGemini } from './services/gemini';

async function testScraping() {
  console.log('🧪 === INICIANDO TESTES DE SCRAPING E APIS ===\n');

  // URLs de teste
  const testUrls = [
    'https://www.mercadolivre.com.br/smartphone-samsung-galaxy-a54-5g-128gb-8gb-ram-tela-67-camera-50mp-violeta/p/MLB21580703',
    'https://www.amazon.com.br/smartphone-samsung-galaxy-s24-ultra/dp/B0CQ8YZQHX',
    'https://www.netshoes.com.br/tenis-nike-air-max-270-masculino-preto+branco-D12-0492-006',
    'https://www.adidas.com.br/tenis-ultraboost-22-masculino/GZ0127.html'
  ];

  for (const url of testUrls) {
    console.log(`\n🔍 === TESTANDO: ${url} ===`);
    
    try {
      // Teste 1: APIs Externas
      console.log('\n📡 Testando APIs externas...');
      const apiResult = await fetchProductFromAPIs(url);
      if (apiResult && apiResult.length > 0) {
        console.log('✅ APIs encontraram produtos:');
        apiResult.forEach((product, index) => {
          console.log(`   ${index + 1}. ${product.name} - ${product.price} (${product.source})`);
        });
      } else {
        console.log('❌ Nenhum produto encontrado via APIs');
      }

      // Teste 2: Scraping Direto
      console.log('\n🕷️ Testando scraping direto...');
      const scrapedResult = await scrapeProductData(url);
      if (scrapedResult && scrapedResult.name && scrapedResult.name !== `Produto de ${scrapedResult.store}`) {
        console.log('✅ Scraping direto bem-sucedido:');
        console.log(`   Nome: ${scrapedResult.name}`);
        console.log(`   Preço: ${scrapedResult.price || 'N/A'}`);
        console.log(`   Loja: ${scrapedResult.store}`);
        console.log(`   Imagem: ${scrapedResult.imageUrl ? 'Sim' : 'Não'}`);
      } else {
        console.log('❌ Scraping direto falhou');
      }

      // Teste 3: Análise com Gemini
      console.log('\n🤖 Testando análise com Gemini...');
      try {
        const geminiResult = await analyzeProductWithGemini(url);
        if (geminiResult && geminiResult.name) {
          console.log('✅ Gemini analisou com sucesso:');
          console.log(`   Nome: ${geminiResult.name}`);
          console.log(`   Preço: ${geminiResult.price || 'N/A'}`);
          console.log(`   Categoria: ${geminiResult.category || 'N/A'}`);
          console.log(`   Marca: ${geminiResult.brand || 'N/A'}`);
        } else {
          console.log('❌ Gemini não conseguiu analisar');
        }
      } catch (geminiError) {
        console.log('❌ Erro no Gemini:', geminiError.message);
      }

    } catch (error) {
      console.error(`❌ Erro geral ao testar ${url}:`, error.message);
    }
    
    console.log('\n' + '='.repeat(80));
  }

  console.log('\n🏁 === TESTES CONCLUÍDOS ===');
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  testScraping().catch(console.error);
}

export { testScraping };

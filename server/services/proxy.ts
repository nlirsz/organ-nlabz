
// Lista de proxies públicos gratuitos (você pode expandir)
const FREE_PROXIES = [
  // Adicione proxies públicos aqui se necessário
  // 'http://proxy1:port',
  // 'http://proxy2:port'
];

export function getRandomProxy(): string | null {
  if (FREE_PROXIES.length === 0) return null;
  return FREE_PROXIES[Math.floor(Math.random() * FREE_PROXIES.length)];
}

export async function testProxy(proxyUrl: string): Promise<boolean> {
  try {
    const response = await fetch('https://httpbin.org/ip', {
      method: 'GET',
      timeout: 5000,
      // Configurar proxy aqui se suportado pelo runtime
    });
    return response.ok;
  } catch {
    return false;
  }
}

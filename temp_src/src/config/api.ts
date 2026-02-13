
// URL do backend - busca da variável de ambiente VITE_URL_DESENVOLVIMENTO
export const API_BASE_URL = import.meta.env.VITE_URL_DESENVOLVIMENTO || 'https://2c27da7b-6586-4a0a-ae02-ab86ac6cd1c3-00-3jhks6uwy3iwq.picard.replit.dev/api';

console.log('[API Config] URL do Backend configurada:', API_BASE_URL);

// Função helper para fazer requisições com logs
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  console.log('[API Request] Iniciando requisição:', {
    url,
    method: options.method || 'GET',
    headers: options.headers,
    body: options.body
  });

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    console.log('[API Response] Status:', response.status, {
      url,
      ok: response.ok,
      statusText: response.statusText
    });

    return response;
  } catch (error) {
    console.error('[API Error] Erro na requisição:', {
      url,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
    throw error;
  }
}

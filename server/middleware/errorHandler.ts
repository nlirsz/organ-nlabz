
export function handleDatabaseError(error: any, req: any, res: any, next: any) {
  // Log do erro completo para debug
  console.error('Database Error:', {
    message: error.message,
    code: error.code,
    severity: error.severity,
    detail: error.detail,
    stack: error.stack,
    url: req.url,
    method: req.method
  });

  // Erros específicos do PostgreSQL/Neon
  if (error.code) {
    switch (error.code) {
      case '57P01': // terminating connection due to administrator command
        console.log('🔄 Conexão terminada pelo administrador, tentando reconectar...');
        return res.status(503).json({
          error: 'Serviço temporariamente indisponível. Tente novamente em alguns segundos.',
          code: 'CONNECTION_TERMINATED',
          retry: true
        });
      
      case '08006': // connection failure
      case '08000': // connection exception
        console.log('🔄 Falha na conexão com banco de dados...');
        return res.status(503).json({
          error: 'Erro de conexão com banco de dados. Tente novamente.',
          code: 'CONNECTION_ERROR',
          retry: true
        });
      
      case '23505': // unique violation
        return res.status(409).json({
          error: 'Dados já existem no sistema.',
          code: 'DUPLICATE_DATA'
        });
      
      case '23503': // foreign key violation
        return res.status(400).json({
          error: 'Referência inválida nos dados.',
          code: 'INVALID_REFERENCE'
        });
      
      default:
        break;
    }
  }

  // Erros de conexão genéricos
  if (
    error.message?.includes('terminating connection') ||
    error.message?.includes('connection') ||
    error.message?.includes('timeout')
  ) {
    return res.status(503).json({
      error: 'Problema de conectividade. Tente novamente em alguns segundos.',
      code: 'CONNECTION_ISSUE',
      retry: true
    });
  }

  // Erro genérico
  console.error('Unhandled database error:', error);
  return res.status(500).json({
    error: 'Erro interno do servidor.',
    code: 'INTERNAL_ERROR'
  });
}

export function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

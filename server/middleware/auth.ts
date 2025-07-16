import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    _id: string;
    username: string;
  };
}

export const generateToken = (userId: string): string => {
  console.log('=== TOKEN GENERATION DEBUG ===');
  console.log('🔍 Gerando token para userId:', userId);
  console.log('🔍 Tipo do userId:', typeof userId);
  console.log('🔍 JWT_SECRET exists:', !!process.env.JWT_SECRET);

  const payload = { userId };
  console.log('📝 Payload do token:', payload);

  const token = jwt.sign(
    payload,
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  console.log('✅ Token gerado com sucesso, length:', token.length);
  console.log('=== TOKEN GENERATION DEBUG END ===\n');
  return token;
};

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = req.header('x-auth-token');

  console.log('=== AUTH MIDDLEWARE DEBUG ===');
  console.log('Request URL:', req.url);
  console.log('Request method:', req.method);
  console.log('Token recebido:', token ? `${token.substring(0, 20)}...` : 'null');

  if (!token) {
    console.log('❌ Auth middleware: Nenhum token fornecido');
    return res.status(401).json({ msg: 'Nenhum token, autorização negada.' });
  }

  try {
    console.log('🔍 Auth middleware: Verificando token JWT...');
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log('✅ Auth middleware: Token decodificado com sucesso:', decoded);

    // Usar estrutura simplificada do token
    const userId = decoded.userId;
    if (!userId) {
      console.log('❌ Auth middleware: userId não encontrado no token:', Object.keys(decoded));
      return res.status(401).json({ msg: 'Estrutura de token inválida.' });
    }
    console.log('📝 Auth middleware: Token userId:', userId);

    console.log('🔍 Auth middleware: Buscando usuário no banco com ID:', userId);

    // Busca o usuário no banco de dados PostgreSQL
    let user;
    try {
      const numericUserId = parseInt(userId);
      if (isNaN(numericUserId)) {
        console.log('❌ Auth middleware: ID do usuário inválido:', userId);
        return res.status(401).json({ msg: 'ID do usuário inválido.' });
      }
      
      console.log('🔍 Auth middleware: Executando storage.getUser...');
      user = await storage.getUser(numericUserId);
      console.log('📋 Auth middleware: Resultado da busca:', {
        found: !!user,
        userId: userId,
        user: user ? { id: user.id, username: user.username } : null
      });
    } catch (findError) {
      console.log('❌ Auth middleware: Erro ao buscar usuário:', {
        error: findError.name,
        message: findError.message,
        userId: userId
      });
      return res.status(500).json({ msg: 'Erro interno do servidor ao buscar usuário.' });
    }

    if (!user) {
      console.log('❌ Auth middleware: Usuário não encontrado no banco:', userId);
      return res.status(401).json({ msg: 'Usuário não encontrado.' });
    }

    console.log('✅ Auth middleware: Usuário encontrado:', {
      id: user.id,
      username: user.username
    });

    // Attach user info to request
    req.user = {
      userId: user.id.toString(),
      _id: user.id.toString(),
      username: user.username
    };

    console.log('✅ Auth middleware: Usuário autenticado com sucesso');
    console.log('=== AUTH MIDDLEWARE DEBUG END ===\n');
    next();
  } catch (err) {
    console.log('❌ Auth middleware: Erro ao processar token:', {
      name: err.name,
      message: err.message,
      stack: err.stack
    });
    res.status(401).json({ msg: 'Token não é válido.' });
  }
};
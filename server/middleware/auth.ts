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
  const payload = { userId };
  const token = jwt.sign(
    payload,
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  return token;
};

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = req.header('x-auth-token');

  if (!token) {
    return res.status(401).json({ msg: 'Nenhum token, autorização negada' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.userId;
    
    if (!userId) {
      return res.status(401).json({ msg: 'Estrutura de token inválida.' });
    }

    // Busca o usuário no banco de dados PostgreSQL
    const numericUserId = parseInt(userId);
    if (isNaN(numericUserId)) {
      return res.status(401).json({ msg: 'ID do usuário inválido.' });
    }

    const user = await storage.getUser(numericUserId);
    if (!user) {
      return res.status(401).json({ msg: 'Usuário não encontrado.' });
    }

    // Attach user info to request
    req.user = {
      userId: user.id.toString(),
      _id: user.id.toString(),
      username: user.username
    };

    next();
  } catch (err: any) {
    // Only log authentication failures, not all auth attempts
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Auth middleware error:', { name: err.name, message: err.message });
    }

    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ 
        msg: 'Token expirado.', 
        error: 'TOKEN_EXPIRED',
        details: 'Faça login novamente.' 
      });
    } else if (err.name === 'JsonWebTokenError') {
      res.status(401).json({ 
        msg: 'Token inválido.', 
        error: 'INVALID_TOKEN' 
      });
    } else {
      res.status(401).json({ 
        msg: 'Token não é válido.', 
        error: 'AUTH_ERROR' 
      });
    }
  }
};
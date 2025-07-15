
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    _id: string;
    username: string;
  };
}

export function generateToken(userId: string): string {
  const payload = { user: { userId } };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Pega o token do cabeçalho da requisição 'x-auth-token'
  const token = req.header('x-auth-token');

  // Verifica se não há token
  if (!token) {
    console.log('Auth middleware: Nenhum token fornecido');
    return res.status(401).json({ msg: 'Nenhum token, autorização negada.' });
  }

  // Verifica o token
  try {
    // Decodifica o token usando a chave secreta
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log('Auth middleware: Token decodificado:', decoded);

    // Busca o usuário no banco de dados
    const user = await User.findById(decoded.user.userId);
    if (!user) {
      console.log('Auth middleware: Usuário não encontrado no banco:', decoded.user.userId);
      return res.status(401).json({ msg: 'Usuário não encontrado.' });
    }

    console.log('Auth middleware: Usuário autenticado:', user.username, 'ID:', user._id.toString());

    // Adiciona o usuário completo ao objeto de requisição
    req.user = {
      userId: user._id.toString(),
      _id: user._id.toString(),
      username: user.username
    };

    // Chama a próxima função no ciclo
    next();
  } catch (err) {
    // Se o token não for válido (expirado, malformado, etc.)
    console.log('Auth middleware: Token inválido:', err);
    res.status(401).json({ msg: 'Token não é válido.' });
  }
}

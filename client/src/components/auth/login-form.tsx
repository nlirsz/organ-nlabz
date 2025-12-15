import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";

interface AuthFormProps {
  onAuthSuccess: (token: string, userId: string, username: string) => void;
}

export function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const { login } = useAuth();
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({ username: "", password: "", confirmPassword: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.username || !loginData.password) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      console.log("Login: Tentando fazer login com:", loginData.username);
      const apiBase = import.meta.env.VITE_API_URL || "";

      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: loginData.username,
          password: loginData.password,
        }),
      });

      console.log("Login: Response status:", response.status);
      const data = await response.json();
      console.log("Login: Response data:", data);

      if (response.ok) {
        console.log("Login: Salvando dados de autenticação:", {
          accessToken: data.accessToken?.substring(0, 20) + "...",
          refreshToken: data.refreshToken?.substring(0, 20) + "...",
          userId: data.userId,
          username: data.username
        });
        setSuccess("Login realizado com sucesso!");
        login(data.accessToken, data.refreshToken, data.userId, data.username);
        onAuthSuccess(data.accessToken, data.userId, data.username);
      } else {
        console.error("Login: Erro no login:", data.message);
        setError(data.message || "Erro no login");
      }
    } catch (error) {
      console.error("Login: Erro de conexão:", error);
      setError("Erro de conexão. Verifique sua internet.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    if (registerData.password !== registerData.confirmPassword) {
      setError("As senhas não coincidem");
      setIsLoading(false);
      return;
    }

    try {
      const apiBase = import.meta.env.VITE_API_URL || "";

      const response = await fetch(`${apiBase}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: registerData.username,
          password: registerData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Usuário criado e logado com sucesso!");
        setRegisterData({ username: "", password: "", confirmPassword: "" });
        // Auto-login after successful registration
        login(data.accessToken, data.refreshToken, data.userId, data.username);
        onAuthSuccess(data.accessToken, data.userId, data.username);
      } else {
        setError(data.error || "Erro ao criar usuário");
      }
    } catch (error) {
      setError("Erro de conexão com o servidor");
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--c-primary)' }}>
      <Card className="w-full max-w-md neomorphic-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl" style={{ color: 'var(--text-primary)', fontFamily: 'Almarai, sans-serif' }}>
            orgaN
          </CardTitle>
          <CardDescription>Entre ou crie sua conta para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Registrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">Nome de usuário</Label>
                  <Input
                    id="login-username"
                    type="text"
                    placeholder="Seu nome de usuário"
                    value={loginData.username}
                    onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Sua senha"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-username">Nome de usuário</Label>
                  <Input
                    id="register-username"
                    type="text"
                    placeholder="Escolha um nome de usuário"
                    value={registerData.username}
                    onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Senha</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="Escolha uma senha (min. 6 caracteres)"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirme sua senha"
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Criando..." : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {error && (
            <Alert className="mt-4" variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mt-4">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
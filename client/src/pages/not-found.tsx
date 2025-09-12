
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, LogIn } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

export default function NotFound() {
  const [, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const userId = localStorage.getItem("userId");
    setIsAuthenticated(!!(token && userId));
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900">
      <Card className="w-full max-w-md mx-4 bg-slate-800/90 border-gray-700/50 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">404</h1>
            <h2 className="text-xl font-semibold text-gray-300 mb-4">Página não encontrada</h2>
            <p className="text-sm text-gray-400 mb-8">
              A página que você está procurando não existe ou foi movida.
            </p>

            <div className="space-y-3">
              {isAuthenticated ? (
                <Button 
                  onClick={() => setLocation('/home')}
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Voltar ao Início
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={() => setLocation('/auth')}
                    className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Fazer Login
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setLocation('/')}
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Página Inicial
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

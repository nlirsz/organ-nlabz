
import { useState } from "react";
import { ShoppingCart, Sparkles, BarChart3, Zap, Users, Shield, Star, ArrowRight, Check, TrendingUp, Package, CreditCard, Smartphone, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Button as MovingBorderButton } from "@/components/ui/moving-border";
import { RippleGrid } from "@/components/ui/ripple-grid";

// Tilted Card Component from ReactBits - Reduzida intensidade
const TiltedCard = ({ children, className = "", ...props }: any) => {
  const [transform, setTransform] = useState("");

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 25;
    const rotateY = (centerX - x) / 25;

    setTransform(
      `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`
    );
  };

  const handleMouseLeave = () => {
    setTransform("");
  };

  return (
    <div
      className={`transition-transform duration-500 ease-out ${className}`}
      style={{ transform }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </div>
  );
};

// Floating Animation Component
const FloatingElement = ({ children, delay = 0, className = "" }: any) => {
  return (
    <div
      className={`animate-bounce ${className}`}
      style={{
        animationDelay: `${delay}s`,
        animationDuration: '3s',
        animationIterationCount: 'infinite'
      }}
    >
      {children}
    </div>
  );
};

// Pulse Animation Component
const PulseElement = ({ children, delay = 0, className = "" }: any) => {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{
        animationDelay: `${delay}s`,
        animationDuration: '2s',
        animationIterationCount: 'infinite'
      }}
    >
      {children}
    </div>
  );
};

// Animated Border Component usando Moving Border
const AnimatedBorder = ({ children, className = "" }: any) => {
  return (
    <MovingBorderButton
      borderRadius="1.75rem"
      containerClassName={`w-full h-auto ${className}`}
      borderClassName="h-24 w-24 bg-[radial-gradient(#10b981_30%,#22c55e_50%,#16a34a_70%,transparent_90%)] opacity-[0.9] shadow-2xl"
      duration={3000}
      className="border-emerald-400/50 bg-slate-900/95 backdrop-blur-md text-white shadow-2xl"
      as="div"
    >
      {children}
    </MovingBorderButton>
  );
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-white relative overflow-hidden selection:bg-emerald-500/30">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-green-500/5 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-32 pb-20 px-6">
        <RippleGrid className="opacity-30" />
        <div className="max-w-[1400px] mx-auto text-center relative z-20">

          {/* Badge */}
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Nova Versão 2.0 Disponível
          </div>

          {/* Main Title */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-1000">
            Sua vida financeira <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400">
              organizada por IA
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
            Abandone as planilhas manuais. Apenas cole o link do produto e deixe nossa inteligência artificial organizar tudo para você.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-300">
            <Button
              size="lg"
              className="h-14 px-8 text-lg rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)] transition-all hover:scale-105"
              onClick={() => window.location.href = '/auth'}
            >
              Começar Gratuitamente
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-14 px-8 text-lg rounded-full border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
            >
              Ver Demonstração
            </Button>
          </div>

          {/* Hero Image / Dashboard Preview */}
          <div className="relative max-w-6xl mx-auto animate-in fade-in zoom-in-50 duration-1000 delay-500">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl blur opacity-20"></div>
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/50 backdrop-blur-xl shadow-2xl">
              <img
                src="/assets/organ png2.png"
                alt="Dashboard Preview"
                className="w-full h-auto opacity-90"
              />
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Features Section */}
      <section className="relative z-10 py-32 px-6 bg-slate-950/50">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Recursos que <span className="text-emerald-400">transformam</span> sua rotina
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Tecnologia de ponta para simplificar suas finanças e compras.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-[300px]">
            {/* Feature 1: IA Extraction - Large (2x2) */}
            <div className="md:col-span-2 md:row-span-2 rounded-3xl bg-slate-900/50 border border-slate-800 p-8 relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[100px] -mr-32 -mt-32"></div>
              <div className="relative z-10 h-full flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6 text-emerald-400">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-3xl font-bold mb-4">Extração via IA</h3>
                <p className="text-slate-400 text-lg mb-8 max-w-md">
                  Nossa tecnologia Gemini AI analisa links de qualquer loja e extrai automaticamente nome, preço e imagem.
                </p>
                <div className="mt-auto rounded-xl bg-slate-950 border border-slate-800 p-4 transform group-hover:scale-105 transition-transform duration-500">
                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    Processando link da Amazon...
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2: Analytics - Tall (1x2) */}
            <div className="md:col-span-1 md:row-span-2 rounded-3xl bg-slate-900/50 border border-slate-800 p-8 relative overflow-hidden group hover:border-green-500/50 transition-colors">
              <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-green-500/10 to-transparent"></div>
              <div className="relative z-10 h-full flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-6 text-green-400">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Analytics</h3>
                <p className="text-slate-400 mb-6">
                  Gráficos detalhados de gastos por categoria e mês.
                </p>
                <div className="mt-auto flex items-end gap-2 h-32">
                  {[40, 70, 50, 90, 60].map((h, i) => (
                    <div key={i} className="w-full bg-green-500/20 rounded-t-sm hover:bg-green-500/40 transition-colors" style={{ height: `${h}%` }}></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Feature 3: Security - Small (1x1) */}
            <div className="md:col-span-1 md:row-span-1 rounded-3xl bg-slate-900/50 border border-slate-800 p-8 relative overflow-hidden group hover:border-teal-500/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center mb-6 text-teal-400">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Segurança Total</h3>
              <p className="text-slate-400 text-sm">
                Seus dados criptografados e protegidos.
              </p>
            </div>

            {/* Feature 4: Mobile - Small (1x1) */}
            <div className="md:col-span-1 md:row-span-1 rounded-3xl bg-slate-900/50 border border-slate-800 p-8 relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6 text-emerald-400">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Mobile First</h3>
              <p className="text-slate-400 text-sm">
                Acesse de qualquer lugar, a qualquer hora.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative z-10 py-32 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Planos simples e <span className="text-emerald-400">transparentes</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="rounded-3xl bg-slate-900/50 border border-slate-800 p-10 flex flex-col hover:border-emerald-500/30 transition-colors relative group">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <span className="bg-slate-800 text-slate-300 px-4 py-1 rounded-full text-sm font-medium border border-slate-700">
                  Para começar
                </span>
              </div>
              <h3 className="text-2xl font-bold mb-2">Gratuito</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-bold">R$ 0</span>
                <span className="text-slate-400">/mês</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                {[
                  "Até 100 produtos ativos",
                  "IA Gemini para extração",
                  "Dashboard financeiro básico",
                  "1 usuário"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-300">
                    <Check className="w-5 h-5 text-emerald-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-all"
                onClick={() => window.location.href = '/auth'}
              >
                Criar Conta Grátis
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="rounded-3xl bg-gradient-to-b from-emerald-950/30 to-slate-900/50 border border-emerald-500/30 p-10 flex flex-col relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-green-500"></div>
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Star className="w-24 h-24 text-emerald-500" />
              </div>

              <h3 className="text-2xl font-bold mb-2 text-emerald-400">orgaN MAX</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-bold">R$ 29,90</span>
                <span className="text-slate-400">/mês</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                {[
                  "Produtos ilimitados",
                  "IA Gemini Avançada",
                  "Analytics Completo",
                  "Múltiplos usuários",
                  "Suporte Prioritário"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-white">
                    <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
                      <Check className="w-3 h-3" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-lg shadow-emerald-500/20 transition-all"
              >
                Testar 14 dias Grátis
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-800 bg-slate-950">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500">
              <Package className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg">orgaN</span>
          </div>
          <div className="flex gap-8 text-sm text-slate-400">
            <a href="#" className="hover:text-emerald-400 transition-colors">Termos</a>
            <a href="#" className="hover:text-emerald-400 transition-colors">Privacidade</a>
            <a href="#" className="hover:text-emerald-400 transition-colors">Contato</a>
          </div>
          <div className="text-sm text-slate-500">
            © 2025 orgaN nlabz.
          </div>
        </div>
      </footer>
    </div>
  );
}

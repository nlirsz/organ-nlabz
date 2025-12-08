
import { useState } from "react";
import { ShoppingCart, Sparkles, BarChart3, Zap, Users, Shield, Star, ArrowRight, Check, TrendingUp, Package, CreditCard, Smartphone, Globe, Lock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Button as MovingBorderButton } from "@/components/ui/moving-border";
import { RippleGrid } from "@/components/ui/ripple-grid";

// Tilted Card Component
const TiltedCard = ({ children, className = "", ...props }: any) => {
  const [transform, setTransform] = useState("");

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 30;
    const rotateY = (centerX - x) / 30;

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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#030303] text-white relative overflow-hidden selection:bg-blue-500/30 font-sans">
      {/* Background Gradients - Subtle & Premium */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/5 blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/5 blur-[150px]" />
        <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] rounded-full bg-cyan-500/5 blur-[150px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#030303]/80 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Package className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">orgaN</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Recursos</a>
            <a href="#pricing" className="hover:text-white transition-colors">Preços</a>
            <a href="#about" className="hover:text-white transition-colors">Sobre</a>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              className="text-zinc-400 hover:text-white hover:bg-white/5"
              onClick={() => window.location.href = '/auth'}
            >
              Entrar
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 shadow-lg shadow-blue-500/20 transition-all hover:scale-105"
              onClick={() => window.location.href = '/auth'}
            >
              Começar Agora
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-40 pb-20 px-6">
        <div className="max-w-[1400px] mx-auto text-center relative z-20">

          {/* Badge */}
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Nova Versão 2.0 com IA Gemini
          </div>

          {/* Main Title */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-1000">
            Sua vida financeira <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400">
              simplificada.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
            Organize compras, rastreie preços e gerencie gastos com o poder da Inteligência Artificial.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-24 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-300">
            <Button
              size="lg"
              className="h-14 px-8 text-lg rounded-full bg-white text-black hover:bg-zinc-200 transition-all hover:scale-105"
              onClick={() => window.location.href = '/auth'}
            >
              Criar Conta Grátis
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-14 px-8 text-lg rounded-full border-zinc-800 bg-black/50 hover:bg-zinc-900 text-zinc-300 hover:text-white transition-all backdrop-blur-sm"
            >
              Ver Como Funciona
            </Button>
          </div>

          {/* Hero Image / Dashboard Preview */}
          <div className="relative max-w-6xl mx-auto animate-in fade-in zoom-in-50 duration-1000 delay-500">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur-lg opacity-20"></div>
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a0a] shadow-2xl">
              <img
                src="/assets/organ png2.png"
                alt="Dashboard Preview"
                className="w-full h-auto opacity-90"
              />
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-transparent"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Features Section */}
      <section id="features" className="relative z-10 py-32 px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">
              Tudo o que você precisa em <span className="text-blue-500">um só lugar</span>
            </h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Ferramentas poderosas para quem busca controle total.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[280px]">
            {/* Feature 1: IA Extraction - Large (2x2) */}
            <TiltedCard className="md:col-span-2 md:row-span-2 rounded-3xl bg-zinc-900/30 border border-white/5 p-8 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -mr-32 -mt-32 transition-opacity group-hover:opacity-100 opacity-50"></div>
              <div className="relative z-10 h-full flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 text-blue-400 border border-blue-500/20">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-white">Extração Inteligente</h3>
                <p className="text-zinc-400 text-lg mb-8 max-w-md leading-relaxed">
                  Cole qualquer link da Amazon, Shopee ou AliExpress. Nossa IA identifica o produto, preço e imagem instantaneamente.
                </p>
                <div className="mt-auto rounded-xl bg-black/50 border border-white/5 p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3 text-sm text-zinc-300">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    Analisando metadados do produto...
                  </div>
                </div>
              </div>
            </TiltedCard>

            {/* Feature 2: Analytics - Tall (1x2) */}
            <TiltedCard className="md:col-span-1 md:row-span-2 rounded-3xl bg-zinc-900/30 border border-white/5 p-8 relative overflow-hidden group hover:border-indigo-500/30 transition-colors">
              <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-indigo-500/5 to-transparent"></div>
              <div className="relative z-10 h-full flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-6 text-indigo-400 border border-indigo-500/20">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-white">Analytics</h3>
                <p className="text-zinc-400 mb-6 text-sm">
                  Visualize seus gastos com clareza.
                </p>
                <div className="mt-auto flex items-end gap-2 h-32 px-2">
                  {[30, 50, 40, 70, 50, 80].map((h, i) => (
                    <div key={i} className="w-full bg-indigo-500/20 rounded-t-sm hover:bg-indigo-500/40 transition-all duration-300" style={{ height: `${h}%` }}></div>
                  ))}
                </div>
              </div>
            </TiltedCard>

            {/* Feature 3: Security - Small (1x1) */}
            <TiltedCard className="md:col-span-1 md:row-span-1 rounded-3xl bg-zinc-900/30 border border-white/5 p-8 relative overflow-hidden group hover:border-cyan-500/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4 text-cyan-400 border border-cyan-500/20">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-white">Segurança</h3>
              <p className="text-zinc-400 text-sm">
                Criptografia de ponta a ponta.
              </p>
            </TiltedCard>

            {/* Feature 4: Mobile - Small (1x1) */}
            <TiltedCard className="md:col-span-1 md:row-span-1 rounded-3xl bg-zinc-900/30 border border-white/5 p-8 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4 text-blue-400 border border-blue-500/20">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-white">Mobile First</h3>
              <p className="text-zinc-400 text-sm">
                App otimizado para iOS e Android.
              </p>
            </TiltedCard>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 py-32 px-6 bg-zinc-950/50">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">
              Planos <span className="text-blue-500">Flexíveis</span>
            </h2>
            <p className="text-xl text-zinc-400">Comece grátis, evolua quando precisar.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="rounded-3xl bg-zinc-900/20 border border-white/5 p-10 flex flex-col hover:border-white/10 transition-colors relative group">
              <h3 className="text-2xl font-bold mb-2 text-white">Starter</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-bold text-white">R$ 0</span>
                <span className="text-zinc-500">/mês</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                {[
                  "Até 50 produtos",
                  "IA Básica",
                  "1 Usuário",
                  "Suporte por email"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-zinc-400">
                    <Check className="w-5 h-5 text-zinc-600" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full h-12 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-all"
                onClick={() => window.location.href = '/auth'}
              >
                Criar Conta
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="rounded-3xl bg-gradient-to-b from-blue-900/20 to-zinc-900/20 border border-blue-500/30 p-10 flex flex-col relative overflow-hidden group shadow-2xl shadow-blue-900/10">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
              <div className="absolute top-4 right-4">
                <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs font-bold border border-blue-500/20">
                  MAIS POPULAR
                </span>
              </div>

              <h3 className="text-2xl font-bold mb-2 text-white">Pro</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-bold text-white">R$ 29,90</span>
                <span className="text-zinc-500">/mês</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                {[
                  "Produtos Ilimitados",
                  "IA Avançada (Gemini Pro)",
                  "Analytics Completo",
                  "Prioridade no Suporte",
                  "Acesso Antecipado"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-white">
                    <div className="p-1 rounded-full bg-blue-500/20 text-blue-400">
                      <Check className="w-3 h-3" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg shadow-blue-500/20 transition-all"
              >
                Começar Teste Grátis
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-[#050505]">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-500">
              <Package className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-white">orgaN</span>
          </div>
          <div className="flex gap-8 text-sm text-zinc-500">
            <a href="#" className="hover:text-blue-400 transition-colors">Termos</a>
            <a href="#" className="hover:text-blue-400 transition-colors">Privacidade</a>
            <a href="#" className="hover:text-blue-400 transition-colors">Contato</a>
          </div>
          <div className="text-sm text-zinc-600">
            © 2025 orgaN nlabz.
          </div>
        </div>
      </footer>
    </div>
  );
}

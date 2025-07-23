import { useState } from "react";
import { ShoppingCart, Sparkles, BarChart3, Zap, Users, Shield, Star, ArrowRight, Check, TrendingUp, Package, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    const rotateX = (y - centerY) / 25; // Reduzido de 10 para 25
    const rotateY = (centerX - x) / 25; // Reduzido de 10 para 25

    setTransform(
      `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)` // Reduzido scale de 1.02 para 1.01
    );
  };

  const handleMouseLeave = () => {
    setTransform("");
  };

  return (
    <div
      className={`transition-transform duration-500 ease-out ${className}`} // Aumentado duration para transição mais suave
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

export default function LandingPage() {
  const features = [
    {
      icon: <Sparkles className="w-8 h-8 text-purple-400" />,
      title: "IA Inteligente",
      description: "Adicione produtos apenas colando URLs. Nossa IA extrai automaticamente nome, preço, imagens e categoria usando Gemini AI.",
      gradient: "from-purple-500 to-pink-600"
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-blue-400" />,
      title: "Dashboard Financeiro",
      description: "Acompanhe seus gastos com análises detalhadas por categoria, loja e período. Visualize seu histórico de compras.",
      gradient: "from-blue-500 to-cyan-600"
    },
    {
      icon: <ShoppingCart className="w-8 h-8 text-emerald-400" />,
      title: "Lista Inteligente",
      description: "Organize produtos por categoria, marque como comprados, e tenha controle total da sua lista de compras.",
      gradient: "from-emerald-500 to-teal-600"
    },
    {
      icon: <CreditCard className="w-8 h-8 text-orange-400" />,
      title: "Parcelamento",
      description: "Configure pagamentos parcelados e acompanhe suas prestações com notificações de vencimento.",
      gradient: "from-orange-500 to-red-600"
    },
    {
      icon: <Users className="w-8 h-8 text-indigo-400" />,
      title: "Multi-usuário",
      description: "Cada usuário tem sua lista pessoal e dados privados com sistema de autenticação seguro.",
      gradient: "from-indigo-500 to-purple-600"
    },
    {
      icon: <Shield className="w-8 h-8 text-rose-400" />,
      title: "Design Moderno",
      description: "Interface elegante com design neumórfico, tema escuro/claro e experiência visual única.",
      gradient: "from-rose-500 to-pink-600"
    }
  ];

  const plans = [
    {
      name: "Gratuito",
      price: "R$ 0",
      period: "/mês",
      description: "Perfeito para começar",
      features: [
        "Até 50 produtos",
        "IA básica para extração",
        "Dashboard simples",
        "1 usuário"
      ],
      highlighted: false
    },
    {
      name: "Premium",
      price: "R$ 19,90",
      period: "/mês",
      description: "Para usuários avançados",
      features: [
        "Produtos ilimitados",
        "IA avançada Gemini",
        "Dashboard completo",
        "Parcelamento avançado",
        "Notificações push",
        "Suporte prioritário"
      ],
      highlighted: true
    },
    {
      name: "Família",
      price: "R$ 39,90",
      period: "/mês",
      description: "Para toda a família",
      features: [
        "Tudo do Premium",
        "Até 5 usuários",
        "Listas compartilhadas",
        "Controle parental",
        "Backup automático"
      ],
      highlighted: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <FloatingElement delay={0} className="absolute top-20 left-10 opacity-30">
          <div className="w-64 h-64 bg-gradient-to-r from-emerald-500/30 to-green-500/30 rounded-full blur-3xl"></div>
        </FloatingElement>
        <FloatingElement delay={1} className="absolute top-40 right-20 opacity-25">
          <div className="w-48 h-48 bg-gradient-to-r from-green-500/25 to-teal-500/25 rounded-full blur-3xl"></div>
        </FloatingElement>
        <FloatingElement delay={2} className="absolute bottom-40 left-1/4 opacity-35">
          <div className="w-80 h-80 bg-gradient-to-r from-emerald-500/35 to-green-600/35 rounded-full blur-3xl"></div>
        </FloatingElement>
        <PulseElement delay={0.5} className="absolute top-1/2 right-10 opacity-20">
          <div className="w-40 h-40 bg-gradient-to-r from-gray-500/20 to-slate-500/20 rounded-full blur-2xl"></div>
        </PulseElement>
        <FloatingElement delay={3} className="absolute bottom-20 right-1/3 opacity-25">
          <div className="w-56 h-56 bg-gradient-to-r from-green-500/25 to-emerald-500/25 rounded-full blur-3xl"></div>
        </FloatingElement>
      </div>

      {/* Hero Section */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex flex-col items-center justify-center mb-12">
            <div className="w-28 h-28 bg-gradient-to-br from-[#121212] via-[#1a1a1a] to-[#121212] rounded-full flex items-center justify-center mb-6 shadow-2xl border-4 border-gradient-to-r from-purple-400/40 to-pink-400/40 backdrop-blur-sm relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400/20 to-pink-400/20 blur-lg"></div>
              <img 
                src="/assets/logo.png" 
                alt="orgaN Logo" 
                className="w-16 h-16 object-contain relative z-10"
              />
            </div>
            <h1 className="text-7xl md:text-9xl font-black tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 900 }}>
              orgaN
            </h1>
            <div className="w-32 h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mt-4 opacity-60"></div>
          </div>

          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            A lista de compras mais inteligente e organizada do Brasil. Use IA para adicionar produtos automaticamente e controle seus gastos como nunca antes.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
            <TiltedCard>
              <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-10 py-4 text-lg rounded-2xl shadow-2xl border border-purple-400/30">
                Começar Gratuitamente
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </TiltedCard>
            <TiltedCard>
              <Button variant="outline" size="lg" className="px-10 py-4 text-lg rounded-2xl bg-transparent border-2 border-purple-400/50 text-purple-300 hover:bg-purple-400/10">
                Ver Demonstração
              </Button>
            </TiltedCard>
          </div>

          {/* Feature Highlights */}
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <TiltedCard className="group">
                <div className="text-center p-8 bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-2xl backdrop-blur-lg border border-purple-400/20 group-hover:border-purple-400/40 transition-all duration-300">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">IA Inteligente</h3>
                  <p className="text-gray-300 text-sm">Cole uma URL e nossa IA extrai automaticamente todas as informações do produto</p>
                </div>
              </TiltedCard>
              <TiltedCard className="group">
                <div className="text-center p-8 bg-gradient-to-br from-blue-900/30 to-cyan-900/30 rounded-2xl backdrop-blur-lg border border-blue-400/20 group-hover:border-blue-400/40 transition-all duration-300">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Controle Financeiro</h3>
                  <p className="text-gray-300 text-sm">Dashboard completo para acompanhar seus gastos e parcelamentos</p>
                </div>
              </TiltedCard>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Funcionalidades <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Revolucionárias</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Descubra como nossa tecnologia pode transformar sua experiência de compras online
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <TiltedCard key={index} className="h-full group">
                <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm p-8 h-full rounded-2xl border border-gray-700/50 group-hover:border-purple-400/30 transition-all duration-300 shadow-2xl">
                  <FloatingElement delay={index * 0.2}>
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center mb-6 shadow-lg`}>
                      {feature.icon}
                    </div>
                  </FloatingElement>
                  <h3 className="text-xl font-bold text-white mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-gray-300 flex-grow leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </TiltedCard>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Escolha seu <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">plano</span>
            </h2>
            <p className="text-xl text-gray-300">
              Planos flexíveis para todos os tipos de usuário
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <TiltedCard key={index} className="h-full group">
                <div className={`bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm p-8 h-full relative rounded-2xl border transition-all duration-300 shadow-2xl ${
                  plan.highlighted 
                    ? 'border-purple-400/50 ring-2 ring-purple-400/20' 
                    : 'border-gray-700/50 group-hover:border-purple-400/30'
                }`}>
                  {plan.highlighted && (
                    <PulseElement>
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                          Mais Popular
                        </span>
                      </div>
                    </PulseElement>
                  )}

                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {plan.name}
                    </h3>
                    <div className="mb-2">
                      <span className="text-4xl font-bold text-white">
                        {plan.price}
                      </span>
                      <span className="text-gray-400">
                        {plan.period}
                      </span>
                    </div>
                    <p className="text-gray-300">
                      {plan.description}
                    </p>
                  </div>

                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <Check className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0" />
                        <span className="text-gray-300">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className={`w-full rounded-xl py-3 transition-all duration-300 ${
                      plan.highlighted 
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg'
                        : 'bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white border border-gray-600'
                    }`}
                  >
                    {plan.name === 'Gratuito' ? 'Começar Grátis' : 'Assinar Agora'}
                  </Button>
                </div>
              </TiltedCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 px-4">
        <TiltedCard className="max-w-4xl mx-auto">
          <div className="text-center bg-gradient-to-r from-purple-900/80 to-pink-900/80 backdrop-blur-sm p-12 rounded-3xl border border-purple-400/30 shadow-2xl">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Pronto para revolucionar suas compras?
            </h2>
            <p className="text-xl text-purple-100 mb-8">
              Junte-se a milhares de usuários que já transformaram sua experiência de compras
            </p>
            <PulseElement>
              <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 px-10 py-4 text-lg font-bold rounded-2xl shadow-lg">
                Começar Gratuitamente Agora
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </PulseElement>
          </div>
        </TiltedCard>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-4 bg-slate-900/50 backdrop-blur-sm border-t border-gray-700/50">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-[#121212] to-[#1a1a1a] rounded-full flex items-center justify-center mr-3 border-2 border-purple-400/30 relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400/10 to-pink-400/10 blur-sm"></div>
              <img src="/assets/logo.png" alt="orgaN Logo" className="w-8 h-8 object-contain relative z-10" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 800 }}>orgaN</span>
          </div>
          <p className="text-gray-400 mb-4">
            A lista de compras mais inteligente e organizada do Brasil
          </p>
          <p className="text-gray-500 text-sm">
            © 2025 orgaN. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
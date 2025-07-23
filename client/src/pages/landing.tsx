
import { useState } from "react";
import { ShoppingCart, Sparkles, BarChart3, Zap, Users, Shield, Star, ArrowRight, Check, TrendingUp, Package, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Button as MovingBorderButton } from "@/components/ui/moving-border";

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
  const features = [
    {
      icon: <Sparkles className="w-8 h-8 text-emerald-400" />,
      title: "IA Inteligente",
      description: "Adicione produtos apenas colando URLs. Nossa IA extrai automaticamente nome, preço, imagens e categoria usando Gemini AI.",
      gradient: "from-emerald-500 to-green-600"
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-green-400" />,
      title: "Dashboard Financeiro",
      description: "Acompanhe seus gastos com análises detalhadas por categoria, loja e período. Visualize seu histórico de compras.",
      gradient: "from-green-500 to-emerald-600"
    },
    {
      icon: <ShoppingCart className="w-8 h-8 text-emerald-400" />,
      title: "Lista Inteligente",
      description: "Organize produtos por categoria, marque como comprados, e tenha controle total da sua lista de compras.",
      gradient: "from-emerald-500 to-green-600"
    },
    {
      icon: <CreditCard className="w-8 h-8 text-green-400" />,
      title: "Parcelamento",
      description: "Configure pagamentos parcelados e acompanhe suas prestações com notificações de vencimento.",
      gradient: "from-green-500 to-emerald-600"
    },
    {
      icon: <Users className="w-8 h-8 text-emerald-400" />,
      title: "Multi-usuário",
      description: "Cada usuário tem sua lista pessoal e dados privados com sistema de autenticação seguro.",
      gradient: "from-emerald-500 to-green-600"
    },
    {
      icon: <Shield className="w-8 h-8 text-green-400" />,
      title: "Design Moderno",
      description: "Interface elegante com design neumórfico, tema escuro/claro e experiência visual única.",
      gradient: "from-green-500 to-emerald-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <FloatingElement delay={0} className="absolute top-20 left-10 opacity-30">
          <div className="w-64 h-64 bg-gradient-to-r from-emerald-500/30 to-green-500/30 rounded-full blur-3xl"></div>
        </FloatingElement>
        <FloatingElement delay={1} className="absolute top-40 right-20 opacity-25">
          <div className="w-48 h-48 bg-gradient-to-r from-green-500/25 to-emerald-500/25 rounded-full blur-3xl"></div>
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
            <div className="mb-8 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-green-400/20 blur-2xl rounded-full"></div>
              <img 
                src="/assets/organ png2.png" 
                alt="orgaN" 
                className="h-32 md:h-40 w-auto relative z-10 drop-shadow-2xl"
              />
            </div>
            <div className="w-32 h-1 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full opacity-60"></div>
          </div>

          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            A lista de compras mais inteligente e organizada do Brasil. Use IA para adicionar produtos automaticamente e controle seus gastos como nunca antes.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
            <TiltedCard>
              <Button size="lg" className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-10 py-4 text-lg rounded-2xl shadow-2xl border border-emerald-400/30">
                Começar Gratuitamente
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </TiltedCard>
            <TiltedCard>
              <Button variant="outline" size="lg" className="px-10 py-4 text-lg rounded-2xl bg-transparent border-2 border-emerald-400/50 text-emerald-300 hover:bg-emerald-400/10">
                Ver Demonstração
              </Button>
            </TiltedCard>
          </div>

          {/* Feature Highlights */}
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <TiltedCard className="group">
                <div className="text-center p-8 bg-gradient-to-br from-gray-900/30 to-slate-900/30 rounded-2xl backdrop-blur-lg border border-emerald-400/20 group-hover:border-emerald-400/40 transition-all duration-300">
                  <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">IA Inteligente</h3>
                  <p className="text-gray-300 text-sm">Cole uma URL e nossa IA extrai automaticamente todas as informações do produto</p>
                </div>
              </TiltedCard>
              <TiltedCard className="group">
                <div className="text-center p-8 bg-gradient-to-br from-gray-900/30 to-slate-900/30 rounded-2xl backdrop-blur-lg border border-green-400/20 group-hover:border-green-400/40 transition-all duration-300">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
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
              Funcionalidades <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">Revolucionárias</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Descubra como nossa tecnologia pode transformar sua experiência de compras online
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <TiltedCard key={index} className="h-full group">
                <div className="bg-gradient-to-br from-slate-800/80 to-gray-900/80 backdrop-blur-sm p-8 h-full rounded-2xl border border-gray-700/50 group-hover:border-emerald-400/30 transition-all duration-300 shadow-2xl">
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
              Escolha seu <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">plano</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Comece gratuitamente e evolua conforme suas necessidades. Sem compromisso, sem pegadinhas.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Plano Gratuito - Principal com borda em movimento */}
            <TiltedCard className="h-full group transform lg:scale-105">
              <AnimatedBorder className="relative">
                <div className="bg-gradient-to-br from-slate-800/95 to-gray-900/95 backdrop-blur-sm p-8 h-full rounded-3xl border border-emerald-400/50 shadow-2xl">
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-emerald-600 to-green-600 text-white px-8 py-3 rounded-full text-sm font-bold shadow-2xl border border-emerald-400/30">
                      🔥 Recomendado
                    </span>
                  </div>

                  <div className="text-center mb-8 mt-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full mb-6 shadow-xl">
                      <Package className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-3">Gratuito</h3>
                    <div className="mb-6">
                      <span className="text-5xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent drop-shadow-lg">
                        R$ 0
                      </span>
                      <span className="text-gray-400 text-xl">/mês</span>
                    </div>
                    <p className="text-gray-300 text-base leading-relaxed">
                      Perfeito para começar e experimentar todas as funcionalidades básicas
                    </p>
                  </div>

                  <ul className="space-y-4 mb-10">
                    {[
                      "Até 100 produtos",
                      "IA Gemini para extração",
                      "Dashboard financeiro básico",
                      "Controle de parcelamentos",
                      "1 usuário",
                      "Suporte por email"
                    ].map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-base">
                        <Check className="w-5 h-5 text-emerald-400 mr-4 flex-shrink-0" />
                        <span className="text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button className="w-full rounded-2xl py-4 bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-600 hover:from-emerald-700 hover:via-green-700 hover:to-emerald-700 text-white text-lg shadow-2xl transition-all duration-300 font-bold border border-emerald-400/30">
                    Começar Gratuitamente
                  </Button>
                </div>
              </AnimatedBorder>
            </TiltedCard>

            {/* Plano MAX (antigo Pro) - Com cadeado e blur */}
            <TiltedCard className="h-full group relative">
              <div className="relative bg-gradient-to-br from-slate-800/60 to-gray-900/60 backdrop-blur-xl p-8 h-full rounded-3xl border border-gray-600/30 shadow-2xl overflow-hidden">
                {/* Overlay de blur e cadeado */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 to-gray-900/80 backdrop-blur-sm rounded-3xl z-10 flex flex-col items-center justify-center">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mb-6 shadow-2xl">
                      <Shield className="w-12 h-12 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-4">Em Breve</h3>
                    <p className="text-gray-300 text-lg max-w-xs mx-auto leading-relaxed">
                      Funcionalidades avançadas chegando em breve. Cadastre-se para ser notificado!
                    </p>
                    <Button className="mt-6 rounded-2xl py-3 px-8 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold shadow-xl transition-all duration-300">
                      Ser Notificado
                    </Button>
                  </div>
                </div>

                {/* Conteúdo original (blur de fundo) */}
                <div className="text-center mb-8 blur-sm">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mb-6">
                    <TrendingUp className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-3">MAX</h3>
                  <div className="mb-6">
                    <span className="text-5xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                      R$ 29,90
                    </span>
                    <span className="text-gray-400 text-xl">/mês</span>
                  </div>
                  <p className="text-gray-300 text-base">
                    Para usuários que querem aproveitar todo o potencial da plataforma
                  </p>
                </div>

                <ul className="space-y-4 mb-10 blur-sm">
                  {[
                    "Produtos ilimitados",
                    "IA Gemini avançada",
                    "Dashboard completo com analytics",
                    "Parcelamento inteligente",
                    "Histórico de preços",
                    "Notificações personalizadas",
                    "Múltiplos usuários (até 10)",
                    "Suporte prioritário 24/7",
                    "Relatórios avançados",
                    "Integração com APIs"
                  ].map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center text-base">
                      <Check className="w-5 h-5 text-amber-400 mr-4 flex-shrink-0" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="blur-sm">
                  <Button className="w-full rounded-2xl py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-lg shadow-2xl transition-all duration-300 font-bold">
                    Começar Teste Grátis
                  </Button>
                  <p className="text-xs text-gray-400 text-center mt-3">
                    14 dias grátis, cancele quando quiser
                  </p>
                </div>
              </div>
            </TiltedCard>
          </div>

          {/* Features Comparison */}
          <div className="mt-16 text-center">
            <p className="text-gray-400 mb-4">
              🔒 Todos os planos incluem: Segurança SSL, Backup automático, Atualizações gratuitas
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
              <span className="flex items-center">
                <Shield className="w-4 h-4 mr-2 text-emerald-400" />
                Dados 100% seguros
              </span>
              <span className="flex items-center">
                <Zap className="w-4 h-4 mr-2 text-emerald-400" />
                Performance otimizada
              </span>
              <span className="flex items-center">
                <Star className="w-4 h-4 mr-2 text-emerald-400" />
                Sem pegadinhas
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 px-4">
        <TiltedCard className="max-w-4xl mx-auto">
          <div className="text-center bg-gradient-to-r from-gray-900/80 to-slate-900/80 backdrop-blur-sm p-12 rounded-3xl border border-emerald-400/30 shadow-2xl">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Pronto para revolucionar suas compras?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Junte-se a milhares de usuários que já transformaram sua experiência de compras
            </p>
            <PulseElement>
              <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100 px-10 py-4 text-lg font-bold rounded-2xl shadow-lg">
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
            <img 
              src="/assets/organ png2.png" 
              alt="orgaN" 
              className="h-12 w-auto opacity-80"
            />
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


import { useState } from "react";
import { ShoppingCart, Sparkles, BarChart3, Zap, Users, Shield, Star, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

// Tilted Card Component from ReactBits
const TiltedCard = ({ children, className = "", ...props }: any) => {
  const [transform, setTransform] = useState("");

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;

    setTransform(
      `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`
    );
  };

  const handleMouseLeave = () => {
    setTransform("");
  };

  return (
    <div
      className={`transition-transform duration-300 ease-out ${className}`}
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
  const features = [
    {
      icon: <Sparkles className="w-8 h-8 text-blue-500" />,
      title: "IA Inteligente",
      description: "Adicione produtos apenas colando URLs. Nossa IA extrai automaticamente nome, preço, imagens e categoria usando Gemini AI.",
      gradient: "from-blue-500 to-purple-600"
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-green-500" />,
      title: "Dashboard Financeiro",
      description: "Acompanhe seus gastos com análises detalhadas por categoria, loja e período. Visualize seu histórico de compras.",
      gradient: "from-green-500 to-emerald-600"
    },
    {
      icon: <ShoppingCart className="w-8 h-8 text-orange-500" />,
      title: "Lista Inteligente",
      description: "Organize produtos por categoria, marque como comprados, e tenha controle total da sua lista de compras.",
      gradient: "from-orange-500 to-red-600"
    },
    {
      icon: <Zap className="w-8 h-8 text-yellow-500" />,
      title: "Parcelamento",
      description: "Configure pagamentos parcelados e acompanhe suas prestações com notificações de vencimento.",
      gradient: "from-yellow-500 to-orange-600"
    },
    {
      icon: <Users className="w-8 h-8 text-indigo-500" />,
      title: "Multi-usuário",
      description: "Cada usuário tem sua lista pessoal e dados privados com sistema de autenticação seguro.",
      gradient: "from-indigo-500 to-purple-600"
    },
    {
      icon: <Shield className="w-8 h-8 text-emerald-500" />,
      title: "Design Neumórfico",
      description: "Interface moderna com design neumórfico, tema escuro/claro e experiência visual única.",
      gradient: "from-emerald-500 to-teal-600"
    }
  ];

  const testimonials = [
    {
      name: "João Silva",
      role: "Usuário Premium",
      content: "Revolucionou minha forma de fazer compras online. A IA é impressionante!",
      rating: 5
    },
    {
      name: "Maria Santos",
      role: "Empresária",
      content: "O dashboard financeiro me ajuda a controlar gastos de forma inteligente.",
      rating: 5
    },
    {
      name: "Pedro Costa",
      role: "Desenvolvedor",
      content: "Interface moderna e funcionalidades incríveis. Parabéns ao time!",
      rating: 5
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center mb-8">
            <img 
              src="/assets/logo.png" 
              alt="Smart Shopping Logo" 
              className="w-16 h-16 mr-4"
            />
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Smart Shopping List
            </h1>
          </div>
          
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto">
            A lista de compras mais inteligente do Brasil. Use IA para adicionar produtos automaticamente e controle seus gastos como nunca antes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg">
              Começar Gratuitamente
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button variant="outline" size="lg" className="px-8 py-3 text-lg">
              Ver Demonstração
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">10k+</div>
              <div className="text-gray-600 dark:text-gray-400">Usuários Ativos</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">1M+</div>
              <div className="text-gray-600 dark:text-gray-400">Produtos Adicionados</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">99%</div>
              <div className="text-gray-600 dark:text-gray-400">Precisão da IA</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Funcionalidades Revolucionárias
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Descubra como nossa tecnologia pode transformar sua experiência de compras online
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <TiltedCard key={index} className="h-full">
                <div className="neomorphic-card p-8 h-full flex flex-col">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center mb-6`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 flex-grow">
                    {feature.description}
                  </p>
                </div>
              </TiltedCard>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-white/50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              O que nossos usuários dizem
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <TiltedCard key={index} className="h-full">
                <div className="neomorphic-card p-8 h-full">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-500 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-6 italic">
                    "{testimonial.content}"
                  </p>
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">
                      {testimonial.name}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 text-sm">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </TiltedCard>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Escolha seu plano
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Planos flexíveis para todos os tipos de usuário
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <TiltedCard key={index} className="h-full">
                <div className={`neomorphic-card p-8 h-full relative ${
                  plan.highlighted ? 'ring-2 ring-blue-500' : ''
                }`}>
                  {plan.highlighted && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-bold">
                        Mais Popular
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {plan.name}
                    </h3>
                    <div className="mb-2">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">
                        {plan.price}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {plan.period}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300">
                      {plan.description}
                    </p>
                  </div>

                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-600 dark:text-gray-300">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className={`w-full ${
                      plan.highlighted 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
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
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Pronto para revolucionar suas compras?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Junte-se a milhares de usuários que já transformaram sua experiência de compras
          </p>
          <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 text-lg font-bold">
            Começar Gratuitamente Agora
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center mb-6">
            <img src="/assets/logo.png" alt="Smart Shopping Logo" className="w-8 h-8 mr-2" />
            <span className="text-xl font-bold">Smart Shopping List</span>
          </div>
          <p className="text-gray-400 mb-4">
            A lista de compras mais inteligente do Brasil
          </p>
          <p className="text-gray-500 text-sm">
            © 2025 Smart Shopping List. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

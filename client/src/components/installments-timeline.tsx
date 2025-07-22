
import { useState, useEffect } from 'react';
import { Calendar, CreditCard, Clock, CheckCircle, AlertCircle, DollarSign, X, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';

interface InstallmentData {
  id: number;
  productName: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  dueDate: string;
  month: number;
  year: number;
  isPaid: boolean;
  productId: number;
}

interface MonthData {
  month: number;
  monthName: string;
  fullName: string;
  installments: InstallmentData[];
  totalAmount: number;
}

export function InstallmentsTimeline() {
  const [installments, setInstallments] = useState<InstallmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<MonthData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const months = [
    { num: 1, name: 'JAN', fullName: 'Janeiro' },
    { num: 2, name: 'FEV', fullName: 'Fevereiro' },
    { num: 3, name: 'MAR', fullName: 'Março' },
    { num: 4, name: 'ABR', fullName: 'Abril' },
    { num: 5, name: 'MAI', fullName: 'Maio' },
    { num: 6, name: 'JUN', fullName: 'Junho' },
    { num: 7, name: 'JUL', fullName: 'Julho' },
    { num: 8, name: 'AGO', fullName: 'Agosto' },
    { num: 9, name: 'SET', fullName: 'Setembro' },
    { num: 10, name: 'OUT', fullName: 'Outubro' },
    { num: 11, name: 'NOV', fullName: 'Novembro' },
    { num: 12, name: 'DEZ', fullName: 'Dezembro' }
  ];

  useEffect(() => {
    fetchInstallments();
  }, [selectedYear]);

  const fetchInstallments = async () => {
    try {
      setLoading(true);
      const authToken = localStorage.getItem('authToken');
      if (!authToken) return;

      const response = await fetch('/api/installments', {
        headers: {
          'x-auth-token': authToken,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Filtrar parcelas do ano selecionado
        const yearInstallments = data.filter((inst: any) => {
          const date = new Date(inst.dueDate);
          return date.getFullYear() === selectedYear;
        });
        setInstallments(yearInstallments);
      }
    } catch (error) {
      console.error('Erro ao buscar parcelas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMonthData = (): MonthData[] => {
    return months.map(month => {
      const monthInstallments = installments.filter(inst => {
        const date = new Date(inst.dueDate);
        return date.getMonth() + 1 === month.num;
      });

      const totalAmount = monthInstallments.reduce((sum, inst) => sum + inst.amount, 0);

      return {
        month: month.num,
        monthName: month.name,
        fullName: month.fullName,
        installments: monthInstallments,
        totalAmount
      };
    });
  };

  const monthsData = getMonthData();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const yearTotal = monthsData.reduce((sum, month) => sum + month.totalAmount, 0);

  const handleMonthClick = (monthData: MonthData) => {
    if (monthData.installments.length > 0) {
      setSelectedMonth(monthData);
      setIsModalOpen(true);
    }
  };

  const getInstallmentStatus = (installment: InstallmentData) => {
    const dueDate = new Date(installment.dueDate);
    const today = new Date();
    const daysDiff = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (installment.isPaid) return 'paid';
    if (daysDiff < 0) return 'overdue';
    if (daysDiff <= 7) return 'due-soon';
    return 'pending';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'overdue': return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'due-soon': return <Clock className="w-4 h-4 text-yellow-600" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    const badges = {
      paid: 'Pago',
      overdue: 'Vencido',
      'due-soon': 'Vence em breve',
      pending: 'A vencer'
    };
    return badges[status as keyof typeof badges];
  };

  const getStatusColor = (status: string) => {
    const colors = {
      paid: 'text-green-600 bg-green-50',
      overdue: 'text-red-600 bg-red-50',
      'due-soon': 'text-yellow-600 bg-yellow-50',
      pending: 'text-blue-600 bg-blue-50'
    };
    return colors[status as keyof typeof colors];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com seletor de ano e resumo */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" style={{ color: 'var(--primary-action)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Timeline de Parcelas
            </h2>
          </div>
          
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="neomorphic-input px-3 py-2 rounded-lg border-0 text-sm"
            style={{ color: 'var(--text-primary)' }}
          >
            {[...Array(5)].map((_, i) => {
              const year = currentYear + i - 2;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
        </div>
        
        {yearTotal > 0 && (
          <div className="flex items-center gap-2 neomorphic-card px-4 py-2 rounded-lg">
            <DollarSign className="w-4 h-4" style={{ color: 'var(--primary-action)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Total {selectedYear}: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(yearTotal)}
            </span>
          </div>
        )}
      </div>

      {/* Grid da Timeline - mais compacto */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {monthsData.map((monthData) => {
          const isCurrentMonth = monthData.month === currentMonth && selectedYear === currentYear;
          const hasInstallments = monthData.installments.length > 0;

          return (
            <div
              key={monthData.month}
              className={`
                neomorphic-card rounded-lg p-3 min-h-[120px] transition-all duration-200 cursor-pointer
                ${isCurrentMonth ? 'ring-2 ring-blue-500' : ''}
                ${hasInstallments ? 'hover:shadow-lg hover:scale-105' : 'opacity-60'}
              `}
              onClick={() => handleMonthClick(monthData)}
            >
              {/* Cabeçalho do Mês */}
              <div className="text-center mb-3">
                <h3 
                  className={`font-bold text-sm mb-1 ${isCurrentMonth ? 'text-blue-600' : ''}`}
                  style={{ color: isCurrentMonth ? 'var(--primary-action)' : 'var(--text-primary)' }}
                >
                  {monthData.monthName}
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {monthData.fullName}
                </p>
              </div>

              {/* Informações das Parcelas */}
              {hasInstallments ? (
                <div className="space-y-2">
                  <div className="text-center">
                    <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {monthData.installments.length} parcela{monthData.installments.length > 1 ? 's' : ''}
                    </p>
                    <p className="text-sm font-bold" style={{ color: 'var(--primary-action)' }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthData.totalAmount)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2">
                  <div className="w-6 h-6 mx-auto mb-1 neomorphic-card rounded-full flex items-center justify-center opacity-30">
                    <Calendar className="w-3 h-3" style={{ color: 'var(--text-secondary)' }} />
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Sem parcelas
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal com detalhes do mês */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Parcelas de {selectedMonth?.fullName} {selectedYear}
            </DialogTitle>
          </DialogHeader>
          
          {selectedMonth && (
            <div className="space-y-4 mt-4">
              {/* Resumo do mês */}
              <div className="flex items-center justify-between p-4 neomorphic-card rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Total de parcelas</p>
                  <p className="text-lg font-bold">{selectedMonth.installments.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Valor total</p>
                  <p className="text-lg font-bold text-blue-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedMonth.totalAmount)}
                  </p>
                </div>
              </div>

              {/* Lista detalhada das parcelas */}
              <div className="space-y-3">
                {selectedMonth.installments
                  .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                  .map((installment) => {
                    const status = getInstallmentStatus(installment);
                    const dueDate = new Date(installment.dueDate);

                    return (
                      <div
                        key={installment.id}
                        className="p-4 border rounded-lg neomorphic-card"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm mb-2">{installment.productName}</h4>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                              <span className="flex items-center gap-1">
                                <CreditCard className="w-4 h-4" />
                                {installment.installmentNumber}/{installment.totalInstallments}x
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {dueDate.toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {getStatusIcon(status)}
                              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(status)}`}>
                                {getStatusText(status)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-lg font-bold text-blue-600">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(installment.amount)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Estatísticas resumidas */}
      {installments.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="neomorphic-card p-4 rounded-xl text-center">
            <div className="w-10 h-10 neomorphic-card rounded-full flex items-center justify-center mx-auto mb-2">
              <CreditCard className="w-5 h-5" style={{ color: 'var(--primary-action)' }} />
            </div>
            <h4 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Total Parcelas
            </h4>
            <p className="text-xl font-bold" style={{ color: 'var(--primary-action)' }}>
              {installments.length}
            </p>
          </div>

          <div className="neomorphic-card p-4 rounded-xl text-center">
            <div className="w-10 h-10 neomorphic-card rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <h4 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Pagas
            </h4>
            <p className="text-xl font-bold text-green-600">
              {installments.filter(i => i.isPaid).length}
            </p>
          </div>

          <div className="neomorphic-card p-4 rounded-xl text-center">
            <div className="w-10 h-10 neomorphic-card rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <h4 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Vencidas
            </h4>
            <p className="text-xl font-bold text-red-600">
              {installments.filter(i => {
                const dueDate = new Date(i.dueDate);
                return dueDate < new Date() && !i.isPaid;
              }).length}
            </p>
          </div>

          <div className="neomorphic-card p-4 rounded-xl text-center">
            <div className="w-10 h-10 neomorphic-card rounded-full flex items-center justify-center mx-auto mb-2">
              <Clock className="w-5 h-5" style={{ color: 'var(--primary-action)' }} />
            </div>
            <h4 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Pendentes
            </h4>
            <p className="text-xl font-bold" style={{ color: 'var(--primary-action)' }}>
              {installments.filter(i => !i.isPaid).length}
            </p>
          </div>
        </div>
      )}

      {/* Mensagem quando não há parcelas */}
      {installments.length === 0 && !loading && (
        <div className="text-center py-12 neomorphic-card rounded-xl">
          <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: 'var(--text-secondary)' }} />
          <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Nenhuma parcela encontrada
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Cadastre pagamentos com parcelas para visualizar a timeline
          </p>
        </div>
      )}
    </div>
  );
}

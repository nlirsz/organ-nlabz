
import { useState, useEffect } from 'react';
import { Calendar, CreditCard, Clock, CheckCircle } from 'lucide-react';

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
  installments: InstallmentData[];
  totalAmount: number;
}

export function InstallmentsTimeline() {
  const [installments, setInstallments] = useState<InstallmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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
        installments: monthInstallments,
        totalAmount
      };
    });
  };

  const monthsData = getMonthData();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Year Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5" style={{ color: 'var(--primary-action)' }} />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="neomorphic-input px-4 py-2 rounded-lg border-0"
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
        
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Total do ano: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
            monthsData.reduce((sum, month) => sum + month.totalAmount, 0)
          )}
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="grid grid-cols-12 gap-2">
        {monthsData.map((monthData) => {
          const isCurrentMonth = monthData.month === currentMonth && selectedYear === currentYear;
          const hasPastDue = monthData.installments.some(inst => {
            const dueDate = new Date(inst.dueDate);
            return dueDate < new Date() && !inst.isPaid;
          });

          return (
            <div
              key={monthData.month}
              className={`
                neomorphic-card rounded-xl p-3 min-h-[200px] transition-all duration-200 hover:shadow-lg
                ${isCurrentMonth ? 'ring-2 ring-blue-500' : ''}
                ${hasPastDue ? 'border-l-4 border-red-500' : ''}
              `}
            >
              {/* Month Header */}
              <div className="text-center mb-3">
                <h4 
                  className={`font-bold text-sm ${isCurrentMonth ? 'text-blue-600' : ''}`}
                  style={{ color: isCurrentMonth ? 'var(--primary-action)' : 'var(--text-primary)' }}
                >
                  {monthData.monthName}
                </h4>
                {monthData.totalAmount > 0 && (
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthData.totalAmount)}
                  </p>
                )}
              </div>

              {/* Installments List */}
              <div className="space-y-2">
                {monthData.installments.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="w-8 h-8 mx-auto mb-2 neomorphic-card rounded-full flex items-center justify-center opacity-50">
                      <Calendar className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Sem parcelas
                    </p>
                  </div>
                ) : (
                  monthData.installments.map((installment) => {
                    const dueDate = new Date(installment.dueDate);
                    const isOverdue = dueDate < new Date() && !installment.isPaid;
                    const isDueSoon = dueDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && !installment.isPaid;

                    return (
                      <div
                        key={installment.id}
                        className={`
                          p-3 rounded-lg neomorphic-card border-l-3 transition-all
                          ${installment.isPaid ? 'border-green-500 bg-green-50' : 
                            isOverdue ? 'border-red-500 bg-red-50' :
                            isDueSoon ? 'border-yellow-500 bg-yellow-50' : 'border-gray-300'}
                        `}
                      >
                        {/* Product Name */}
                        <h5 className="font-medium text-xs mb-1 line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                          {installment.productName}
                        </h5>

                        {/* Installment Info */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                            {installment.installmentNumber}/{installment.totalInstallments}x
                          </span>
                          {installment.isPaid && (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                          {isOverdue && !installment.isPaid && (
                            <Clock className="w-4 h-4 text-red-600" />
                          )}
                        </div>

                        {/* Amount */}
                        <p className="text-xs font-bold mb-1" style={{ color: 'var(--primary-action)' }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(installment.amount)}
                        </p>

                        {/* Due Date */}
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          Venc: {dueDate.toLocaleDateString('pt-BR', { day: '2-digit' })}
                        </p>

                        {/* Status Badge */}
                        {installment.isPaid ? (
                          <span className="inline-block mt-2 text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                            Pago
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-block mt-2 text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full">
                            Vencido
                          </span>
                        ) : isDueSoon ? (
                          <span className="inline-block mt-2 text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                            Vence em breve
                          </span>
                        ) : (
                          <span className="inline-block mt-2 text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded-full">
                            A vencer
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 p-4 neomorphic-card rounded-xl">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Pago</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Vence em breve</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Vencido</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>A vencer</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-blue-500 rounded-full"></div>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Mês atual</span>
        </div>
      </div>

      {/* Summary Stats */}
      {installments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="neomorphic-card p-4 rounded-xl text-center">
            <div className="w-10 h-10 neomorphic-card rounded-full flex items-center justify-center mx-auto mb-2">
              <CreditCard className="w-5 h-5" style={{ color: 'var(--primary-action)' }} />
            </div>
            <h4 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Total de Parcelas
            </h4>
            <p className="text-lg font-bold" style={{ color: 'var(--primary-action)' }}>
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
            <p className="text-lg font-bold text-green-600">
              {installments.filter(i => i.isPaid).length}
            </p>
          </div>

          <div className="neomorphic-card p-4 rounded-xl text-center">
            <div className="w-10 h-10 neomorphic-card rounded-full flex items-center justify-center mx-auto mb-2">
              <Clock className="w-5 h-5 text-red-600" />
            </div>
            <h4 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Vencidas
            </h4>
            <p className="text-lg font-bold text-red-600">
              {installments.filter(i => {
                const dueDate = new Date(i.dueDate);
                return dueDate < new Date() && !i.isPaid;
              }).length}
            </p>
          </div>

          <div className="neomorphic-card p-4 rounded-xl text-center">
            <div className="w-10 h-10 neomorphic-card rounded-full flex items-center justify-center mx-auto mb-2">
              <Calendar className="w-5 h-5" style={{ color: 'var(--primary-action)' }} />
            </div>
            <h4 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Pendentes
            </h4>
            <p className="text-lg font-bold" style={{ color: 'var(--primary-action)' }}>
              {installments.filter(i => !i.isPaid).length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

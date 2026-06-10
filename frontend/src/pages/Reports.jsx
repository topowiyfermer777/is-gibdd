import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { LockIcon, RefreshIcon, WarningIcon, StolenIcon, AnalyticsIcon, AccidentIcon, LogoIcon } from '../components/Icons';

const Reports = () => {
  const { user } = useContext(AuthContext);

  // Data states
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Check role permission
  const isAllowed = user && (user.role === 'admin' || user.role === 'analyst');

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/reports/stolen');
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching analytics stats:', err);
      setError(err.response?.data?.detail || 'Не удалось получить статистические данные. Проверьте соединение.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAllowed) {
      fetchStats();
    }
  }, [user]);

  if (!isAllowed) {
    return (
      <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center py-20 space-y-3">
        <LockIcon className="h-10 w-10 text-slate-400 mx-auto" />
        <h3 className="text-lg font-bold text-slate-800 mt-3">Доступ ограничен</h3>
        <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto leading-relaxed">
          Просмотр аналитических отчетов и статистики угонов/розыска доступен только пользователям с ролями Руководитель/Аналитик и Администратор.
        </p>
      </div>
    );
  }

  // Calculate some insights
  const maxCount = stats?.by_brand && stats.by_brand.length > 0 
    ? Math.max(...stats.by_brand.map(b => b.count)) 
    : 1;

  const activeTheftRatio = stats?.total_vehicles 
    ? ((stats.total_stolen_active / stats.total_vehicles) * 100).toFixed(2) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Аналитика и Отчетность</h2>
          <p className="text-slate-500 text-sm mt-0.5">Сводные показатели состояния транспортного парка и разыскиваемых ТС.</p>
        </div>
        <button
          onClick={fetchStats}
          className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-sm transition-colors flex items-center gap-1.5"
          disabled={loading}
        >
          <RefreshIcon className="h-4 w-4" />
          <span>Обновить</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white p-20 rounded-xl border border-slate-200 shadow-sm flex justify-center items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 font-medium flex items-center gap-3">
          <WarningIcon className="h-5 w-5 text-red-650" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Key Metrics Widgets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Widget 1 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Всего ТС в системе</span>
                <p className="text-3xl font-extrabold text-slate-800">{stats?.total_vehicles || 0}</p>
                <p className="text-[11px] text-slate-400 font-medium">Общее число авто в базе данных</p>
              </div>
              <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-inner select-none">
                <AccidentIcon className="h-6 w-6 text-blue-605" />
              </div>
            </div>

            {/* Widget 2 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ТС в активном розыске</span>
                <p className="text-3xl font-extrabold text-red-600">{stats?.total_stolen_active || 0}</p>
                <p className="text-[11px] text-red-500 font-medium animate-pulse">Требуют оперативного поиска</p>
              </div>
              <div className="h-12 w-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shadow-inner select-none">
                <StolenIcon className="h-6 w-6 text-red-605" />
              </div>
            </div>

            {/* Widget 3 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Уровень угонов от общего парка</span>
                <p className="text-3xl font-extrabold text-slate-800">{activeTheftRatio}%</p>
                <p className="text-[11px] text-slate-400 font-medium">Процент угнанных автомобилей</p>
              </div>
              <div className="h-12 w-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shadow-inner select-none">
                <AnalyticsIcon className="h-6 w-6 text-amber-605" />
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Brands Chart list (Takes 2 cols) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center gap-1.5 mb-2">
                <AnalyticsIcon className="h-5 w-5 text-slate-800" />
                <h3 className="text-base font-bold text-slate-800">Распределение активных розысков по маркам авто</h3>
              </div>
              <p className="text-slate-400 text-xs pl-6.5">Соотношение находящихся в розыске транспортных средств различных брендов.</p>

              {stats?.by_brand && stats.by_brand.length > 0 ? (
                <div className="space-y-4">
                  {stats.by_brand.map((item, index) => {
                    const pct = ((item.count / maxCount) * 100).toFixed(0);
                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                          <span className="flex items-center gap-2">
                            <span className="inline-block w-2.5 h-2.5 bg-blue-600 rounded-sm"></span>
                            {item.brand}
                          </span>
                          <span>{item.count} шт.</span>
                        </div>
                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${pct}%` }}
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out"
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 italic bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
                  Данные по розыскам отсутствуют. График пуст.
                </div>
              )}
            </div>

            {/* Analysis card details (Takes 1 col) */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                  <LogoIcon className="h-5 w-5 text-blue-600" />
                  <span>Аналитическая оценка</span>
                </h3>
                <div className="h-px bg-slate-100"></div>
                
                <p className="text-xs text-slate-600 leading-relaxed">
                  По текущим сведениям, в реестре зафиксировано <strong>{stats?.total_vehicles || 0}</strong> транспортных средств. 
                  Из них <strong>{stats?.total_stolen_active || 0}</strong> находятся под действием активных розыскных мероприятий.
                </p>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Рекомендация инспекции:</span>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {stats?.total_stolen_active && stats.total_stolen_active > 0 ? (
                      `Необходимо усилить патрулирование на ключевых перекрестках для выявления ТС марок: ${stats.by_brand[0]?.brand || 'нет данных'}, которые лидируют по числу угонов.`
                    ) : (
                      'Криминогенная обстановка стабильная, активных угонов в системе не зарегистрировано.'
                    )}
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
                Отчет сгенерирован автоматически на основе актуальных данных СУБД ГИБДД.
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};

export default Reports;

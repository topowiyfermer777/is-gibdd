import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { StolenIcon, WarningIcon, SuccessIcon, LockIcon, CloseIcon } from '../components/Icons';

const Stolen = () => {
  const { user } = useContext(AuthContext);

  // 1. Wanted list & reference states
  const [wantedList, setWantedList] = useState([]);
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(false);

  // 2. Declaration states
  const [vin, setVin] = useState('');
  const [idReason, setIdReason] = useState('');
  const [description, setDescription] = useState('');
  const [declError, setDeclError] = useState('');
  const [declSuccess, setDeclSuccess] = useState('');
  const [declLoading, setDeclLoading] = useState(false);

  // 3. Grid actions states
  const [actionError, setActionError] = useState('');

  // Fetch wanted list & reasons on mount
  const fetchData = async () => {
    setLoading(true);
    try {
      const [searchesRes, reasonsRes] = await Promise.all([
        axios.get('/api/searches'),
        axios.get('/api/search-reasons')
      ]);
      setWantedList(searchesRes.data);
      setReasons(reasonsRes.data);
      if (reasonsRes.data.length > 0) {
        setIdReason(reasonsRes.data[0].id_reason);
      }
    } catch (err) {
      console.error('Error fetching wanted registry data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Submit search declaration
  const handleDeclareStolen = async (e) => {
    e.preventDefault();
    if (!vin.trim() || !idReason) return;

    setDeclLoading(true);
    setDeclError('');
    setDeclSuccess('');

    try {
      const response = await axios.post('/api/vehicles/stolen', {
        vin: vin.trim().toUpperCase(),
        id_reason: parseInt(idReason),
        description: description.trim() || null
      });
      setDeclSuccess(`ТС с VIN ${response.data.vin} успешно объявлено в розыск.`);
      setVin('');
      setDescription('');
      fetchData(); // Reload list
    } catch (err) {
      setDeclError(err.response?.data?.detail || 'Ошибка при объявлении ТС в розыск. Проверьте правильность VIN.');
    } finally {
      setDeclLoading(false);
    }
  };

  // Mark found
  const handleMarkFound = async (stolenVin) => {
    setActionError('');
    try {
      await axios.post('/api/vehicles/found', { vin: stolenVin });
      alert(`Розыск успешно снят. Автомобиль с VIN ${stolenVin} переведен в статус "Найден".`);
      fetchData(); // Reload list
    } catch (err) {
      setActionError(err.response?.data?.detail || 'Ошибка при снятии АТС с розыска.');
    }
  };

  const isOperator = user && (user.role === 'admin' || user.role === 'inspector');

  return (
    <div className="space-y-6">
      {/* Top Banner error */}
      {actionError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 font-medium flex items-center gap-3">
          <WarningIcon className="h-5 w-5 text-red-650" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Declare Stolen Form (restricted to operators) */}
        {isOperator ? (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 h-max">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
              <StolenIcon className="h-5 w-5 text-red-650" />
              <span>Объявить АТС в розыск</span>
            </h3>
            <p className="text-slate-500 text-xs">
              Внесите сведения о пропавшем или угнанном ТС в единый реестр розыска ГИБДД.
            </p>

            {/* Success declaration alert */}
            {declSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold">
                {declSuccess}
              </div>
            )}

            {/* Error declaration alert */}
            {declError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs font-semibold">
                {declError}
              </div>
            )}

            <form onSubmit={handleDeclareStolen} className="space-y-4">
              <div>
                <label htmlFor="vin" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  VIN-код автомобиля
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="vin"
                    value={vin}
                    onChange={(e) => setVin(e.target.value)}
                    maxLength={17}
                    placeholder="Введите 17-значный VIN..."
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-mono text-slate-800 tracking-wider text-sm"
                    disabled={declLoading}
                  />
                  {vin && (
                    <button
                      type="button"
                      onClick={() => setVin('')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-650 transition-colors"
                      title="Очистить"
                      disabled={declLoading}
                    >
                      <CloseIcon className="h-4.5 w-4.5" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="idReason" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Причина розыска
                </label>
                <select
                  id="idReason"
                  value={idReason}
                  onChange={(e) => setIdReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 text-sm font-medium"
                  disabled={declLoading}
                >
                  {reasons.map((r) => (
                    <option key={r.id_reason} value={r.id_reason}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="description" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Обстоятельства розыска / Детали
                </label>
                <div className="relative">
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Например, угнан во дворе дома №5 по ул. Ленина в ночь на 11 июня..."
                    className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 text-sm h-24 resize-none leading-relaxed"
                    disabled={declLoading}
                  />
                  {description && (
                    <button
                      type="button"
                      onClick={() => setDescription('')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-650 transition-colors"
                      title="Очистить"
                      disabled={declLoading}
                    >
                      <CloseIcon className="h-4.5 w-4.5" />
                    </button>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={declLoading || vin.length !== 17}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold shadow transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {declLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <StolenIcon className="h-4 w-4" />
                    <span>Объявить розыск</span>
                  </span>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center py-12 h-max space-y-3">
            <LockIcon className="h-10 w-10 text-slate-400 mx-auto" />
            <h4 className="font-bold text-slate-800 mt-2">Режим просмотра</h4>
            <p className="text-slate-400 text-xs mt-1 leading-normal">
              Объявление АТС в розыск и снятие с розыска доступно только ролям Инспектора ДПС и Администратора.
            </p>
          </div>
        )}

        {/* Right Side: Wanted list (takes 2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4 select-none">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Реестр розыска транспортных средств</h3>
              <p className="text-slate-400 text-xs mt-0.5">Список активных и архивных дел по розыску.</p>
            </div>
            <span className="text-xs bg-red-50 border border-red-200 text-red-700 font-bold px-2.5 py-1 rounded-full">
              Розысков: {wantedList.filter(s => !s.is_found).length}
            </span>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            </div>
          ) : wantedList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-200 select-none">
                    <th className="px-4 py-3">ТС / Гос. знак</th>
                    <th className="px-4 py-3">VIN</th>
                    <th className="px-4 py-3">Дата объявления</th>
                    <th className="px-4 py-3">Причина</th>
                    <th className="px-4 py-3">Статус</th>
                    {isOperator && <th className="px-4 py-3 text-right">Действия</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {wantedList.map((item) => (
                    <tr key={item.id_search} className={`hover:bg-slate-50/50 ${item.is_found ? 'opacity-60 bg-slate-50/20' : ''}`}>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-800">{item.brand_name} {item.model_name}</div>
                        {item.grz_number ? (
                          <div className="text-[10px] font-mono text-slate-500 font-semibold mt-0.5">{item.grz_number}</div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">без номеров</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-semibold text-slate-600">{item.vin}</td>
                      <td className="px-4 py-3.5 font-medium">{new Date(item.date_declared).toLocaleDateString('ru-RU')}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800">{item.reason_name}</td>
                      <td className="px-4 py-3.5">
                        {item.is_found ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            Найден {new Date(item.date_found).toLocaleDateString('ru-RU')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold animate-pulse">
                            В РОЗЫСКЕ
                          </span>
                        )}
                      </td>
                      {isOperator && (
                        <td className="px-4 py-3.5 text-right select-none">
                          {!item.is_found && (
                            <button
                              onClick={() => handleMarkFound(item.vin)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold shadow-sm transition-colors"
                            >
                              Найдено
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-400 italic bg-slate-50/10 border border-dashed border-slate-200 rounded-xl">
              Список розыска пуст. Активных дел не числится.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Stolen;

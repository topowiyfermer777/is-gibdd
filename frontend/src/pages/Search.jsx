import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { SearchIcon, StolenIcon, WarningIcon, SuccessIcon, LockIcon, CloseIcon } from '../components/Icons';

const Search = () => {
  const { user } = useContext(AuthContext);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [vehicle, setVehicle] = useState(null);
  const [error, setError] = useState('');
  const [alarmSent, setAlarmSent] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setVehicle(null);
    setAlarmSent(false);

    try {
      const response = await axios.get(`/api/vehicles/search`, {
        params: { query: query.trim() }
      });
      setVehicle(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'АТС не найдено в базе данных');
    } finally {
      setLoading(false);
    }
  };

  const handleSendAlarm = () => {
    setAlarmSent(true);
    alert(`Сигнал тревоги передан дежурной части! Разыскивается ТС с ГРЗ: ${vehicle.grz_number || 'нет'}, VIN: ${vehicle.vin}`);
  };

  return (
    <div className="space-y-6">
      {/* Search Header and Input */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Универсальный поиск АТС</h2>
        <p className="text-slate-500 text-sm mb-4">
          Поиск осуществляется по VIN-коду, Государственному знаку (ГРЗ), номеру кузова или двигателя.
        </p>
        
        <form onSubmit={handleSearch} className="flex gap-3 max-w-2xl">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Введите ГРЗ (например, А-АА 111) или VIN..."
              className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-800"
              disabled={loading}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-650 transition-colors"
                title="Очистить"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <span className="flex items-center gap-1.5"><SearchIcon className="h-4 w-4" /> Найти</span>
            )}
          </button>
        </form>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 font-medium flex items-center gap-3">
          <WarningIcon className="h-5 w-5 text-amber-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Vehicle details display */}
      {vehicle && (
        <div className={`bg-white rounded-xl border transition-all shadow-sm overflow-hidden ${
          vehicle.is_stolen 
            ? 'border-red-500 shadow-lg shadow-red-50' 
            : 'border-slate-200'
        }`}>
          
          {/* Stolen alarm banner */}
          {vehicle.is_stolen && (
            <div className="bg-red-600 text-white px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-3">
                <StolenIcon className="h-8 w-8 text-white" />
                <div>
                  <h3 className="text-lg font-extrabold tracking-tight uppercase">Внимание! Транспортное средство в розыске!</h3>
                  <p className="text-red-100 text-xs mt-0.5">
                    Причина: {vehicle.stolen_reason}. Объявлен: {new Date(vehicle.stolen_date).toLocaleString('ru-RU')}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSendAlarm}
                disabled={alarmSent}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all shadow flex items-center gap-1.5 ${
                  alarmSent 
                    ? 'bg-red-800 text-red-300 pointer-events-none' 
                    : 'bg-white hover:bg-red-50 text-red-600 hover:scale-[1.02]'
                }`}
              >
                {alarmSent ? (
                  <>
                    <SuccessIcon className="h-4 w-4" />
                    <span>Сигнал передан</span>
                  </>
                ) : (
                  <>
                    <WarningIcon className="h-4 w-4" />
                    <span>Сообщить дежурному</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Main Card Header */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Карточка транспортного средства</span>
              <h3 className="text-xl font-bold text-slate-800 mt-0.5">
                {vehicle.brand_name} {vehicle.model_name}
              </h3>
            </div>
            
            <div className="flex items-center gap-3">
              {vehicle.grz_number && (
                <div className="bg-white border-2 border-slate-800 text-slate-800 font-extrabold px-3 py-1 rounded tracking-wider text-sm flex items-center shadow-sm">
                  <span className="border-r border-slate-300 pr-2 mr-2 font-mono">{vehicle.grz_number.split(' ')[0]}</span>
                  <span className="font-mono text-slate-500 text-xs">{vehicle.grz_number.split(' ')[1]}</span>
                </div>
              )}
              <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                vehicle.registration_status === 'Зарегистрировано'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : vehicle.registration_status === 'Снято с учета'
                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {vehicle.registration_status}
              </span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Grid specs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">VIN</span>
                <p className="text-sm font-mono font-bold text-slate-800 mt-1 select-all">{vehicle.vin}</p>
              </div>
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Цвет автомобиля</span>
                <p className="text-sm font-semibold text-slate-800 mt-1">{vehicle.color_name}</p>
              </div>
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Год выпуска</span>
                <p className="text-sm font-semibold text-slate-800 mt-1">{vehicle.year_produced} г.</p>
              </div>
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Объем двигателя</span>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  {vehicle.engine_volume ? `${vehicle.engine_volume} л` : 'Не указан'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Aggregate numbers */}
              <div className="lg:col-span-2 border border-slate-200 rounded-xl p-5 space-y-4">
                <h4 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">Номера агрегатов</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-xs text-slate-400 font-semibold">Номер кузова</span>
                    <p className="text-sm font-mono font-bold text-slate-700 mt-0.5">{vehicle.body_number || 'нет'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-semibold">Номер двигателя</span>
                    <p className="text-sm font-mono font-bold text-slate-700 mt-0.5">{vehicle.engine_number || 'нет'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-semibold">Номер шасси</span>
                    <p className="text-sm font-mono font-bold text-slate-700 mt-0.5">{vehicle.chassis_number || 'нет'}</p>
                  </div>
                </div>
              </div>

              {/* Owner card */}
              <div className="border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 mb-3">Сведения о владельце</h4>
                  {vehicle.owner_name ? (
                    <div className="space-y-2.5">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">ФИО / Компания</span>
                        <p className="text-sm font-bold text-slate-800">{vehicle.owner_name}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Адрес</span>
                        <p className="text-xs font-medium text-slate-600 leading-snug">{vehicle.owner_address}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Телефон</span>
                          <p className="text-xs font-semibold text-slate-700">{vehicle.owner_phone || 'нет'}</p>
                        </div>
                        {vehicle.owner_type === 'legal' && (
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">ИНН</span>
                            <p className="text-xs font-semibold text-slate-700">{vehicle.owner_inn || 'нет'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Сведения о владельце отсутствуют.</p>
                  )}
                </div>
                 {user && (user.role === 'inspector' || user.role === 'to_employee') && (
                  <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                    <LockIcon className="h-3.5 w-3.5 text-slate-400" /> Персональные данные замаскированы (152-ФЗ)
                  </div>
                )}
              </div>
            </div>

            {/* TO History */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
                <h4 className="font-bold text-slate-800 text-sm">История прохождения техосмотров</h4>
              </div>
              {vehicle.to_history && vehicle.to_history.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase border-b border-slate-200 select-none">
                        <th className="px-6 py-3">Дата проведения</th>
                        <th className="px-6 py-3">Рекомендуемая следующая дата</th>
                        <th className="px-6 py-3">Пункт ТО</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                      {vehicle.to_history.map((toRec, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="px-6 py-3.5 font-medium">{new Date(toRec.date_conducted).toLocaleDateString('ru-RU')}</td>
                          <td className="px-6 py-3.5 font-medium text-slate-500">
                            {toRec.date_next ? new Date(toRec.date_next).toLocaleDateString('ru-RU') : 'не указана'}
                          </td>
                          <td className="px-6 py-3.5 font-semibold text-slate-800">{toRec.organization_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 text-sm italic bg-slate-50/20">
                  История прохождения технического осмотра отсутствует.
                </div>
              )}
            </div>

            {/* Accident History */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
                <h4 className="font-bold text-slate-800 text-sm">Участие в дорожно-транспортных происшествиях (ДТП)</h4>
              </div>
              {vehicle.accident_history && vehicle.accident_history.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase border-b border-slate-200 select-none">
                        <th className="px-6 py-3 col-span-1">Дата и Время</th>
                        <th className="px-6 py-3 col-span-2">Место ДТП</th>
                        <th className="px-6 py-3">Тип аварии</th>
                        <th className="px-6 py-3">Степень повреждения</th>
                        <th className="px-6 py-3">Описание происшествия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                      {vehicle.accident_history.map((acc, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="px-6 py-3.5 font-medium">{new Date(acc.date_time).toLocaleString('ru-RU')}</td>
                          <td className="px-6 py-3.5 font-medium text-slate-600 max-w-[200px] truncate" title={acc.location}>{acc.location}</td>
                          <td className="px-6 py-3.5 font-semibold text-slate-800">{acc.accident_type}</td>
                          <td className="px-6 py-3.5">
                            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                              acc.damage_degree === 'Тотал'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : acc.damage_degree === 'Тяжелая'
                                ? 'bg-orange-50 text-orange-700 border-orange-200'
                                : acc.damage_degree === 'Средняя'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {acc.damage_degree || 'Не указана'}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-slate-500 max-w-[300px] truncate" title={acc.description}>{acc.description || 'нет'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 text-sm italic bg-slate-50/20">
                  Записи об участии данного ТС в ДТП отсутствуют.
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Search;

import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { RegisterIcon, StolenIcon, WarningIcon, SuccessIcon, LockIcon, AccidentIcon, PlusIcon, TrashIcon, CloseIcon } from '../components/Icons';

const Accidents = () => {
  const { user } = useContext(AuthContext);

  // Tabs state
  const [activeTab, setActiveTab] = useState('journal'); // 'journal' or 'report'

  // Data states
  const [accidents, setAccidents] = useState([]);
  const [types, setTypes] = useState([]);
  const [reasons, setReasons] = useState([]);
  const [loadingJournal, setLoadingJournal] = useState(false);
  const [loadingReferences, setLoadingReferences] = useState(false);

  // Form states
  const [dateTime, setDateTime] = useState('');
  const [location, setLocation] = useState('');
  const [idAccidentType, setIdAccidentType] = useState('');
  const [idAccidentReason, setIdAccidentReason] = useState('');
  const [weatherConditions, setWeatherConditions] = useState('');
  const [injuredCount, setInjuredCount] = useState('');
  const [description, setDescription] = useState('');
  const [participants, setParticipants] = useState([
    { vin: '', damage_amount: '', damage_degree: 'Легкая' }
  ]);

  // Alert states
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  // Check write permissions
  const isOperator = user && (user.role === 'admin' || user.role === 'inspector');

  // Fetch Accidents Journal
  const fetchJournal = async () => {
    setLoadingJournal(true);
    try {
      const response = await axios.get('/api/accidents');
      setAccidents(response.data);
    } catch (err) {
      console.error('Error fetching accidents journal:', err);
    } finally {
      setLoadingJournal(false);
    }
  };

  // Fetch Reference Data (Accident Types and Reasons)
  const fetchReferences = async () => {
    setLoadingReferences(true);
    try {
      const [typesRes, reasonsRes] = await Promise.all([
        axios.get('/api/accident-types'),
        axios.get('/api/accident-reasons')
      ]);
      setTypes(typesRes.data);
      setReasons(reasonsRes.data);
      
      if (typesRes.data.length > 0) {
        setIdAccidentType(typesRes.data[0].id_accident_type);
      }
      if (reasonsRes.data.length > 0) {
        setIdAccidentReason(reasonsRes.data[0].id_accident_reason);
      }
    } catch (err) {
      console.error('Error fetching accident references:', err);
    } finally {
      setLoadingReferences(false);
    }
  };

  useEffect(() => {
    fetchJournal();
    if (isOperator) {
      fetchReferences();
    }
    // Set default local time for date-time input
    const now = new Date();
    const tzoffset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now - tzoffset)).toISOString().slice(0, 16);
    setDateTime(localISOTime);
  }, [user]);

  // Participants handlers
  const handleAddParticipant = () => {
    setParticipants([...participants, { vin: '', damage_amount: '', damage_degree: 'Легкая' }]);
  };

  const handleRemoveParticipant = (index) => {
    if (participants.length === 1) return;
    const newParticipants = [...participants];
    newParticipants.splice(index, 1);
    setParticipants(newParticipants);
  };

  const handleParticipantChange = (index, field, value) => {
    const newParticipants = [...participants];
    newParticipants[index][field] = value;
    setParticipants(newParticipants);
  };

  // Form submit handler
  const handleSubmitAccident = async (e) => {
    e.preventDefault();
    if (!location.trim() || !idAccidentType || !idAccidentReason) {
      setFormError('Заполните все обязательные поля формы.');
      return;
    }

    // Validate participants VIN
    for (let i = 0; i < participants.length; i++) {
      if (participants[i].vin.trim().length !== 17) {
        setFormError(`Участник #${i + 1}: VIN-код должен состоять ровно из 17 символов.`);
        return;
      }
    }

    setSubmitLoading(true);
    setFormError('');
    setFormSuccess('');

    try {
      const payload = {
        date_time: dateTime ? new Date(dateTime).toISOString() : null,
        location: location.trim(),
        id_accident_type: parseInt(idAccidentType),
        id_accident_reason: parseInt(idAccidentReason),
        weather_road_conditions: weatherConditions.trim() || null,
        injured_count: parseInt(injuredCount) || 0,
        description: description.trim() || null,
        participants: participants.map(p => ({
          vin: p.vin.trim().toUpperCase(),
          damage_amount: parseFloat(p.damage_amount) || 0.0,
          damage_degree: p.damage_degree
        }))
      };

      const response = await axios.post('/api/accidents', payload);
      setFormSuccess(`Протокол ДТП №${response.data.id_accident} успешно оформлен.`);
      
      // Reset form
      setLocation('');
      setWeatherConditions('');
      setInjuredCount('');
      setDescription('');
      setParticipants([{ vin: '', damage_amount: '', damage_degree: 'Легкая' }]);
      
      // Re-fetch journal
      fetchJournal();
      
      // Go to journal
      setTimeout(() => {
        setActiveTab('journal');
        setFormSuccess('');
      }, 2000);

    } catch (err) {
      setFormError(err.response?.data?.detail || 'Ошибка при оформлении ДТП. Убедитесь, что все VIN-коды участников зарегистрированы.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const getDamageDegreeBadge = (degree) => {
    switch (degree) {
      case 'Тотал':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Тяжелая':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Средняя':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Легкая':
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Tab Selector */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Учет дорожно-транспортных происшествий (ДТП)</h2>
          <p className="text-slate-500 text-sm mt-0.5">Регистрация протоколов аварий и мониторинг дорожной обстановки.</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg self-start md:self-center select-none">
          <button
            onClick={() => setActiveTab('journal')}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'journal'
                ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <RegisterIcon className="h-4 w-4" />
            <span>Журнал ДТП</span>
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'report'
                ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <AccidentIcon className="h-4 w-4" />
            <span>Оформить протокол</span>
          </button>
        </div>
      </div>

      {/* Tab content: Journal */}
      {activeTab === 'journal' && (
        <div className="space-y-6">
          {loadingJournal ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm flex justify-center items-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            </div>
          ) : accidents.length > 0 ? (
            accidents.map((accident) => (
              <div key={accident.id_accident} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition-all">
                {/* Accident Header */}
                <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Протокол ДТП №{accident.id_accident}</span>
                    <h3 className="text-base font-bold text-slate-800 mt-0.5">{accident.location}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-slate-700">{new Date(accident.date_time).toLocaleString('ru-RU')}</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">Оформил: {accident.employee_name}</p>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Grid general details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Тип происшествия</span>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">{accident.accident_type_name}</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Основная причина</span>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">{accident.accident_reason_name}</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Дорожные условия</span>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">{accident.weather_road_conditions || 'Нормальные'}</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Пострадавшие</span>
                      <p className="text-sm font-bold mt-0.5">
                        {accident.injured_count > 0 ? (
                          <span className="text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded text-xs">
                            {accident.injured_count} чел.
                          </span>
                        ) : (
                          <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-xs">Нет</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Incident Description */}
                  {accident.description && (
                    <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                      <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Описание обстоятельств</span>
                      <p className="text-sm text-slate-600 mt-1 leading-relaxed">{accident.description}</p>
                    </div>
                  )}

                  {/* Participants section */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-800">Участники ДТП и повреждения транспортных средств</h4>
                    <div className="overflow-x-auto border border-slate-150 rounded-lg">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-200 select-none">
                            <th className="px-4 py-2.5">Автомобиль</th>
                            <th className="px-4 py-2.5">Гос. знак</th>
                            <th className="px-4 py-2.5">VIN-код</th>
                            <th className="px-4 py-2.5">Степень повреждения</th>
                            <th className="px-4 py-2.5 text-right">Сумма ущерба</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                          {accident.participants.map((part, index) => (
                            <tr key={index} className="hover:bg-slate-55">
                              <td className="px-4 py-3 font-semibold text-slate-800">
                                {part.brand_name} {part.model_name}
                              </td>
                              <td className="px-4 py-3 font-mono font-bold text-slate-600">
                                {part.grz_number || <span className="text-slate-400 italic font-normal">без номеров</span>}
                              </td>
                              <td className="px-4 py-3 font-mono text-slate-500">{part.vin}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${getDamageDegreeBadge(part.damage_degree)}`}>
                                  {part.damage_degree || 'Не указана'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-slate-800">
                                {part.damage_amount.toLocaleString('ru-RU')} ₽
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white p-20 text-center text-slate-400 italic border border-slate-200 rounded-xl shadow-sm">
              В журнале происшествий нет записей о ДТП.
            </div>
          )}
        </div>
      )}

      {/* Tab content: Report Form */}
      {activeTab === 'report' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {isOperator ? (
            <div className="p-6 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
                  <AccidentIcon className="h-5 w-5 text-blue-605" />
                  <span>Регистрация нового протокола ДТП</span>
                </h3>
                <p className="text-slate-500 text-xs mt-1">
                  Заполните сведения о происшествии и добавьте транспортные средства участников. Все АТС должны быть предварительно зарегистрированы в базе данных.
                </p>
              </div>

              {formSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-medium flex items-center gap-3">
                  <SuccessIcon className="h-5 w-5 text-emerald-600" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {formError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 font-medium flex items-center gap-3 animate-shake">
                  <WarningIcon className="h-5 w-5 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitAccident} className="space-y-6">
                
                {/* Section 1: Main info */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  
                  <div>
                    <label htmlFor="dateTime" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Дата и время происшествия
                    </label>
                    <input
                      type="datetime-local"
                      id="dateTime"
                      value={dateTime}
                      onChange={(e) => setDateTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 text-sm font-medium"
                      disabled={submitLoading}
                      required
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label htmlFor="location" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Место происшествия (Адрес/Координаты) *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Например, г. Москва, пересечение МКАД и Варшавского шоссе"
                        className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 text-sm font-medium"
                        disabled={submitLoading}
                        required
                      />
                      {location && (
                        <button
                          type="button"
                          onClick={() => setLocation('')}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-650 transition-colors"
                          title="Очистить"
                          disabled={submitLoading}
                        >
                          <CloseIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="idAccidentType" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Тип ДТП *
                    </label>
                    <select
                      id="idAccidentType"
                      value={idAccidentType}
                      onChange={(e) => setIdAccidentType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 text-sm font-medium"
                      disabled={submitLoading}
                      required
                    >
                      {types.map(t => (
                        <option key={t.id_accident_type} value={t.id_accident_type}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="idAccidentReason" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Причина ДТП *
                    </label>
                    <select
                      id="idAccidentReason"
                      value={idAccidentReason}
                      onChange={(e) => setIdAccidentReason(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 text-sm font-medium"
                      disabled={submitLoading}
                      required
                    >
                      {reasons.map(r => (
                        <option key={r.id_accident_reason} value={r.id_accident_reason}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="injuredCount" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Количество раненых/погибших
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        id="injuredCount"
                        min="0"
                        value={injuredCount}
                        onChange={(e) => setInjuredCount(e.target.value)}
                        className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 text-sm font-medium"
                        disabled={submitLoading}
                      />
                      {injuredCount && (
                        <button
                          type="button"
                          onClick={() => setInjuredCount('')}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-650 transition-colors"
                          title="Очистить"
                          disabled={submitLoading}
                        >
                          <CloseIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-3">
                    <label htmlFor="weatherConditions" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Дорожные и погодные условия
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="weatherConditions"
                        value={weatherConditions}
                        onChange={(e) => setWeatherConditions(e.target.value)}
                        placeholder="Например: Дождь, мокрый асфальт, туман, отсутствие освещения"
                        className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 text-sm font-medium"
                        disabled={submitLoading}
                      />
                      {weatherConditions && (
                        <button
                          type="button"
                          onClick={() => setWeatherConditions('')}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-650 transition-colors"
                          title="Очистить"
                          disabled={submitLoading}
                        >
                          <CloseIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-3">
                    <label htmlFor="description" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Описание происшествия / Обстоятельства
                    </label>
                    <div className="relative">
                      <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Краткое описание схемы происшествия, траектории участников..."
                        className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 text-sm h-20 resize-none leading-relaxed"
                        disabled={submitLoading}
                      />
                      {description && (
                        <button
                          type="button"
                          onClick={() => setDescription('')}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-650 transition-colors"
                          title="Очистить"
                          disabled={submitLoading}
                        >
                          <CloseIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                </div>

                {/* Section 2: Dynamic list of vehicles */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <div className="flex justify-between items-center select-none">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <RegisterIcon className="h-4 w-4 text-slate-500" />
                        <span>Транспортные средства участников</span>
                      </h4>
                      <p className="text-slate-400 text-[11px] mt-0.5">Добавьте хотя бы одно транспортное средство.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddParticipant}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                      disabled={submitLoading}
                    >
                      <PlusIcon className="h-4 w-4" />
                      <span>Добавить участника</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {participants.map((part, index) => (
                      <div key={index} className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-4 items-end relative">
                        {/* Remove participant button */}
                        {participants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveParticipant(index)}
                            className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition-colors"
                            title="Удалить участника"
                            disabled={submitLoading}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}

                        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs self-start md:self-center">
                          {index + 1}
                        </div>

                        <div className="flex-1 min-w-[200px]">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            VIN-код ТС *
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={part.vin}
                              onChange={(e) => handleParticipantChange(index, 'vin', e.target.value)}
                              maxLength={17}
                              placeholder="Введите 17-значный VIN..."
                              className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-mono text-xs uppercase tracking-wider"
                              disabled={submitLoading}
                              required
                            />
                            {part.vin && (
                              <button
                                type="button"
                                onClick={() => handleParticipantChange(index, 'vin', '')}
                                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-650 transition-colors"
                                title="Очистить"
                                disabled={submitLoading}
                              >
                                <CloseIcon className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="w-full md:w-48">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Степень повреждений *
                          </label>
                          <select
                            value={part.damage_degree}
                            onChange={(e) => handleParticipantChange(index, 'damage_degree', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-xs font-semibold"
                            disabled={submitLoading}
                            required
                          >
                            <option value="Легкая">Легкая</option>
                            <option value="Средняя">Средняя</option>
                            <option value="Тяжелая">Тяжелая</option>
                            <option value="Тотал">Тотал</option>
                          </select>
                        </div>

                        <div className="w-full md:w-48">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Сумма ущерба (₽)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              value={part.damage_amount}
                              onChange={(e) => {
                                handleParticipantChange(index, 'damage_amount', e.target.value);
                              }}
                              className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-xs font-bold"
                              disabled={submitLoading}
                            />
                            {part.damage_amount && (
                              <button
                                type="button"
                                onClick={() => handleParticipantChange(index, 'damage_amount', '')}
                                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-650 transition-colors"
                                title="Очистить"
                                disabled={submitLoading}
                              >
                                <CloseIcon className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2"
                    disabled={submitLoading}
                  >
                    {submitLoading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    ) : (
                      <>
                        <RegisterIcon className="h-4 w-4" />
                        <span>Оформить ДТП</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-12 text-center py-20 space-y-3">
              <LockIcon className="h-10 w-10 text-slate-400 mx-auto" />
              <h3 className="text-lg font-bold text-slate-800 mt-3">Доступ ограничен</h3>
              <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto leading-relaxed">
                Регистрация протоколов дорожно-транспортных происшествий доступна только сотрудникам ГИБДД с ролями Инспектора ДПС и Администратора.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Accidents;

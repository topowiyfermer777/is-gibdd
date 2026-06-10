import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { MaintenanceIcon, LockIcon, LogoIcon, SuccessIcon, WarningIcon, CloseIcon } from '../components/Icons';

const Maintenance = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('add_to'); // add_to / organizations

  // 1. Reference states
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(false);

  // 2. Add TO states
  const [vin, setVin] = useState('');
  const [idToOrg, setIdToOrg] = useState('');
  const [dateConducted, setDateConducted] = useState(new Date().toISOString().split('T')[0]);
  const [dateNext, setDateNext] = useState(() => {
    // Default next TO in 1 year
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    return nextYear.toISOString().split('T')[0];
  });
  const [toError, setToError] = useState('');
  const [toSuccess, setToSuccess] = useState('');
  const [toLoading, setToLoading] = useState(false);

  // 3. Add Organization states
  const [orgName, setOrgName] = useState('');
  const [orgAddress, setOrgAddress] = useState('');
  const [orgPhone, setOrgPhone] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [orgError, setOrgError] = useState('');
  const [orgSuccess, setOrgSuccess] = useState('');
  const [orgLoading, setOrgLoading] = useState(false);

  // Fetch TO Organizations
  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/to-organizations');
      setOrganizations(response.data);
      if (response.data.length > 0) {
        setIdToOrg(response.data[0].id_to_org);
      }
    } catch (err) {
      console.error('Error loading TO organizations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  // Submit TO Record
  const handleToSubmit = async (e) => {
    e.preventDefault();
    if (!vin.trim() || !idToOrg || !dateConducted) return;

    setToLoading(true);
    setToError('');
    setToSuccess('');

    try {
      const response = await axios.post('/api/maintenance', {
        vin: vin.trim().toUpperCase(),
        id_to_org: parseInt(idToOrg),
        date_conducted: dateConducted,
        date_next: dateNext || null
      });
      setToSuccess(`Прохождение ТО для АТС с VIN ${response.data.vehicle_vin} успешно зафиксировано.`);
      setVin('');
    } catch (err) {
      setToError(err.response?.data?.detail || 'Ошибка при сохранении записи ТО. Проверьте VIN.');
    } finally {
      setToLoading(false);
    }
  };

  // Submit New Organization
  const handleOrgSubmit = async (e) => {
    e.preventDefault();
    if (!orgName.trim()) return;

    setOrgLoading(true);
    setOrgError('');
    setOrgSuccess('');

    try {
      const response = await axios.post('/api/to-organizations', {
        name: orgName.trim(),
        address: orgAddress.trim() || null,
        phone: orgPhone.trim() || null,
        email: orgEmail.trim() || null
      });
      setOrgSuccess(`Организация "${response.data.name}" успешно добавлена в реестр.`);
      setOrgName('');
      setOrgAddress('');
      setOrgPhone('');
      setOrgEmail('');
      fetchOrganizations(); // Reload list
    } catch (err) {
      setOrgError('Не удалось добавить организацию.');
    } finally {
      setOrgLoading(false);
    }
  };

  const isOperator = user && (user.role === 'admin' || user.role === 'to_employee');

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 select-none">
        <button
          onClick={() => { setActiveTab('add_to'); setToSuccess(''); setToError(''); }}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'add_to' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <MaintenanceIcon className="h-4 w-4" />
          <span>Внести результаты ТО</span>
        </button>
        <button
          onClick={() => { setActiveTab('organizations'); setOrgSuccess(''); setOrgError(''); }}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'organizations' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <LogoIcon className="h-4 w-4" />
          <span>Пункты техосмотра</span>
        </button>
      </div>

      {/* TAB 1: ADD TO RESULTS */}
      {activeTab === 'add_to' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          {isOperator ? (
            <div className="max-w-xl mx-auto space-y-4">
              <h3 className="text-lg font-bold text-slate-800">Внесение результатов технического осмотра (ТО)</h3>
              <p className="text-slate-500 text-xs leading-normal">
                Заполните форму после успешного прохождения проверки АТС аккредитованной организацией.
              </p>

              {/* Success TO alert */}
              {toSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <SuccessIcon className="h-4 w-4 text-emerald-600" />
                  <span>{toSuccess}</span>
                </div>
              )}

              {/* Error TO alert */}
              {toError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs font-semibold flex items-center gap-2">
                  <WarningIcon className="h-4 w-4 text-red-650" />
                  <span>{toError}</span>
                </div>
              )}

              <form onSubmit={handleToSubmit} className="space-y-4 pt-2">
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
                      disabled={toLoading}
                    />
                    {vin && (
                      <button
                        type="button"
                        onClick={() => setVin('')}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-650 transition-colors"
                        title="Очистить"
                        disabled={toLoading}
                      >
                        <CloseIcon className="h-4.5 w-4.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="idToOrg" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Организация ТО
                  </label>
                  <select
                    id="idToOrg"
                    value={idToOrg}
                    onChange={(e) => setIdToOrg(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 text-sm font-medium"
                    disabled={toLoading}
                  >
                    {organizations.map((org) => (
                      <option key={org.id_to_org} value={org.id_to_org}>{org.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="dateConducted" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Дата проведения
                    </label>
                    <input
                      type="date"
                      id="dateConducted"
                      value={dateConducted}
                      onChange={(e) => setDateConducted(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 text-sm font-medium"
                      disabled={toLoading}
                    />
                  </div>
                  <div>
                    <label htmlFor="dateNext" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Дата следующего ТО
                    </label>
                    <input
                      type="date"
                      id="dateNext"
                      value={dateNext}
                      onChange={(e) => setDateNext(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 text-sm font-medium"
                      disabled={toLoading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={toLoading || vin.length !== 17}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {toLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : (
                    <>
                      <MaintenanceIcon className="h-4 w-4" />
                      <span>Зафиксировать ТО</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="text-center py-12 space-y-3">
              <LockIcon className="h-10 w-10 text-slate-400 mx-auto" />
              <h4 className="font-bold text-slate-800 mt-2">Доступ ограничен</h4>
              <p className="text-slate-400 text-xs mt-1">
                Вносить результаты технического осмотра имеют право только Сотрудники ТО и Администраторы.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TO ORGANIZATIONS */}
      {activeTab === 'organizations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Add organization form (restricted to operators) */}
          {isOperator ? (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 h-max">
              <h3 className="text-md font-bold text-slate-800 flex items-center gap-1.5">
                <LogoIcon className="h-5 w-5 text-blue-650" />
                <span>Аккредитовать организацию ТО</span>
              </h3>
              
              {orgSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <SuccessIcon className="h-4 w-4 text-emerald-600" />
                  <span>{orgSuccess}</span>
                </div>
              )}

              {orgError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs font-semibold flex items-center gap-2">
                  <WarningIcon className="h-4 w-4 text-red-650" />
                  <span>{orgError}</span>
                </div>
              )}

              <form onSubmit={handleOrgSubmit} className="space-y-4">
                <div>
                  <label htmlFor="orgName" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Наименование организации
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="orgName"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="Например, ООО ДиагностикаПлюс"
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 text-xs font-medium"
                      disabled={orgLoading}
                    />
                    {orgName && (
                      <button
                        type="button"
                        onClick={() => setOrgName('')}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-650 transition-colors"
                        title="Очистить"
                        disabled={orgLoading}
                      >
                        <CloseIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="orgAddress" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Адрес организации
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="orgAddress"
                      value={orgAddress}
                      onChange={(e) => setOrgAddress(e.target.value)}
                      placeholder="Город, улица, дом"
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 text-xs font-medium"
                      disabled={orgLoading}
                    />
                    {orgAddress && (
                      <button
                        type="button"
                        onClick={() => setOrgAddress('')}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-650 transition-colors"
                        title="Очистить"
                        disabled={orgLoading}
                      >
                        <CloseIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="orgPhone" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Телефон
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="orgPhone"
                        value={orgPhone}
                        onChange={(e) => setOrgPhone(e.target.value)}
                        placeholder="+7..."
                        className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 text-xs font-medium"
                        disabled={orgLoading}
                      />
                      {orgPhone && (
                        <button
                          type="button"
                          onClick={() => setOrgPhone('')}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-650 transition-colors"
                          title="Очистить"
                          disabled={orgLoading}
                        >
                          <CloseIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="orgEmail" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Email
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        id="orgEmail"
                        value={orgEmail}
                        onChange={(e) => setOrgEmail(e.target.value)}
                        placeholder="info@test.ru"
                        className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 text-xs font-medium"
                        disabled={orgLoading}
                      />
                      {orgEmail && (
                        <button
                          type="button"
                          onClick={() => setOrgEmail('')}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-650 transition-colors"
                          title="Очистить"
                          disabled={orgLoading}
                        >
                          <CloseIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={orgLoading || !orgName.trim()}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow transition-all disabled:opacity-50 text-xs flex items-center justify-center gap-1.5"
                >
                  {orgLoading ? (
                    'Загрузка...'
                  ) : (
                    <>
                      <LogoIcon className="h-4 w-4" />
                      <span>Добавить в реестр</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center py-10 h-max space-y-3">
              <LockIcon className="h-8 w-8 text-slate-400 mx-auto" />
              <h4 className="font-bold text-slate-800 mt-2 text-sm">Режим просмотра</h4>
              <p className="text-slate-400 text-[10px] mt-1 leading-normal">
                Внесение новых пунктов ТО доступно только сотрудникам технического контроля ГИБДД.
              </p>
            </div>
          )}

          {/* List of organizations */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-md font-bold text-slate-800 mb-4 select-none">Реестр аккредитованных организаций технического осмотра</h3>
            
            {organizations.length > 0 ? (
              <div className="space-y-4">
                {organizations.map((org) => (
                  <div key={org.id_to_org} className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50/50 flex flex-col sm:flex-row justify-between gap-3 text-xs">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{org.name}</h4>
                      <p className="text-slate-500 font-medium mt-1">Адрес: {org.address || 'не указан'}</p>
                    </div>
                    <div className="flex flex-col text-slate-400 font-semibold gap-1 items-start sm:items-end">
                      <span>Тел: {org.phone || 'нет'}</span>
                      <span>Email: {org.email || 'нет'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center text-slate-400 italic bg-slate-50/10 border border-dashed border-slate-200 rounded-xl">
                Реестр пуст. Аккредитованных организаций не найдено.
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default Maintenance;

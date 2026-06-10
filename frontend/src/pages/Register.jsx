import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { RegisterIcon, WarningIcon, SuccessIcon, PrintIcon, CloseIcon } from '../components/Icons';

const Register = () => {
  const [activeTab, setActiveTab] = useState('register'); // register / deregister

  // 1. Reference states
  const [models, setModels] = useState([]);
  const [colors, setColors] = useState([]);
  const [freeGrzs, setFreeGrzs] = useState([]);
  const [loadingRefs, setLoadingRefs] = useState(false);

  // 2. Stepper States
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Owner
    owner_type: 'individual',
    owner_name: '',
    owner_address: '',
    owner_phone: '',
    owner_inn: '',
    // Vehicle
    vin: '',
    id_model: '',
    id_color: '',
    year_produced: new Date().getFullYear(),
    engine_volume: '',
    engine_number: '',
    body_number: '',
    chassis_number: '',
    // GRZ
    id_grz: '',
  });

  // 3. Status States
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null); // stores resulting certificate details

  // 4. Deregister States
  const [deregVin, setDeregVin] = useState('');
  const [deregLoading, setDeregLoading] = useState(false);
  const [deregError, setDeregError] = useState('');
  const [deregSuccess, setDeregSuccess] = useState('');

  // Fetch reference lists on mount / tab change
  useEffect(() => {
    const fetchReferences = async () => {
      setLoadingRefs(true);
      try {
        const [modelsRes, colorsRes, grzRes] = await Promise.all([
          axios.get('/api/models'),
          axios.get('/api/colors'),
          axios.get('/api/grz/free')
        ]);
        setModels(modelsRes.data);
        setColors(colorsRes.data);
        setFreeGrzs(grzRes.data);
        
        // Auto-select first free GRZ if available
        if (grzRes.data.length > 0) {
          setFormData(prev => ({ ...prev, id_grz: grzRes.data[0].id_grz }));
        }
      } catch (err) {
        console.error('Error fetching registration references:', err);
      } finally {
        setLoadingRefs(false);
      }
    };
    if (activeTab === 'register') {
      fetchReferences();
    }
  }, [activeTab]);

  // Stepper Handlers
  const handleNextStep = () => {
    setError('');
    if (step === 1) {
      if (!formData.owner_name.trim()) return setError('Укажите ФИО или наименование владельца.');
      if (!formData.owner_address.trim()) return setError('Укажите адрес владельца.');
      if (formData.owner_type === 'legal' && !formData.owner_inn.trim()) {
        return setError('Для юридических лиц обязательно указывать ИНН.');
      }
    } else if (step === 2) {
      if (!formData.vin.trim()) return setError('Введите VIN-код.');
      if (formData.vin.length !== 17) return setError('VIN-код должен состоять ровно из 17 символов.');
      if (!formData.id_model) return setError('Выберите модель АТС.');
      if (!formData.id_color) return setError('Выберите цвет АТС.');
      if (!formData.year_produced) return setError('Укажите год выпуска.');
    } else if (step === 3) {
      if (!formData.id_grz) return setError('Выберите государственный регистрационный знак.');
    }
    setStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setError('');
    setStep(prev => prev - 1);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'vin' ? value.toUpperCase().replace(/\s/g, '') : value
    }));
  };

  const handleClearField = (fieldName) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: ''
    }));
  };

  // Submit Registration
  const handleRegisterSubmit = async () => {
    setSubmitting(true);
    setError('');
    setSuccessData(null);

    // Prepare payload
    const payload = {
      ...formData,
      id_model: parseInt(formData.id_model),
      id_color: parseInt(formData.id_color),
      year_produced: parseInt(formData.year_produced),
      engine_volume: formData.engine_volume ? parseFloat(formData.engine_volume) : null,
      id_grz: parseInt(formData.id_grz),
      owner_inn: formData.owner_type === 'legal' ? formData.owner_inn : null
    };

    try {
      const response = await axios.post('/api/vehicles/register', payload);
      setSuccessData(response.data);
      // Reset form states
      setStep(5);
      setFormData({
        owner_type: 'individual',
        owner_name: '',
        owner_address: '',
        owner_phone: '',
        owner_inn: '',
        vin: '',
        id_model: '',
        id_color: '',
        year_produced: new Date().getFullYear(),
        engine_volume: '',
        engine_number: '',
        body_number: '',
        chassis_number: '',
        id_grz: '',
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка при регистрации транспортного средства.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Deregistration
  const handleDeregisterSubmit = async (e) => {
    e.preventDefault();
    if (!deregVin.trim()) return;

    setDeregLoading(true);
    setDeregError('');
    setDeregSuccess('');

    try {
      const response = await axios.post('/api/vehicles/deregister', {
        vin: deregVin.trim().toUpperCase()
      });
      setDeregSuccess(`АТС с VIN ${response.data.vin} успешно снято с регистрационного учета. Гос. номер ${response.data.grz} переведен в список свободных.`);
      setDeregVin('');
    } catch (err) {
      setDeregError(err.response?.data?.detail || 'Не удалось снять АТС с учета. Проверьте правильность VIN-кода.');
    } finally {
      setDeregLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 gap-6 select-none">
        <button
          onClick={() => { setActiveTab('register'); setStep(1); setSuccessData(null); }}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'register' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <RegisterIcon className="h-4 w-4" />
          <span>Регистрация АТС</span>
        </button>
        <button
          onClick={() => { setActiveTab('deregister'); setDeregSuccess(''); setDeregError(''); }}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'deregister' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <WarningIcon className="h-4 w-4 text-red-500" />
          <span>Снятие с учета</span>
        </button>
      </div>

      {/* ERROR DISPLAY */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 font-medium flex items-center gap-3">
          <WarningIcon className="h-5 w-5 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* REGISTER TAB */}
      {activeTab === 'register' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          {/* Stepper indicators */}
          {step <= 4 && (
            <div className="flex items-center justify-between border-b border-slate-100 pb-5 max-w-xl mx-auto select-none">
              {[1, 2, 3, 4].map((num) => (
                <div key={num} className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm border transition-all ${
                    step === num
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : step > num
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}>
                    {step > num ? '✓' : num}
                  </div>
                  <span className={`text-xs font-semibold ${step === num ? 'text-blue-600' : 'text-slate-400'}`}>
                    {num === 1 ? 'Владелец' : num === 2 ? 'Характеристики' : num === 3 ? 'Выбор ГРЗ' : 'Сводка'}
                  </span>
                  {num < 4 && <div className="h-0.5 w-8 bg-slate-200 hidden sm:block"></div>}
                </div>
              ))}
            </div>
          )}

          {/* STEP 1: OWNER DATA */}
          {step === 1 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Шаг 1: Сведения о владельце АТС</h3>
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Тип владельца</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="owner_type" 
                      value="individual" 
                      checked={formData.owner_type === 'individual'} 
                      onChange={handleChange}
                      className="accent-blue-600 h-4 w-4"
                    />
                    Физическое лицо
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="owner_type" 
                      value="legal" 
                      checked={formData.owner_type === 'legal'} 
                      onChange={handleChange}
                      className="accent-blue-600 h-4 w-4"
                    />
                    Юридическое лицо
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="owner_name" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {formData.owner_type === 'individual' ? 'ФИО владельца' : 'Наименование организации'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="owner_name"
                    name="owner_name"
                    value={formData.owner_name}
                    onChange={handleChange}
                    placeholder={formData.owner_type === 'individual' ? 'Иванов Иван Иванович' : 'ООО Автоматика'}
                    className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800"
                  />
                  {formData.owner_name && (
                    <button
                      type="button"
                      onClick={() => handleClearField('owner_name')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-650 transition-colors"
                      title="Очистить"
                    >
                      <CloseIcon className="h-4.5 w-4.5" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="owner_address" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Адрес регистрации</label>
                <div className="relative">
                  <input
                    type="text"
                    id="owner_address"
                    name="owner_address"
                    value={formData.owner_address}
                    onChange={handleChange}
                    placeholder="Область, Город, Улица, Дом, Квартира"
                    className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800"
                  />
                  {formData.owner_address && (
                    <button
                      type="button"
                      onClick={() => handleClearField('owner_address')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-650 transition-colors"
                      title="Очистить"
                    >
                      <CloseIcon className="h-4.5 w-4.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="owner_phone" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Контактный телефон</label>
                  <div className="relative">
                    <input
                      type="text"
                      id="owner_phone"
                      name="owner_phone"
                      value={formData.owner_phone}
                      onChange={handleChange}
                      placeholder="+7 900 000-00-00"
                      className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800"
                    />
                    {formData.owner_phone && (
                      <button
                        type="button"
                        onClick={() => handleClearField('owner_phone')}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-650 transition-colors"
                        title="Очистить"
                      >
                        <CloseIcon className="h-4.5 w-4.5" />
                      </button>
                    )}
                  </div>
                </div>
                {formData.owner_type === 'legal' && (
                  <div>
                    <label htmlFor="owner_inn" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">ИНН организации</label>
                    <div className="relative">
                      <input
                        type="text"
                        id="owner_inn"
                        name="owner_inn"
                        value={formData.owner_inn}
                        onChange={handleChange}
                        placeholder="ИНН (10 цифр)"
                        className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800"
                      />
                      {formData.owner_inn && (
                        <button
                          type="button"
                          onClick={() => handleClearField('owner_inn')}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-650 transition-colors"
                          title="Очистить"
                        >
                          <CloseIcon className="h-4.5 w-4.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={handleNextStep}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow transition-colors"
                >
                  Далее →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: VEHICLE SPECS */}
          {step === 2 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Шаг 2: Характеристики транспортного средства</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="vin" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">VIN-код</label>
                  <div className="relative">
                    <input
                      type="text"
                      id="vin"
                      name="vin"
                      value={formData.vin}
                      onChange={handleChange}
                      maxLength={17}
                      placeholder="17-значный VIN"
                      className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-mono text-slate-800 tracking-wider"
                    />
                    {formData.vin && (
                      <button
                        type="button"
                        onClick={() => handleClearField('vin')}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-650 transition-colors"
                        title="Очистить"
                      >
                        <CloseIcon className="h-4.5 w-4.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="id_model" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Модель</label>
                  <select
                    id="id_model"
                    name="id_model"
                    value={formData.id_model}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 font-medium"
                  >
                    <option value="">-- Выберите модель --</option>
                    {models.map(m => (
                      <option key={m.id_model} value={m.id_model}>{m.brand_name} {m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="id_color" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Цвет кузова</label>
                  <select
                    id="id_color"
                    name="id_color"
                    value={formData.id_color}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 font-medium"
                  >
                    <option value="">-- Цвет --</option>
                    {colors.map(c => (
                      <option key={c.id_color} value={c.id_color}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="year_produced" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Год выпуска</label>
                  <div className="relative">
                    <input
                      type="number"
                      id="year_produced"
                      name="year_produced"
                      value={formData.year_produced}
                      onChange={handleChange}
                      className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800"
                    />
                    {formData.year_produced && (
                      <button
                        type="button"
                        onClick={() => handleClearField('year_produced')}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-650 transition-colors"
                        title="Очистить"
                      >
                        <CloseIcon className="h-4.5 w-4.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="engine_volume" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Объем двигателя (л)</label>
                  <div className="relative">
                    <input
                      type="text"
                      id="engine_volume"
                      name="engine_volume"
                      value={formData.engine_volume}
                      onChange={handleChange}
                      placeholder="Например, 1.6"
                      className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800"
                    />
                    {formData.engine_volume && (
                      <button
                        type="button"
                        onClick={() => handleClearField('engine_volume')}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-650 transition-colors"
                        title="Очистить"
                      >
                        <CloseIcon className="h-4.5 w-4.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <label htmlFor="body_number" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Номер кузова</label>
                  <div className="relative">
                    <input
                      type="text"
                      id="body_number"
                      name="body_number"
                      value={formData.body_number}
                      onChange={handleChange}
                      className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-mono text-slate-800 text-sm"
                    />
                    {formData.body_number && (
                      <button
                        type="button"
                        onClick={() => handleClearField('body_number')}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-650 transition-colors"
                        title="Очистить"
                      >
                        <CloseIcon className="h-4.5 w-4.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="engine_number" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Номер двигателя</label>
                  <div className="relative">
                    <input
                      type="text"
                      id="engine_number"
                      name="engine_number"
                      value={formData.engine_number}
                      onChange={handleChange}
                      className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-mono text-slate-800 text-sm"
                    />
                    {formData.engine_number && (
                      <button
                        type="button"
                        onClick={() => handleClearField('engine_number')}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-650 transition-colors"
                        title="Очистить"
                      >
                        <CloseIcon className="h-4.5 w-4.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="chassis_number" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Номер шасси</label>
                  <div className="relative">
                    <input
                      type="text"
                      id="chassis_number"
                      name="chassis_number"
                      value={formData.chassis_number}
                      onChange={handleChange}
                      className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-mono text-slate-800 text-sm"
                    />
                    {formData.chassis_number && (
                      <button
                        type="button"
                        onClick={() => handleClearField('chassis_number')}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-650 transition-colors"
                        title="Очистить"
                      >
                        <CloseIcon className="h-4.5 w-4.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-between select-none">
                <button
                  onClick={handlePrevStep}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors"
                >
                  ← Назад
                </button>
                <button
                  onClick={handleNextStep}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow transition-colors"
                >
                  Далее →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: GRZ SELECTION */}
          {step === 3 && (
            <div className="space-y-5 max-w-xl mx-auto">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Шаг 3: Выдача Государственного знака (ГРЗ)</h3>
              
              {freeGrzs.length > 0 ? (
                <div>
                  <label htmlFor="id_grz" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Выберите свободный регистрационный знак
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {freeGrzs.map((grz) => (
                      <label 
                        key={grz.id_grz} 
                        className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${
                          formData.id_grz == grz.id_grz
                            ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-2 ring-blue-100'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="id_grz"
                            value={grz.id_grz}
                            checked={formData.id_grz == grz.id_grz}
                            onChange={handleChange}
                            className="accent-blue-600 h-4 w-4"
                          />
                          <div className="border border-slate-800 text-slate-800 font-extrabold px-3 py-1 rounded tracking-wider text-xs bg-white select-none flex items-center">
                            <span className="font-mono text-sm mr-2">{grz.series.split('-')[0]} {grz.number}</span>
                            <span className="font-mono text-slate-400 border-l border-slate-200 pl-2 text-[10px]">{grz.series.split('-')[1]}</span>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center border border-amber-200 rounded-xl bg-amber-50 text-amber-800 font-medium">
                  ⚠️ Свободные номерные знаки отсутствуют в базе. Запросите новую партию номеров у администратора.
                </div>
              )}

              <div className="pt-4 flex justify-between select-none">
                <button
                  onClick={handlePrevStep}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors"
                >
                  ← Назад
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={freeGrzs.length === 0}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow transition-colors disabled:opacity-50"
                >
                  Далее →
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & CONFIRM */}
          {step === 4 && (
            <div className="space-y-6 max-w-xl mx-auto">
              <h3 className="text-lg font-bold text-slate-800 mb-1">Шаг 4: Проверка сведений и подтверждение</h3>
              <p className="text-slate-500 text-sm">
                Внимательно сверьте все введенные характеристики перед сохранением в базу данных.
              </p>

              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-sm">
                <div className="p-4 bg-slate-50/50">
                  <h4 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Владелец АТС</h4>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <span className="text-xs text-slate-400">Тип:</span>
                      <p className="font-semibold text-slate-700">
                        {formData.owner_type === 'individual' ? 'Физическое лицо' : 'Юридическое лицо'}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400">Наименование:</span>
                      <p className="font-bold text-slate-800">{formData.owner_name}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs text-slate-400">Адрес:</span>
                      <p className="font-semibold text-slate-700">{formData.owner_address}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50/50">
                  <h4 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Характеристики автомобиля</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-2">
                    <div>
                      <span className="text-xs text-slate-400">VIN:</span>
                      <p className="font-mono font-bold text-slate-800">{formData.vin}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400">Модель / Цвет:</span>
                      <p className="font-semibold text-slate-700">
                        {models.find(m => m.id_model == formData.id_model)?.brand_name} {models.find(m => m.id_model == formData.id_model)?.name} ({colors.find(c => c.id_color == formData.id_color)?.name})
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400">Год выпуска:</span>
                      <p className="font-semibold text-slate-700">{formData.year_produced} г.</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50/50">
                  <h4 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Выдаваемый ГРЗ</h4>
                  <div className="mt-2">
                    {freeGrzs.find(g => g.id_grz == formData.id_grz) && (
                      <div className="border border-slate-800 text-slate-800 font-extrabold px-3 py-1 rounded tracking-wider text-xs bg-white w-max flex items-center">
                        <span className="font-mono text-sm mr-2">{freeGrzs.find(g => g.id_grz == formData.id_grz).series.split('-')[0]} {freeGrzs.find(g => g.id_grz == formData.id_grz).number}</span>
                        <span className="font-mono text-slate-400 border-l border-slate-200 pl-2 text-[10px]">{freeGrzs.find(g => g.id_grz == formData.id_grz).series.split('-')[1]}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-between select-none">
                <button
                  onClick={handlePrevStep}
                  disabled={submitting}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  ← Назад
                </button>
                <button
                  onClick={handleRegisterSubmit}
                  disabled={submitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow transition-all flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span>Оформление...</span>
                    </>
                  ) : (
                    <>
                      <RegisterIcon className="h-4 w-4" />
                      <span>Зарегистрировать</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: SUCCESS & PRINT CERTIFICATE */}
          {step === 5 && successData && (
            <div className="space-y-6 max-w-xl mx-auto text-center py-6">
              <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 animate-bounce">
                <SuccessIcon className="h-10 w-10 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Регистрация успешно завершена!</h3>
                <p className="text-slate-500 text-sm mt-1">Автомобиль зарегистрирован, свидетельство сформировано.</p>
              </div>

              {/* Electronic certificate display */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left space-y-4 max-w-sm mx-auto shadow-md relative overflow-hidden">
                <div className="absolute -right-6 top-3 bg-blue-600 text-white text-[9px] font-extrabold uppercase py-0.5 w-24 text-center tracking-wider rotate-45 shadow-sm">
                  ГИБДД
                </div>
                
                <div className="border-b border-slate-200 pb-3">
                  <h4 className="font-extrabold text-slate-800 text-sm tracking-tight text-center">ЭЛЕКТРОННОЕ СВИДЕТЕЛЬСТВО</h4>
                  <p className="text-[10px] text-slate-400 text-center font-bold mt-0.5 uppercase tracking-wider">О регистрации транспортного средства</p>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block">Государственный знак (ГРЗ):</span>
                    <p className="text-sm font-extrabold text-slate-800 mt-0.5">{successData.grz}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Владелец:</span>
                    <p className="font-bold text-slate-800">{successData.owner_name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 font-semibold block">VIN:</span>
                      <p className="font-mono font-bold text-slate-800 truncate" title={successData.vin}>{successData.vin}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">Дата выдачи:</span>
                      <p className="font-semibold text-slate-700">{new Date(successData.date_registered).toLocaleDateString('ru-RU')}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-3 text-center">
                  <p className="text-[9px] text-slate-400 font-semibold">Идентификатор документа: Doc-{successData.id_registration}</p>
                </div>
              </div>

              <div className="pt-4 flex justify-center gap-3 select-none">
                <button
                  onClick={() => setStep(1)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors"
                >
                  Новая регистрация
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow transition-colors flex items-center gap-1.5"
                >
                  <PrintIcon className="h-4 w-4" />
                  <span>Распечатать</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DEREGISTER TAB */}
      {activeTab === 'deregister' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="max-w-xl mx-auto space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Снятие транспортного средства с регистрационного учета</h3>
            <p className="text-slate-500 text-sm">
              Введите VIN-код зарегистрированного автомобиля, чтобы аннулировать государственную регистрацию и высвободить выданный номерной знак.
            </p>

            {/* Success alert */}
            {deregSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-medium flex items-start gap-3">
                <SuccessIcon className="h-5 w-5 text-emerald-600" />
                <div>{deregSuccess}</div>
              </div>
            )}

            {/* Error alert */}
            {deregError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 font-medium flex items-center gap-3">
                <WarningIcon className="h-5 w-5 text-red-600" />
                <span>{deregError}</span>
              </div>
            )}

            <form onSubmit={handleDeregisterSubmit} className="flex gap-3 pt-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={deregVin}
                  onChange={(e) => setDeregVin(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  maxLength={17}
                  placeholder="Введите 17-значный VIN..."
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-mono text-slate-800 tracking-wider"
                  disabled={deregLoading}
                />
                {deregVin && (
                  <button
                    type="button"
                    onClick={() => setDeregVin('')}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-650 transition-colors"
                    title="Очистить"
                    disabled={deregLoading}
                  >
                    <CloseIcon className="h-4.5 w-4.5" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={deregLoading || deregVin.length !== 17}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {deregLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  <>
                    <WarningIcon className="h-4 w-4 text-white" />
                    <span>Снять с учета</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;

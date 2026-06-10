import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { LockIcon, RefreshIcon, SearchIcon, CloseIcon } from '../components/Icons';

const Audit = () => {
  const { user } = useContext(AuthContext);

  // States
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterAction, setFilterAction] = useState('all');

  const isAdmin = user && user.role === 'admin';

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/admin/audit');
      setLogs(response.data);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError(err.response?.data?.detail || 'Не удалось загрузить журнал аудита. Проверьте подключение к сети.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchLogs();
    }
  }, [user]);

  if (!isAdmin) {
    return (
      <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center py-20 space-y-3">
        <LockIcon className="h-10 w-10 text-slate-400 mx-auto" />
        <h3 className="text-lg font-bold text-slate-800 mt-3">Доступ ограничен</h3>
        <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto leading-relaxed">
          Просмотр системного журнала аудита и логов безопасности доступен только администраторам системы.
        </p>
      </div>
    );
  }

  // Get unique actions for filter options
  const uniqueActions = Array.from(new Set(logs.map(log => log.action)));

  // Filter logic
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_id.toString().includes(searchTerm) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || log.role === filterRole;
    const matchesAction = filterAction === 'all' || log.action === filterAction;

    return matchesSearch && matchesRole && matchesAction;
  });

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'inspector':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'registrar':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'to_employee':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'analyst':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'inspector': return 'Инспектор';
      case 'registrar': return 'Регистратор';
      case 'to_employee': return 'Сотрудник ТО';
      case 'analyst': return 'Аналитик';
      default: return role;
    }
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'LOGIN':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'REGISTER_VEHICLE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-250';
      case 'DEREGISTER_VEHICLE':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'SEARCH_VEHICLE':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'STOLEN_VEHICLE':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'FOUND_VEHICLE':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'CREATE_TO':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'CREATE_ACCIDENT':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-750 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Журнал аудита безопасности</h2>
          <p className="text-slate-500 text-sm mt-0.5">Системные логи действий пользователей и операций с базой данных.</p>
        </div>
        <button
          onClick={fetchLogs}
          className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-sm transition-colors flex items-center gap-1.5"
          disabled={loading}
        >
          <RefreshIcon className="h-4 w-4" />
          <span>Обновить</span>
        </button>
      </div>

      {/* Filters card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <SearchIcon className="h-4 w-4 text-slate-500" />
          <span>Фильтры поиска логов</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="search" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Поиск по тексту / ID
            </label>
            <div className="relative">
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Введите ID, действие или подробности..."
                className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 text-xs font-medium"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-650 transition-colors"
                  title="Очистить"
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="role" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Роль сотрудника
            </label>
            <select
              id="role"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 text-xs font-medium"
            >
              <option value="all">Все роли</option>
              <option value="admin">Администраторы</option>
              <option value="inspector">Инспекторы ДПС</option>
              <option value="registrar">Регистраторы</option>
              <option value="to_employee">Сотрудники ТО</option>
              <option value="analyst">Аналитики</option>
            </select>
          </div>

          <div>
            <label htmlFor="action" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Тип операции
            </label>
            <select
              id="action"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 text-xs font-medium"
            >
              <option value="all">Все действия</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main logs display table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-500 font-semibold">{error}</div>
        ) : filteredLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-200 select-none">
                  <th className="px-6 py-3">Дата / Время</th>
                  <th className="px-6 py-3">Сотрудник</th>
                  <th className="px-6 py-3">Действие</th>
                  <th className="px-6 py-3">Объект</th>
                  <th className="px-6 py-3">Подробности</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredLogs.map((log) => (
                  <tr key={log.id_audit} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3.5 font-medium text-slate-500 select-none">
                      {new Date(log.created_at).toLocaleString('ru-RU')}
                    </td>
                    <td className="px-6 py-3.5 select-none">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">ID: {log.user_id}</span>
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded border ${getRoleBadge(log.role)}`}>
                          {getRoleLabel(log.role)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded border ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-medium text-slate-650">
                      {log.entity_type ? (
                        <span>
                          {log.entity_type} {log.entity_id ? `(ID: ${log.entity_id})` : ''}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">нет</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 font-medium max-w-md truncate md:max-w-none md:whitespace-normal" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center text-slate-400 italic bg-slate-50/10 border border-dashed border-slate-200 rounded-xl m-6">
            Логи с выбранными фильтрами отсутствуют в журнале.
          </div>
        )}
      </div>
    </div>
  );
};

export default Audit;

import React, { useState, useContext } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  SearchIcon, RegisterIcon, StolenIcon, MaintenanceIcon, 
  AccidentIcon, AnalyticsIcon, AuditIcon, LogoutIcon, LogoIcon,
  MenuIcon, CloseIcon
} from './Icons';

const Layout = () => {
  const { user, logout } = useContext(AuthContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return { label: 'Администратор', classes: 'bg-red-50 text-red-700 border-red-200' };
      case 'inspector': return { label: 'Инспектор ДПС', classes: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'registrar': return { label: 'Регистратор', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'to_employee': return { label: 'Сотрудник ТО', classes: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'analyst': return { label: 'Аналитик', classes: 'bg-purple-50 text-purple-700 border-purple-200' };
      default: return { label: role, classes: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const roleInfo = user ? getRoleLabel(user.role) : { label: '', classes: '' };

  // Helper for conditional navigation items based on role
  const hasAccess = (allowedRoles) => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  const navItems = [
    { to: '/', label: 'Поиск АТС', icon: <SearchIcon className="h-5 w-5" />, roles: ['admin', 'inspector', 'registrar', 'to_employee', 'analyst'] },
    { to: '/register', label: 'Регистрация', icon: <RegisterIcon className="h-5 w-5" />, roles: ['admin', 'registrar'] },
    { to: '/stolen', label: 'Реестр розыска', icon: <StolenIcon className="h-5 w-5" />, roles: ['admin', 'inspector', 'registrar', 'to_employee', 'analyst'] },
    { to: '/maintenance', label: 'Техосмотр (ТО)', icon: <MaintenanceIcon className="h-5 w-5" />, roles: ['admin', 'to_employee', 'analyst', 'inspector', 'registrar'] },
    { to: '/accidents', label: 'Учет ДТП', icon: <AccidentIcon className="h-5 w-5" />, roles: ['admin', 'inspector', 'analyst', 'registrar', 'to_employee'] },
    { to: '/reports', label: 'Аналитика', icon: <AnalyticsIcon className="h-5 w-5" />, roles: ['admin', 'analyst'] },
    { to: '/audit', label: 'Журнал аудита', icon: <AuditIcon className="h-5 w-5" />, roles: ['admin'] },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 md:px-6 shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          {/* Hamburger toggle for mobile */}
          {user && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-lg md:hidden transition-colors"
              title="Открыть меню"
            >
              <MenuIcon className="h-6 w-6" />
            </button>
          )}
          
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-blue-200">
              <LogoIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold text-slate-800 tracking-tight leading-none">ИС ГИБДД</h1>
              <span className="text-[9px] md:text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Субъект РФ</span>
            </div>
          </div>
        </div>

        {user && (
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex flex-col items-end">
              <span className="text-xs md:text-sm font-semibold text-slate-800 max-w-[120px] md:max-w-none truncate">
                {user.full_name}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 rounded border ${roleInfo.classes}`}>
                  {roleInfo.label}
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">ID: {user.id_employee}</span>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200"></div>

            <button
              onClick={logout}
              className="p-1.5 md:p-2 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg transition-colors flex items-center gap-1.5 text-xs md:text-sm font-medium"
              title="Выйти из системы"
            >
              <LogoutIcon className="h-4.5 w-4.5" />
              <span className="hidden md:inline">Выйти</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Body */}
      <div className="flex-1 flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col justify-between p-4 sticky top-16 h-[calc(100vh-4rem)]">
          <nav className="space-y-1">
            {navItems
              .filter(item => hasAccess(item.roles))
              .map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100/50'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`
                  }
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
          </nav>

          {/* Footer info inside sidebar */}
          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 text-center font-medium">
            <p>Информационная система ГИБДД</p>
            <p className="mt-0.5 text-slate-300">© 2026 Все права защищены</p>
          </div>
        </aside>

        {/* Mobile Sidebar Drawer */}
        {sidebarOpen && user && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-slate-900/50 z-40 md:hidden transition-opacity"
              onClick={() => setSidebarOpen(false)}
            ></div>
            
            {/* Drawer Container */}
            <aside className="fixed inset-y-0 left-0 w-64 bg-white z-50 p-4 flex flex-col justify-between shadow-2xl md:hidden animate-slide-in">
              <div>
                {/* Mobile Drawer Header */}
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-150">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow">
                      <LogoIcon className="h-4.5 w-4.5 text-white" />
                    </div>
                    <span className="font-bold text-slate-800 text-sm">Меню навигации</span>
                  </div>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors"
                    title="Закрыть меню"
                  >
                    <CloseIcon className="h-5 w-5" />
                  </button>
                </div>
                
                <nav className="space-y-1">
                  {navItems
                    .filter(item => hasAccess(item.roles))
                    .map(item => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                            isActive
                              ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100/50'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                          }`
                        }
                      >
                        <span className="text-lg">{item.icon}</span>
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                </nav>
              </div>

              {/* Mobile Drawer Footer */}
              <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 text-center font-medium">
                <p>Информационная система ГИБДД</p>
                <p className="mt-0.5 text-slate-300">© 2026 Все права защищены</p>
              </div>
            </aside>
          </>
        )}

        {/* Content Area */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;

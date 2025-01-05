import React from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

const Layout = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'order', path: '/order', label: t('nav.order') },
    { name: 'overview', path: '/overview', label: t('nav.overview') },
    { name: 'delivery', path: '/delivery', label: t('nav.delivery') },
    { name: 'balance', path: '/balance', label: t('nav.balance') },
  ];

  if (user?.username === 'admin') {
    navigation.push({ name: 'users', path: '/users', label: t('nav.users') });
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row py-3 gap-2">
            <div className="flex items-center w-full sm:w-auto">
              <span className="text-xl font-bold text-blue-600">PickUp</span>
            </div>
            <div className="flex flex-wrap gap-2 items-center flex-grow order-last sm:order-none">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`${
                    location.pathname === item.path
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-3 py-2 border-b-2 text-sm font-medium whitespace-nowrap`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => handleLanguageChange('en')}
                  className={`px-2 py-1 text-sm rounded ${
                    i18n.language === 'en'
                      ? 'bg-blue-100 text-blue-800'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => handleLanguageChange('de')}
                  className={`px-2 py-1 text-sm rounded ${
                    i18n.language === 'de'
                      ? 'bg-blue-100 text-blue-800'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  DE
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">{user?.username}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  {t('auth.logout')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;

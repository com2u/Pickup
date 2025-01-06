import React from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const Layout = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <nav className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row py-3 gap-2">
            <div className="flex items-center w-full sm:w-auto">
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400">PickUp</span>
            </div>
            <div className="flex flex-wrap gap-2 items-center flex-grow order-last sm:order-none">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`${
                    location.pathname === item.path
                      ? 'border-blue-500 text-gray-900 dark:text-white'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
                  } inline-flex items-center px-3 py-2 border-b-2 text-sm font-medium whitespace-nowrap`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
              <div className="flex items-center gap-4 justify-end">
                <button
                  onClick={toggleTheme}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? (
                    // Sun icon for dark mode
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    // Moon icon for light mode
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => handleLanguageChange('en')}
                  className={`p-2 rounded ${
                    i18n.language === 'en'
                      ? 'bg-blue-100 dark:bg-blue-900'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  aria-label="Switch to English"
                >
                  <svg className="w-5 h-5" viewBox="0 0 640 480">
                    <g fillRule="evenodd">
                      <path fill="#012169" d="M0 0h640v480H0z"/>
                      <path fill="#FFF" d="m75 0 244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-178L0 64V0h75z"/>
                      <path fill="#C8102E" d="m424 281 216 159v40L369 281h55zm-184 20 6 35L54 480H0l240-179zM640 0v3L391 191l2-44L590 0h50zM0 0l239 176h-60L0 42V0z"/>
                      <path fill="#FFF" d="M241 0v480h160V0H241zM0 160v160h640V160H0z"/>
                      <path fill="#C8102E" d="M0 193v96h640v-96H0zM273 0v480h96V0h-96z"/>
                    </g>
                  </svg>
                </button>
                <button
                  onClick={() => handleLanguageChange('de')}
                  className={`p-2 rounded ${
                    i18n.language === 'de'
                      ? 'bg-blue-100 dark:bg-blue-900'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  aria-label="Switch to German"
                >
                  <svg className="w-5 h-5" viewBox="0 0 640 480">
                    <path fill="#FFCE00" d="M0 320h640v160H0z"/>
                    <path d="M0 0h640v160H0z"/>
                    <path fill="#D00" d="M0 160h640v160H0z"/>
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">{user?.username}</span>
                <button
                  onClick={handleLogout}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                  aria-label="Logout"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
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

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import config from '../config';

const Users = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    if (user?.username !== 'admin') {
      navigate('/order');
      return;
    }
    fetchUsers();
  }, [user, navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[Users] Fetching users...');
      const response = await axios.get(`${config.apiUrl}/api/auth/users`);
      console.log('[Users] Received users:', response.data);
      setUsers(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const validationSchema = Yup.object({
    username: Yup.string().required(t('validation.required')),
    password: Yup.string().required(t('validation.required')),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password'), null], t('validation.passwordMismatch'))
      .required(t('validation.required')),
  });

  const passwordValidationSchema = Yup.object({
    password: Yup.string().required(t('validation.required')),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password'), null], t('validation.passwordMismatch'))
      .required(t('validation.required')),
  });

  const handleAddUser = async (values, { setSubmitting, resetForm }) => {
    try {
      setError(null);
      console.log('[Users] Adding new user:', { username: values.username });
      await axios.post(`${config.apiUrl}/api/auth/register`, {
        username: values.username,
        password: values.password,
      });
      console.log('[Users] User added successfully');
      await fetchUsers();
      setShowAddUser(false);
      resetForm();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async (values, { setSubmitting, resetForm }) => {
    try {
      setError(null);
      console.log('[Users] Changing password for user:', selectedUser.username);
      await axios.post(`${config.apiUrl}/api/auth/users/${selectedUser.id}/password`, {
        password: values.password,
      });
      console.log('[Users] Password changed successfully');
      setShowPasswordForm(false);
      setSelectedUser(null);
      resetForm();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm(t('users.confirmDelete'))) {
      return;
    }

    try {
      setError(null);
      console.log('[Users] Deleting user:', userId);
      await axios.delete(`${config.apiUrl}/api/auth/users/${userId}`);
      console.log('[Users] User deleted successfully');
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('users.title')}</h1>
        <button
          onClick={() => setShowAddUser(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {t('users.addUser')}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="text-red-700">{error}</div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {users.map((u) => (
            <li key={u.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.username}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </p>
                </div>
                {u.username !== 'admin' && (
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        setSelectedUser(u);
                        setShowPasswordForm(true);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-900"
                    >
                      {t('auth.changePassword')}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="text-sm text-red-600 hover:text-red-900"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {t('users.addUser')}
            </h3>
            <Formik
              initialValues={{ username: '', password: '', confirmPassword: '' }}
              validationSchema={validationSchema}
              onSubmit={handleAddUser}
            >
              {({ isSubmitting, touched, errors }) => (
                <Form className="space-y-4">
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                      {t('auth.username')}
                    </label>
                    <Field
                      type="text"
                      name="username"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    {touched.username && errors.username && (
                      <div className="text-red-500 text-xs mt-1">{errors.username}</div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      {t('auth.password')}
                    </label>
                    <Field
                      type="password"
                      name="password"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    {touched.password && errors.password && (
                      <div className="text-red-500 text-xs mt-1">{errors.password}</div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                      {t('auth.confirmPassword')}
                    </label>
                    <Field
                      type="password"
                      name="confirmPassword"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    {touched.confirmPassword && errors.confirmPassword && (
                      <div className="text-red-500 text-xs mt-1">{errors.confirmPassword}</div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowAddUser(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {t('common.save')}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordForm && selectedUser && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {t('auth.changePassword')} - {selectedUser.username}
            </h3>
            <Formik
              initialValues={{ password: '', confirmPassword: '' }}
              validationSchema={passwordValidationSchema}
              onSubmit={handleChangePassword}
            >
              {({ isSubmitting, touched, errors }) => (
                <Form className="space-y-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      {t('auth.newPassword')}
                    </label>
                    <Field
                      type="password"
                      name="password"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    {touched.password && errors.password && (
                      <div className="text-red-500 text-xs mt-1">{errors.password}</div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                      {t('auth.confirmPassword')}
                    </label>
                    <Field
                      type="password"
                      name="confirmPassword"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    {touched.confirmPassword && errors.confirmPassword && (
                      <div className="text-red-500 text-xs mt-1">{errors.confirmPassword}</div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordForm(false);
                        setSelectedUser(null);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {t('common.save')}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;

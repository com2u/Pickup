import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import config from '../config';

const Balance = () => {
  const { t } = useTranslation();
  const [balances, setBalances] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[Balance] Fetching balances and history...');
      const [balancesResponse, historyResponse] = await Promise.all([
        axios.get(`${config.apiUrl}/api/orders/balances`),
        axios.get(`${config.apiUrl}/api/orders/balance-history`),
      ]);
      console.log('[Balance] Received balances:', balancesResponse.data);
      console.log('[Balance] Received history:', historyResponse.data);

      setBalances(balancesResponse.data);
      setHistory(historyResponse.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const validationSchema = Yup.object({
    amount: Yup.number()
      .required(t('validation.required'))
      .typeError(t('validation.invalidAmount')),
    description: Yup.string().required(t('validation.required')),
  });

  const handleCorrection = async (values, { setSubmitting, resetForm }) => {
    try {
      setError(null);
      const correctionData = {
        userId: selectedUser.id,
        amount: parseFloat(values.amount),
        description: values.description,
      };
      console.log('[Balance] Applying correction:', correctionData);
      await axios.post(`${config.apiUrl}/api/orders/balance-correction`, correctionData);
      console.log('[Balance] Correction applied successfully');
      await fetchData();
      setShowCorrectionForm(false);
      setSelectedUser(null);
      resetForm();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to apply correction');
    } finally {
      setSubmitting(false);
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
      <h1 className="text-2xl font-bold text-gray-900">{t('balance.title')}</h1>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="text-red-700">{error}</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Balances */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900">
              {t('balance.currentBalance')}
            </h2>
          </div>
          <ul className="divide-y divide-gray-200">
            {balances.map((balance) => (
              <li
                key={balance.id}
                className="px-4 py-4 sm:px-6 hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  setSelectedUser(balance);
                  setShowCorrectionForm(true);
                }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">
                    {balance.username}
                  </p>
                  <p
                    className={`text-sm font-semibold ${
                      balance.current_balance >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {new Intl.NumberFormat('de-DE', {
                      style: 'currency',
                      currency: 'EUR',
                    }).format(balance.current_balance)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Balance History */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900">
              {t('balance.history')}
            </h2>
          </div>
          <div className="overflow-y-auto max-h-96">
            <ul className="divide-y divide-gray-200">
              {history.map((entry) => (
                <li key={entry.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {entry.username}
                      </p>
                      <p className="text-sm text-gray-500">{entry.description}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(entry.created_at).toLocaleString()}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-semibold ${
                        entry.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {new Intl.NumberFormat('de-DE', {
                        style: 'currency',
                        currency: 'EUR',
                      }).format(entry.amount)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Correction Form */}
      {showCorrectionForm && selectedUser && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {t('balance.correction')} - {selectedUser.username}
            </h3>
            <Formik
              initialValues={{ amount: '', description: '' }}
              validationSchema={validationSchema}
              onSubmit={handleCorrection}
            >
              {({ isSubmitting, touched, errors }) => (
                <Form className="space-y-4">
                  <div>
                    <label
                      htmlFor="amount"
                      className="block text-sm font-medium text-gray-700"
                    >
                      {t('balance.correctionAmount')}
                    </label>
                    <Field
                      type="number"
                      name="amount"
                      step="0.01"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    {touched.amount && errors.amount && (
                      <div className="text-red-500 text-xs mt-1">
                        {errors.amount}
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700"
                    >
                      {t('balance.correctionReason')}
                    </label>
                    <Field
                      type="text"
                      name="description"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    {touched.description && errors.description && (
                      <div className="text-red-500 text-xs mt-1">
                        {errors.description}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCorrectionForm(false);
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

export default Balance;

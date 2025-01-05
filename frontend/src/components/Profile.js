import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../contexts/AuthContext';

const Profile = () => {
  const { t } = useTranslation();
  const { changePassword } = useAuth();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const validationSchema = Yup.object({
    currentPassword: Yup.string().required(t('validation.required')),
    newPassword: Yup.string().required(t('validation.required')),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('newPassword'), null], t('validation.passwordMismatch'))
      .required(t('validation.required')),
  });

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      setError(null);
      setSuccess(false);
      const result = await changePassword(values.currentPassword, values.newPassword);
      if (result) {
        setSuccess(true);
        resetForm();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {t('auth.changePassword')}
      </h1>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="text-red-700">{error}</div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
          <div className="text-green-700">{t('common.success')}</div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <Formik
          initialValues={{
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, touched, errors }) => (
            <Form className="space-y-6">
              <div>
                <label
                  htmlFor="currentPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  {t('auth.currentPassword')}
                </label>
                <Field
                  type="password"
                  name="currentPassword"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {touched.currentPassword && errors.currentPassword && (
                  <div className="text-red-500 text-xs mt-1">
                    {errors.currentPassword}
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  {t('auth.newPassword')}
                </label>
                <Field
                  type="password"
                  name="newPassword"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {touched.newPassword && errors.newPassword && (
                  <div className="text-red-500 text-xs mt-1">
                    {errors.newPassword}
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  {t('auth.confirmPassword')}
                </label>
                <Field
                  type="password"
                  name="confirmPassword"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {touched.confirmPassword && errors.confirmPassword && (
                  <div className="text-red-500 text-xs mt-1">
                    {errors.confirmPassword}
                  </div>
                )}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isSubmitting ? t('common.loading') : t('common.save')}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default Profile;

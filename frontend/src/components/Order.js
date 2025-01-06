import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import ItemList from './ItemList';
import config from '../config';
import { useAuth } from '../contexts/AuthContext';

const Order = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddItem, setShowAddItem] = useState(false);

  // Track if any quantity is being edited
  const [isEditing, setIsEditing] = useState(false);

  // Deep compare objects to check if data has actually changed
  const hasDataChanged = (oldData, newData) => {
    return JSON.stringify(oldData) !== JSON.stringify(newData);
  };

  useEffect(() => {
    fetchData();
    // Only auto-refresh when not editing
    if (!isEditing && !showAddItem) {
      const interval = setInterval(fetchData, 10000); // Increased to 10 seconds
      return () => clearInterval(interval);
    }
  }, [isEditing, showAddItem]);

  const handleQuantityFocus = () => {
    setIsEditing(true);
  };

  const handleQuantityBlur = () => {
    setIsEditing(false);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[Order] Fetching items and orders...');
      const [itemsResponse, ordersResponse] = await Promise.all([
        axios.get(`${config.apiUrl}/api/items`),
        axios.get(`${config.apiUrl}/api/orders`),
      ]);
      console.log('[Order] Received items:', itemsResponse.data);
      console.log('[Order] Received orders:', ordersResponse.data);

      // Only update items if they've changed
      if (hasDataChanged(items, itemsResponse.data)) {
        setItems(itemsResponse.data);
      }

      // Transform orders into quantities object (filter for current user)
      const userOrders = ordersResponse.data
        .filter(order => order.user_id === user.id)
        .reduce((acc, order) => {
          acc[order.item_id] = order.quantity;
          return acc;
        }, {});

      // Only update quantities if they've changed
      if (hasDataChanged(quantities, userOrders)) {
        setQuantities(userOrders);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = async (itemId, quantity) => {
    try {
      setError(null);
      
      // Update local state immediately for responsive UI
      setQuantities(prev => ({
        ...prev,
        [itemId]: quantity
      }));

      // Send update to server
      console.log('[Order] Sending batch update:', {
        itemId,
        quantity,
        userId: user.id
      });
      await axios.post(`${config.apiUrl}/api/orders/batch`, {
        orders: [{
          itemId: parseInt(itemId),
          quantity: quantity || 0,
          userId: user.id  // Include the user ID from context
        }]
      });
      console.log('[Order] Batch update successful');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update order');
      // Revert local state on error
      fetchData();
    }
  };

  const validationSchema = Yup.object({
    name: Yup.string().required(t('validation.required')),
    price: Yup.number()
      .required(t('validation.required'))
      .positive(t('validation.invalidNumber')),
  });

  const handleAddItem = async (values, { setSubmitting, resetForm }) => {
    try {
      setError(null);
      console.log('[Order] Adding new item:', values);
      await axios.post(`${config.apiUrl}/api/items`, values);
      console.log('[Order] Item added successfully');
      await fetchData();
      setShowAddItem(false);
      resetForm();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add item');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-gray-900 dark:text-white">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('order.title')}</h1>
        <button
          onClick={() => setShowAddItem(!showAddItem)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        >
          {t('order.addItem')}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 border-l-4 border-red-400 dark:border-red-500 p-4">
          <div className="text-red-700 dark:text-red-400">{error}</div>
        </div>
      )}

      {showAddItem && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <Formik
            initialValues={{ name: '', price: '' }}
            validationSchema={validationSchema}
            onSubmit={handleAddItem}
          >
            {({ isSubmitting, touched, errors }) => (
              <Form className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('order.itemName')}
                  </label>
                  <Field
                    type="text"
                    name="name"
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                  {touched.name && errors.name && (
                    <div className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.name}</div>
                  )}
                </div>

                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('order.price')}
                  </label>
                  <Field
                    type="number"
                    name="price"
                    step="0.01"
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                  {touched.price && errors.price && (
                    <div className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.price}</div>
                  )}
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddItem(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50"
                  >
                    {t('common.save')}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      )}

      <ItemList
        items={items}
        quantities={quantities}
        onQuantityChange={handleQuantityChange}
        onQuantityFocus={handleQuantityFocus}
        onQuantityBlur={handleQuantityBlur}
      />

    </div>
  );
};

export default Order;

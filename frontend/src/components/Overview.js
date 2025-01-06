import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import config from '../config';

const Overview = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.username === 'admin';
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedOrders, setEditedOrders] = useState({});
  const [editedItems, setEditedItems] = useState({});

  // Deep compare objects to check if data has actually changed
  const hasDataChanged = (oldData, newData) => {
    return JSON.stringify(oldData) !== JSON.stringify(newData);
  };

  useEffect(() => {
    fetchData();
    // Only auto-refresh when not in edit mode
    if (!editMode) {
      const interval = setInterval(fetchData, 10000); // Increased to 10 seconds
      return () => clearInterval(interval);
    }
  }, [editMode]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[Overview] Fetching users, items, and orders...');
      const [usersResponse, itemsResponse, ordersResponse] = await Promise.all([
        axios.get(`${config.apiUrl}/api/auth/users`),
        axios.get(`${config.apiUrl}/api/items`),
        axios.get(`${config.apiUrl}/api/orders`),
      ]);
      console.log('[Overview] Received users:', usersResponse.data);
      console.log('[Overview] Received items:', itemsResponse.data);
      console.log('[Overview] Received orders:', ordersResponse.data);

      // Filter out unnecessary user data
      const filteredUsers = usersResponse.data.map(user => ({
        id: user.id,
        username: user.username
      }));
      // Only update state if data has changed
      if (hasDataChanged(users, filteredUsers)) {
        setUsers(filteredUsers);
      }

      if (hasDataChanged(items, itemsResponse.data)) {
        setItems(itemsResponse.data);
        setEditedItems(itemsResponse.data.reduce((acc, item) => {
          acc[item.id] = { name: item.name, price: item.price };
          return acc;
        }, {}));
      }

      // Transform orders into a user-based structure
      const ordersByUser = ordersResponse.data.reduce((acc, order) => {
        if (!acc[order.user_id]) {
          acc[order.user_id] = {};
        }
        acc[order.user_id][order.item_id] = order.quantity;
        return acc;
      }, {});

      // Only update orders if they've changed
      if (hasDataChanged(orders, ordersByUser)) {
        setOrders(ordersByUser);
        if (!editMode) {
          setEditedOrders(ordersByUser);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (userId, itemId, quantity) => {
    setEditedOrders((prev) => {
      // Create a new object to avoid mutating state
      const newOrders = { ...prev };
      
      // Ensure the user object exists
      if (!newOrders[userId]) {
        newOrders[userId] = {};
      }
      
      // If quantity is empty, undefined, or 0, delete the item from user's orders
      if (!quantity) {
        const userOrders = { ...newOrders[userId] };
        delete userOrders[itemId];
        
        // If user has no orders, remove the user entry
        if (Object.keys(userOrders).length === 0) {
          delete newOrders[userId];
        } else {
          newOrders[userId] = userOrders;
        }
      } else {
        // Add/update the order with valid quantity
        newOrders[userId] = {
          ...newOrders[userId],
          [itemId]: quantity
        };
      }
      
      return newOrders;
    });
  };

  const handleItemChange = (itemId, field, value) => {
    setEditedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: field === 'price' ? parseFloat(value) || 0 : value
      }
    }));
  };

  const handleRemoveItem = async (itemId) => {
    try {
      setError(null);
      console.log('[Overview] Removing item:', itemId);
      await axios.delete(`${config.apiUrl}/api/items/${itemId}`);
      console.log('[Overview] Item removed successfully');
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete item');
    }
  };

  const handleSaveChanges = async () => {
    try {
      setError(null);

      // Update items
      if (Object.keys(editedItems).length > 0) {
        console.log('[Overview] Updating items:', editedItems);
        try {
          await Promise.all(
            Object.entries(editedItems).map(([itemId, item]) =>
              axios.put(`${config.apiUrl}/api/items/${itemId}`, item)
            )
          );
          console.log('[Overview] Items updated successfully');
        } catch (err) {
          console.error('[Overview] Failed to update items:', err.response?.data?.error);
        }
      }

      // Transform orders for the API - only include orders with valid quantities
      const validOrders = [];
      
      // Process each user's orders
      for (const [userId, userOrders] of Object.entries(editedOrders)) {
        const parsedUserId = parseInt(userId);
        if (isNaN(parsedUserId)) continue;
        
        // Process each item order for this user
        for (const [itemId, quantity] of Object.entries(userOrders)) {
          const parsedItemId = parseInt(itemId);
          const parsedQuantity = parseInt(quantity);
          
          // Only include orders with valid IDs and quantities
          if (!isNaN(parsedItemId) && !isNaN(parsedQuantity)) {
            // Always include userId in the order object
            const order = {
              userId: parsedUserId,  // This is the user who owns the order
              itemId: parsedItemId,
              quantity: parsedQuantity
            };
            
            // Log the order being added for debugging
            console.log('Adding order:', order);
            
            validOrders.push(order);
          }
        }
      }

      // Log all orders being sent
      console.log('Sending orders to backend:', validOrders);

      console.log('[Overview] Sending batch update for orders:', validOrders);
      await axios.post(`${config.apiUrl}/api/orders/batch`, {
        orders: validOrders,
      });
      console.log('[Overview] Batch update successful');

      setOrders(editedOrders);
      setEditMode(false);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save changes');
    }
  };

  const calculateUserTotal = (userId) => {
    const userOrders = editMode ? editedOrders[userId] : orders[userId];
    if (!userOrders) return 0;

    return Object.entries(userOrders).reduce((total, [itemId, quantity]) => {
      const item = items.find((i) => i.id === parseInt(itemId));
      return total + (item ? item.price * quantity : 0);
    }, 0);
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('overview.orderOverview')}</h1>
        <button
          onClick={() => {
            if (editMode) {
              setEditedOrders(orders);
              setEditedItems(items.reduce((acc, item) => {
                acc[item.id] = { name: item.name, price: item.price };
                return acc;
              }, {}));
            }
            setEditMode(!editMode);
          }}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        >
          {editMode ? t('overview.viewMode') : t('overview.editMode')}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 border-l-4 border-red-400 dark:border-red-500 p-4">
          <div className="text-red-700 dark:text-red-400">{error}</div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-800 shadow rounded-lg">
          <thead>
            <tr>
              <th className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('common.item')}
              </th>
              <th className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('common.price')}
              </th>
              {users.map((user) => (
                <th key={user.id} className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {user.username}
                </th>
              ))}
              {editMode && (
                <th className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('common.delete')}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {editMode ? (
                    <textarea
                      value={editedItems[item.id]?.name || item.name}
                      onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    item.name
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {editMode ? (
                    <textarea
                      value={editedItems[item.id]?.price || item.price}
                      onChange={(e) => handleItemChange(item.id, 'price', e.target.value)}
                      className="w-24 px-2 py-1 text-right border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    new Intl.NumberFormat('de-DE', {
                      style: 'currency',
                      currency: 'EUR',
                    }).format(item.price)
                  )}
                </td>
                {users.map((user) => (
                  <td key={user.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-center">
                    {editMode ? (
                      <input
                        type="number"
                        min="0"
                        value={editedOrders[user.id]?.[item.id] || ''}
                        onChange={(e) =>
                          handleQuantityChange(user.id, item.id, e.target.value)
                        }
                        className="w-20 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                    ) : (
                      orders[user.id]?.[item.id] || 0
                    )}
                  </td>
                ))}
                {editMode && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-center">
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 focus:outline-none"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <td colSpan="2" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                {t('common.total')}
              </td>
              {users.map((user) => (
                <td key={user.id} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-center">
                  {new Intl.NumberFormat('de-DE', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format(calculateUserTotal(user.id))}
                </td>
              ))}
              {editMode && <td />}
            </tr>
          </tfoot>
        </table>
      </div>

      {editMode && (
        <div className="flex justify-end">
          <button
            onClick={handleSaveChanges}
            className="px-6 py-3 text-base font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            {t('common.save')}
          </button>
        </div>
      )}
    </div>
  );
};

export default Overview;

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import config from '../config';

const Delivery = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editPrices, setEditPrices] = useState(false);
  const [editedPrices, setEditedPrices] = useState({});

  useEffect(() => {
    fetchData();
    // Only auto-refresh when not editing prices
    if (!editPrices) {
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
  }, [editPrices]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[Delivery] Fetching items and orders...');
      const [itemsResponse, ordersResponse] = await Promise.all([
        axios.get(`${config.apiUrl}/api/items`),
        axios.get(`${config.apiUrl}/api/orders`),
      ]);
      console.log('[Delivery] Received items:', itemsResponse.data);
      console.log('[Delivery] Received orders:', ordersResponse.data);

      const items = itemsResponse.data;
      setItems(items);
      setEditedPrices(items.reduce((acc, item) => {
        acc[item.id] = item.price;
        return acc;
      }, {}));

      // Group orders by item and user
      const ordersByItem = ordersResponse.data.reduce((acc, order) => {
        if (!acc[order.item_id]) {
          acc[order.item_id] = {
            itemId: order.item_id,
            itemName: order.item_name,
            totalQuantity: 0,
            orders: [],
            userOrders: {} // Track orders by user
          };
        }
        acc[order.item_id].totalQuantity += order.quantity;
        acc[order.item_id].orders.push(order);
        
        // Track orders by user
        if (!acc[order.item_id].userOrders[order.username]) {
          acc[order.item_id].userOrders[order.username] = 0;
        }
        acc[order.item_id].userOrders[order.username] += order.quantity;
        
        return acc;
      }, {});

      setOrders(Object.values(ordersByItem));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (itemId, price) => {
    setEditedPrices((prev) => ({
      ...prev,
      [itemId]: parseFloat(price) || 0,
    }));
  };

  const handleSavePrices = async () => {
    try {
      setError(null);
      console.log('[Delivery] Saving updated prices:', editedPrices);
      await Promise.all(
        Object.entries(editedPrices).map(([itemId, price]) =>
          axios.put(`${config.apiUrl}/api/items/${itemId}`, { price })
        )
      );
      console.log('[Delivery] Prices updated successfully');
      await fetchData();
      setEditPrices(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update prices');
    }
  };

  const handleConfirmPayment = async () => {
    try {
      setError(null);
      const total = calculateTotal();
      
      // Calculate totals per user
      const userTotals = {};
      orders.forEach(item => {
        const price = editPrices ? editedPrices[item.itemId] : items.find(i => i.id === item.itemId)?.price || 0;
        Object.entries(item.userOrders).forEach(([username, quantity]) => {
          if (!userTotals[username]) {
            userTotals[username] = 0;
          }
          userTotals[username] += price * quantity;
        });
      });

      // Send payment confirmation with user totals
      const confirmationData = {
        userId: user.id,
        total: total,
        userTotals: userTotals
      };
      console.log('[Delivery] Confirming payment:', confirmationData);
      await axios.post(`${config.apiUrl}/api/orders/confirm-delivery`, confirmationData);
      console.log('[Delivery] Payment confirmed successfully');

      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to confirm payment');
    }
  };

  const calculateTotal = () => {
    return orders.reduce((total, item) => {
      const price = editPrices ? editedPrices[item.itemId] : items.find(i => i.id === item.itemId)?.price || 0;
      return total + (price * item.totalQuantity);
    }, 0);
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
        <h1 className="text-2xl font-bold text-gray-900">{t('delivery.title')}</h1>
        <button
          onClick={() => {
            if (editPrices) {
              setEditedPrices(
                items.reduce((acc, item) => {
                  acc[item.id] = item.price;
                  return acc;
                }, {})
              );
            }
            setEditPrices(!editPrices);
          }}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {editPrices ? t('common.cancel') : t('delivery.currentPrices')}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="text-red-700">{error}</div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('order.itemName')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('order.quantity')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('order.price')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('order.total')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((item) => (
              <tr key={item.itemId}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {item.itemName}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="text-right">{item.totalQuantity}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {Object.entries(item.userOrders).map(([username, quantity]) => (
                      <div key={username} className="text-right">
                        {username}: {quantity}
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                  {editPrices ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editedPrices[item.itemId]}
                      onChange={(e) => handlePriceChange(item.itemId, e.target.value)}
                      className="w-24 px-2 py-1 text-right border rounded"
                    />
                  ) : (
                    new Intl.NumberFormat('de-DE', {
                      style: 'currency',
                      currency: 'EUR',
                    }).format(items.find(i => i.id === item.itemId)?.price || 0)
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                  {new Intl.NumberFormat('de-DE', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format(
                    item.totalQuantity *
                      (editPrices
                        ? editedPrices[item.itemId]
                        : items.find(i => i.id === item.itemId)?.price || 0)
                  )}
                </td>
              </tr>
            ))}
            <tr className="bg-gray-50">
              <td colSpan="3" className="px-6 py-4 text-sm font-medium text-gray-900">
                {t('delivery.totalAmount')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold">
                {new Intl.NumberFormat('de-DE', {
                  style: 'currency',
                  currency: 'EUR',
                }).format(calculateTotal())}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex justify-end space-x-4">
        {editPrices ? (
          <button
            onClick={handleSavePrices}
            className="px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {t('common.save')}
          </button>
        ) : (
          <button
            onClick={handleConfirmPayment}
            className="px-6 py-3 text-base font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            {t('delivery.paid')}
          </button>
        )}
      </div>
    </div>
  );
};

export default Delivery;

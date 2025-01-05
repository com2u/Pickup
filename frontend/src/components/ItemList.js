import React from 'react';
import { useTranslation } from 'react-i18next';

const ItemList = ({ items, quantities, onQuantityChange, onQuantityFocus, onQuantityBlur, editable = true }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
        >
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900">{item.name}</h3>
            <p className="text-sm text-gray-500">
              {new Intl.NumberFormat('de-DE', {
                style: 'currency',
                currency: 'EUR',
              }).format(item.price)}
            </p>
          </div>
          <div className="w-24">
            {editable ? (
              <input
                type="number"
                min="0"
                value={quantities[item.id] || ''}
                onChange={(e) => onQuantityChange(item.id, parseInt(e.target.value) || 0)}
                onFocus={onQuantityFocus}
                onBlur={onQuantityBlur}
                className="block w-full px-3 py-2 text-right border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="0"
              />
            ) : (
              <span className="block w-full px-3 py-2 text-right text-sm text-gray-700">
                {quantities[item.id] || 0}
              </span>
            )}
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {t('order.noItems')}
        </div>
      )}
    </div>
  );
};

export default ItemList;

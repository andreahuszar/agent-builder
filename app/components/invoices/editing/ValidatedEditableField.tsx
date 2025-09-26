'use client';

import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { EditableField } from './EditableField';

interface ValidatedEditableFieldProps {
  value: any;
  onChange: (value: any) => void;
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'currency';
  options?: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  fieldName?: string;
  min?: number;
  max?: number;
  step?: number;
  currency?: string;
}

export function ValidatedEditableField({
  value,
  onChange,
  type = 'text',
  options = [],
  placeholder = '',
  disabled = false,
  required = false,
  fieldName,
  min,
  max,
  step,
  currency = 'USD',
}: ValidatedEditableFieldProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    setLocalValue(value);
    validateField(value);
  }, [value]);

  const validateField = (fieldValue: any) => {
    // Special handling for vendor field - "Unknown Vendor" is considered invalid
    if (fieldName === 'vendor_name_snapshot' && fieldValue === 'Unknown Vendor') {
      setIsValid(false);
      return;
    }

    if (!required && !fieldValue) {
      setIsValid(true);
      return;
    }

    switch (type) {
      case 'text':
        setIsValid(!!fieldValue && fieldValue.toString().trim().length > 0);
        break;
      case 'number':
      case 'currency':
        setIsValid(fieldValue !== null && fieldValue !== undefined && !isNaN(Number(fieldValue)));
        break;
      case 'date':
        if (!fieldValue) {
          setIsValid(false);
        } else {
          const date = new Date(fieldValue);
          setIsValid(!isNaN(date.getTime()));
        }
        break;
      case 'select':
        setIsValid(!!fieldValue);
        break;
      case 'textarea':
        setIsValid(!!fieldValue && fieldValue.toString().trim().length > 0);
        break;
      default:
        setIsValid(!!fieldValue);
    }
  };

  const handleChange = (newValue: any) => {
    setLocalValue(newValue);
    validateField(newValue);
    onChange(newValue);
  };

  const formatCurrency = (amount: number) => {
    if (!amount && amount !== 0) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const parseCurrency = (value: string) => {
    // Remove currency symbols and thousands separators
    const cleanValue = value.replace(/[^0-9.-]/g, '');
    return parseFloat(cleanValue) || 0;
  };

  // Determine if we should show validation indicator
  const showIndicator = required || (localValue !== null && localValue !== undefined && localValue !== '');

  // Special case for "Unknown Vendor" - always show indicator
  const isUnknownVendor = fieldName === 'vendor_name_snapshot' && localValue === 'Unknown Vendor';
  const shouldShowIndicator = showIndicator || isUnknownVendor;

  const borderColor = !required && !localValue && !isUnknownVendor
    ? 'border-gray-300'
    : isValid && !isUnknownVendor
      ? 'border-gray-300' // Keep normal border for valid fields
      : 'border-red-500 focus:ring-red-500';

  const iconColor = isValid && !isUnknownVendor ? 'text-green-600' : 'text-red-600';
  const Icon = isValid && !isUnknownVendor ? Check : X;

  // For currency type, use a special input handler
  if (type === 'currency') {
    return (
      <div className="relative">
        {shouldShowIndicator && (
          <Icon className={`absolute -left-5 top-[50%] -translate-y-1/2 h-4 w-4 ${iconColor} z-10`} />
        )}
        <input
          type="text"
          value={localValue !== null && localValue !== undefined ? formatCurrency(localValue) : ''}
          onChange={(e) => {
            const numericValue = parseCurrency(e.target.value);
            handleChange(numericValue);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full px-3 py-1.5 text-sm text-gray-950 bg-white border ${borderColor} rounded-md
            focus:outline-none focus:ring-2 focus:border-transparent
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
          `}
        />
      </div>
    );
  }

  // For select type, render directly with validation indicator
  if (type === 'select') {
    return (
      <div className="relative">
        {shouldShowIndicator && (
          <Icon className={`absolute -left-5 top-[50%] -translate-y-1/2 h-4 w-4 ${iconColor} z-10`} />
        )}
        <select
          value={localValue || ''}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          className={`
            w-full px-3 py-1.5 text-sm text-gray-950 bg-white border ${borderColor} rounded-md
            focus:outline-none focus:ring-2 focus:border-transparent
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
          `}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // For all other types, use EditableField with validation indicator
  return (
    <div className="relative">
      {shouldShowIndicator && (
        <Icon className={`absolute -left-5 top-[50%] -translate-y-1/2 h-4 w-4 ${iconColor} z-10`} />
      )}
      <EditableField
        value={localValue}
        onChange={handleChange}
        type={type}
        options={options}
        placeholder={placeholder}
        disabled={disabled}
        className={borderColor.includes('red') ? 'border-red-500 focus:ring-red-500' : ''}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}
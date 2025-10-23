'use client';

import React, { useState, useEffect } from 'react';

interface EditableFieldProps {
  value: any;
  onChange: (value: any) => void;
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea';
  options?: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function EditableField({
  value,
  onChange,
  type = 'text',
  options = [],
  placeholder = '',
  disabled = false,
  className = '',
  min,
  max,
  step,
  onKeyDown,
  autoFocus = false,
  onFocus,
  onBlur,
}: EditableFieldProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const newValue = type === 'number' ? parseFloat(e.target.value) : e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  const baseClassName = `
    w-full px-3 py-1 text-sm text-gray-950 bg-white border border-gray-300 rounded-md
    focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
    disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    ${className}
  `;

  if (type === 'select') {
    return (
      <select
        value={localValue}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        autoFocus={autoFocus}
        disabled={disabled}
        className={baseClassName}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (type === 'textarea') {
    return (
      <textarea
        value={localValue || ''}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        autoFocus={autoFocus}
        placeholder={placeholder}
        disabled={disabled}
        className={`${baseClassName} resize-none`}
        rows={3}
      />
    );
  }

  if (type === 'date') {
    // Convert date to YYYY-MM-DD format for input
    const formatDateForInput = (dateValue: any) => {
      if (!dateValue) return '';
      try {
        const date = new Date(dateValue);
        // Check if the date is valid
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
      } catch (error) {
        // Return empty string if date parsing fails
        return '';
      }
    };

    return (
      <input
        type="date"
        value={formatDateForInput(localValue)}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        autoFocus={autoFocus}
        disabled={disabled}
        className={baseClassName}
      />
    );
  }

  return (
    <input
      type={type}
      value={localValue || ''}
      onChange={handleChange}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      autoFocus={autoFocus}
      placeholder={placeholder}
      disabled={disabled}
      min={min}
      max={max}
      step={step}
      className={baseClassName}
    />
  );
}
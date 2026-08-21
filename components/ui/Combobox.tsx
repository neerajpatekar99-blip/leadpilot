"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  value: string;
  onChange: (val: string) => void;
  options: (string | ComboboxOption)[];
  placeholder?: string;
}

export function Combobox({ value, onChange, options, placeholder = "Select or type..." }: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedOptions: ComboboxOption[] = options.map(opt => 
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  useEffect(() => {
    const matched = normalizedOptions.find(o => o.value === value);
    setInputValue(matched ? matched.label : value);
  }, [value, options]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = normalizedOptions.filter(opt =>
    opt.label.toLowerCase().includes((inputValue || '').toLowerCase()) ||
    opt.value.toLowerCase().includes((inputValue || '').toLowerCase())
  );

  const handleSelect = (opt: ComboboxOption) => {
    setInputValue(opt.label);
    onChange(opt.value);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);
    if (!isOpen) setIsOpen(true);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none pr-8"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
        >
          <ChevronDownIcon className="w-4 h-4" />
        </button>
      </div>

      {isOpen && (
        <ul className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-800 rounded-lg shadow-xl max-h-48 overflow-y-auto py-1">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <li
                key={opt.value}
                onClick={() => handleSelect(opt)}
                className={`px-3 py-1.5 text-xs text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-300 cursor-pointer ${
                  opt.value === value ? 'bg-slate-800 text-emerald-400 font-semibold' : ''
                }`}
              >
                {opt.label}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-xs text-slate-500 italic">No options found.</li>
          )}
        </ul>
      )}
    </div>
  );
}

"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface ComboboxProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
}

export function Combobox({ value, onChange, options, placeholder = "Select or type..." }: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = (inputValue === value && isOpen) 
    ? options 
    : options.filter(opt => opt.toLowerCase().includes(inputValue.toLowerCase()));

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative flex items-center w-full bg-claude-card border border-claude-border rounded-md px-3 focus-within:border-claude-accent transition-colors shadow-sm">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-transparent py-2 text-sm text-claude-text focus:outline-none placeholder-claude-muted"
        />
        <button type="button" onClick={() => setIsOpen(!isOpen)} className="p-1 text-claude-muted hover:text-white transition-colors">
          <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[#1e1e1e] border border-claude-border rounded-md shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { 
                  onChange(opt); 
                  setInputValue(opt); 
                  setIsOpen(false); 
                }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-claude-accent hover:text-white transition-colors ${
                  value === opt ? 'text-claude-accent font-medium' : 'text-gray-300'
                }`}
              >
                {opt}
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-claude-muted">
              Use custom property type: <span className="text-claude-accent font-medium">{inputValue}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>
      <div className="relative bg-claude-card rounded-xl shadow-xl border border-claude-border w-full max-w-lg mx-auto transform transition-all">
        <div className="flex items-center justify-between p-5 border-b border-claude-border">
          <h2 className="text-lg font-semibold font-serif text-claude-text">{title}</h2>
          <button 
            onClick={onClose}
            className="text-claude-muted hover:text-claude-text transition-colors rounded-full p-1 hover:bg-gray-100"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 text-claude-text">
          {children}
        </div>
      </div>
    </div>
  );
}
export default Modal;

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  variant?: 'default' | 'badge' | 'green';
}

const getStatusBadgeClass = (val: string) => {
  switch (val) {
    case 'in_progress': return 'bg-[#0f766e] text-white border-transparent hover:bg-[#0f766e]/90';
    case 'pending': return 'bg-[#a25a48] text-white border-transparent hover:bg-[#a25a48]/90';
    case 'blocked': return 'bg-rose-600 text-white border-transparent hover:bg-rose-600/90';
    case 'completed': return 'bg-primary text-white border-transparent hover:bg-primary/90';
    case 'review': return 'bg-[#51736e] text-white border-transparent hover:bg-[#51736e]/90';
    default: return 'bg-secondary text-foreground border-border hover:bg-secondary/80';
  }
};

export default function CustomSelect({ 
  value, 
  onChange, 
  options, 
  placeholder = 'Select...', 
  className = '', 
  disabled = false,
  variant = 'default'
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={
          variant === 'badge'
            ? `flex items-center justify-between gap-1 rounded-lg px-2 py-1 text-[9px] font-bold cursor-pointer outline-none border transition-all select-none disabled:opacity-55 disabled:cursor-not-allowed ${getStatusBadgeClass(value)}`
            : variant === 'green'
            ? "w-full flex items-center justify-between bg-primary text-primary-foreground border border-primary/20 rounded-xl px-3.5 py-2 text-[11px] font-bold hover:bg-primary/95 cursor-pointer transition-all select-none disabled:opacity-55 disabled:cursor-not-allowed shadow-sm"
            : "w-full flex items-center justify-between bg-white border border-border rounded-xl px-3 py-2 text-[11px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-all select-none disabled:opacity-55 disabled:cursor-not-allowed hover:bg-slate-50/50"
        }
      >
        <span className={variant === 'badge' ? '' : variant === 'green' ? 'text-primary-foreground' : selectedOption ? 'text-foreground' : 'text-muted-foreground/60'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={variant === 'badge' ? 9 : 13} className={variant === 'badge' ? 'text-white/80 shrink-0' : variant === 'green' ? 'text-primary-foreground shrink-0' : 'text-muted-foreground shrink-0'} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.98 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className={`absolute z-50 mt-1 bg-card border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto p-1 origin-top select-none ${
              variant === 'badge' ? 'w-36 right-0' : 'min-w-[140px] w-full left-0'
            }`}
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between text-left transition-colors cursor-pointer ${
                    variant === 'badge'
                      ? 'px-2 py-1 text-[9px] font-bold rounded-lg'
                      : 'px-2.5 py-1.5 text-[11px] font-semibold rounded-lg'
                  } ${
                    isSelected ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-surface-container-high hover:text-on-surface text-foreground'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {variant === 'badge' && (
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        opt.value === 'in_progress' ? 'bg-[#0f766e]' :
                        opt.value === 'pending' ? 'bg-[#a25a48]' :
                        opt.value === 'blocked' ? 'bg-rose-500' :
                        opt.value === 'completed' ? 'bg-primary' :
                        opt.value === 'review' ? 'bg-[#51736e]' :
                        'bg-secondary'
                      }`} />
                    )}
                    {opt.label}
                  </span>
                  {isSelected && <Check size={12} className="text-primary shrink-0" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

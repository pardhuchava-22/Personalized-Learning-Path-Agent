import React from 'react';
import { Check, X } from 'lucide-react';
import { ValidationStatus } from '../../types';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  status?: ValidationStatus;
  errorMessage?: string;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ 
  status = ValidationStatus.Idle, 
  errorMessage, 
  leftIcon,
  className = '', 
  label,
  ...props 
}, ref) => {
  const getBorderColor = () => {
    switch (status) {
      case ValidationStatus.Valid:
        return 'border-success';
      case ValidationStatus.Invalid:
        return 'border-error';
      default:
        return 'border-gray-200 focus:border-primary';
    }
  };

  return (
    <div className="w-full relative group">
      {label && <label className="block text-xs font-medium text-slate-900 mb-1.5">{label}</label>}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={`
            w-full h-12 bg-transparent
            border-b ${getBorderColor()}
            text-slate-900 placeholder-slate-400
            focus:outline-none focus:ring-0
            transition-colors duration-200
            py-3 pr-8
            ${leftIcon ? 'pl-8' : ''}
            ${className}
          `}
          {...props}
        />
        
        {/* Validation Icons */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
          {status === ValidationStatus.Valid && (
            <Check className="w-5 h-5 text-success animate-fade-in" />
          )}
          {status === ValidationStatus.Invalid && (
            <X className="w-5 h-5 text-error animate-fade-in" />
          )}
        </div>
      </div>

      {/* Error Message */}
      {status === ValidationStatus.Invalid && errorMessage && (
        <p className="text-error text-[12px] mt-1 absolute animate-fade-in">
          {errorMessage}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
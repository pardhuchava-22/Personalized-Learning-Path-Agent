import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'google';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading,
  className = '',
  ...props 
}) => {
  const baseStyles = "w-full rounded-lg transition-all duration-200 font-semibold flex items-center justify-center transform active:scale-[0.98]";
  
  const variants = {
    primary: "bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg py-3 text-[14px]",
    secondary: "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 py-3 text-[14px]",
    google: "bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 py-3 text-[14px] flex gap-3",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className} ${isLoading ? 'opacity-80 cursor-wait' : ''}`}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>Processing...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};

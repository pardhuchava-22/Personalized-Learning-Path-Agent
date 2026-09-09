import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button } from '../ui/Button';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  courseTitle: string;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  courseTitle
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const CONFIRMATION_TEXT = "DELETE";

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      setIsDeleting(false);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (inputValue !== CONFIRMATION_TEXT) return;
    
    setIsDeleting(true);
    // Simulate network delay for better UX feel
    setTimeout(() => {
      onConfirm();
      setIsDeleting(false);
    }, 800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className="px-6 py-6 border-b border-slate-100 flex items-start gap-4 bg-red-50/50">
          <div className="p-3 bg-red-100 rounded-full shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900">Delete Course</h3>
            <p className="text-sm text-slate-500 mt-1">
              This action cannot be undone. This will permanently delete the course <span className="font-bold text-slate-800">"{courseTitle}"</span> and remove all progress.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            To confirm, type "<span className="font-bold select-none">{CONFIRMATION_TEXT}</span>" below:
          </label>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type DELETE"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-mono text-sm uppercase"
            autoFocus
          />
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
          <Button 
            variant="secondary" 
            onClick={onClose}
            disabled={isDeleting}
            className="w-auto px-6"
          >
            Cancel
          </Button>
          <button
            onClick={handleConfirm}
            disabled={inputValue !== CONFIRMATION_TEXT || isDeleting}
            className={`
              px-6 py-2.5 rounded-lg font-semibold text-sm text-white flex items-center gap-2 transition-all shadow-lg
              ${inputValue === CONFIRMATION_TEXT 
                ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30 hover:shadow-red-500/40 transform hover:-translate-y-0.5' 
                : 'bg-slate-300 cursor-not-allowed shadow-none'}
            `}
          >
            {isDeleting ? (
              <>Processing...</>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete Course
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
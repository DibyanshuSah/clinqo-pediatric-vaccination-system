import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isDanger = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-primary/45 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-surface rounded-lg border border-border shadow-lg w-full max-w-md overflow-hidden transform transition-all scale-100">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-full ${isDanger ? 'bg-red-50 text-red-600' : 'bg-accent-soft text-accent'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-primary">{title}</h3>
              <p className="text-sm text-secondary mt-2">{message}</p>
            </div>
            <button
              onClick={onCancel}
              className="text-secondary hover:text-primary rounded-lg p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="bg-bg px-6 py-4 flex justify-end gap-3 border-t border-border">
          <button
            onClick={onCancel}
            className="h-10 px-4 text-sm font-semibold border border-border bg-surface hover:bg-bg rounded-lg transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`h-10 px-4 text-sm font-semibold text-white rounded-lg transition-colors ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-accent hover:bg-accent-hover'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

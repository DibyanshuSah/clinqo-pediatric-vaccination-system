import React from 'react';
import { AlertCircle } from 'lucide-react';

const EmptyState = ({ title = "No records found", description = "Try adjusting your filters or search query." }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 bg-surface border border-border border-dashed rounded-lg shadow-sm">
      <div className="w-12 h-12 rounded-full bg-bg flex items-center justify-center text-secondary border border-border mb-4">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-primary mb-1">{title}</h3>
      <p className="text-sm text-secondary max-w-sm">{description}</p>
    </div>
  );
};

export default EmptyState;

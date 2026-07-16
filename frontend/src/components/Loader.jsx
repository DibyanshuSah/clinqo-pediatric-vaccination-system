import React from 'react';

export const Loader = () => {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
};

export const SkeletonLine = ({ className = "h-4 w-full" }) => {
  return (
    <div className={`bg-gray-200 animate-pulse rounded ${className}`}></div>
  );
};

export const SkeletonCard = () => {
  return (
    <div className="bg-surface border border-border p-6 rounded-lg shadow-sm space-y-4">
      <SkeletonLine className="h-4 w-1/3" />
      <SkeletonLine className="h-8 w-2/3" />
      <SkeletonLine className="h-3 w-1/2" />
    </div>
  );
};

export const SkeletonTable = () => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <SkeletonLine className="h-10 w-1/4" />
        <SkeletonLine className="h-10 w-12" />
      </div>
      <div className="border border-border rounded-lg bg-surface divide-y divide-border">
        {[...Array(5)].map((_, idx) => (
          <div key={idx} className="p-4 flex gap-4 items-center">
            <SkeletonLine className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <SkeletonLine className="h-4 w-1/4" />
              <SkeletonLine className="h-3 w-1/3" />
            </div>
            <SkeletonLine className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
};

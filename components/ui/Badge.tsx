import React from 'react';

type BadgeColor = 'blue' | 'yellow' | 'orange' | 'green' | 'gray' | 'red' | 'purple';

export function Badge({ children, color, pulse }: { children: React.ReactNode, color: BadgeColor, pulse?: boolean }) {
  const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border transition-colors";
  
  const colorClasses = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    green: "bg-green-50 text-green-700 border-green-200",
    gray: "bg-gray-100 text-gray-700 border-gray-200",
    red: "bg-red-50 text-red-700 border-red-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200"
  };

  return (
    <span className={`${baseClasses} ${colorClasses[color]}`}>
      {pulse && <span className={`flex w-2 h-2 rounded-full mr-1.5 animate-pulse ${color === 'red' ? 'bg-red-500' : 'bg-gray-400'}`}></span>}
      {children}
    </span>
  );
}

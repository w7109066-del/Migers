
import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

interface SwipeTabsProps {
  tabs: Tab[];
  onTabChange?: (index: number) => void;
  className?: string;
}

export function SwipeTabs({ tabs, onTabChange, className }: SwipeTabsProps) {
  const [activeTab, setActiveTab] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTabClick = useCallback((index: number) => {
    setActiveTab(index);
    onTabChange?.(index);
  }, [onTabChange]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Tab Content */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden relative"
      >
        <div 
          className="flex h-full will-change-transform"
          style={{
            transform: `translateX(-${activeTab * 100}%)`,
            width: `${tabs.length * 100}%`,
            transition: 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {tabs.map((tab, index) => (
            <div
              key={tab.id}
              className="w-full h-full flex-shrink-0"
              style={{ width: `${100 / tabs.length}%` }}
            >
              {Math.abs(index - activeTab) <= 1 ? tab.content : null}
            </div>
          ))}
        </div>
      </div>

      {/* Tab Navigation - At bottom */}
      <div className="flex bg-white border-t border-gray-200">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(index)}
            className={cn(
              "flex-1 flex flex-col items-center py-3 px-2 text-xs font-medium transition-colors",
              activeTab === index
                ? "text-primary border-t-2 border-primary bg-primary/5"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {tab.icon}
            <span className="mt-1">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

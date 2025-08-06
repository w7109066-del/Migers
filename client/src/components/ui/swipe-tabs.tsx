import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  const handleTabClick = useCallback((index: number) => {
    setActiveTab(index);
    onTabChange?.(index);
  }, [onTabChange]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
    setStartTime(Date.now());
    setTranslateX(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;

    e.preventDefault(); // Prevent scrolling

    const currentX = e.touches[0].clientX;
    const diff = startX - currentX;

    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Use requestAnimationFrame for smoother updates
    animationFrameRef.current = requestAnimationFrame(() => {
      setTranslateX(-diff);
    });
  }, [isDragging, startX]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;

    const endTime = Date.now();
    const duration = endTime - startTime;
    const threshold = 50;
    const velocity = Math.abs(translateX) / duration; // pixels per ms

    // Fast swipe or distance threshold
    const shouldSwipe = Math.abs(translateX) > threshold || velocity > 0.3;

    if (shouldSwipe) {
      if (translateX > 0 && activeTab < tabs.length - 1) {
        const newTab = activeTab + 1;
        setActiveTab(newTab);
        onTabChange?.(newTab);
      } else if (translateX < 0 && activeTab > 0) {
        const newTab = activeTab - 1;
        setActiveTab(newTab);
        onTabChange?.(newTab);
      }
    }

    setIsDragging(false);
    setTranslateX(0);
  }, [isDragging, translateX, activeTab, tabs.length, onTabChange, startTime]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Memoize transform style to prevent unnecessary recalculations
  const transformStyle = useMemo(() => ({
    transform: `translateX(${isDragging ? translateX : -activeTab * 100}%)`,
    width: `${tabs.length * 100}%`,
    transition: isDragging ? 'none' : 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)'
  }), [isDragging, translateX, activeTab, tabs.length]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Tab Navigation */}
      <div className="flex bg-white border-b border-gray-200">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(index)}
            className={cn(
              "flex-1 flex flex-col items-center py-3 px-2 text-xs font-medium transition-colors",
              activeTab === index
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {tab.icon}
            <span className="mt-1">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden relative touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'pan-y' }}
      >
        <div 
          className="flex h-full will-change-transform"
          style={transformStyle}
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
    </div>
  );
}
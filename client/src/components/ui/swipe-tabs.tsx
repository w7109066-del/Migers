import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

interface SwipeTabsProps {
  tabs: Tab[];
  className?: string;
  onTabChange?: (tabIndex: number) => void;
}

export function SwipeTabs({ tabs, className, onTabChange }: SwipeTabsProps) {
  const [activeTab, setActiveTab] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  const switchTab = (tabIndex: number) => {
    if (tabIndex < 0 || tabIndex >= tabs.length) return;
    
    setActiveTab(tabIndex);
    onTabChange?.(tabIndex);
    
    if (containerRef.current) {
      const tabWidth = containerRef.current.clientWidth;
      containerRef.current.scrollLeft = tabIndex * tabWidth;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    
    startXRef.current = e.touches[0].pageX;
    scrollLeftRef.current = containerRef.current.scrollLeft;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    
    const endX = e.changedTouches[0].pageX;
    const diff = startXRef.current - endX;
    const threshold = 50;
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0 && activeTab < tabs.length - 1) {
        // Swipe left - next tab
        switchTab(activeTab + 1);
      } else if (diff < 0 && activeTab > 0) {
        // Swipe right - previous tab
        switchTab(activeTab - 1);
      }
    }
  };

  // Handle wheel scrolling for desktop
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaX > 50 && activeTab < tabs.length - 1) {
      switchTab(activeTab + 1);
    } else if (e.deltaX < -50 && activeTab > 0) {
      switchTab(activeTab - 1);
    }
  };

  useEffect(() => {
    // Auto-scroll to active tab on mount
    switchTab(0);
  }, []);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Tab Content */}
      <div className="flex-1 relative overflow-hidden pb-16"></div>
        <div
          ref={containerRef}
          className="flex h-full overflow-x-hidden"
          style={{
            scrollSnapType: "x mandatory",
            scrollBehavior: "smooth",
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
        >
          {tabs.map((tab, index) => (
            <div
              key={tab.id}
              className="w-full h-full flex-shrink-0"
              style={{ scrollSnapAlign: "start" }}
            >
              {tab.content}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <div className="bg-white border-t border-gray-200 px-4 py-2 flex-shrink-0 safe-area-inset-bottom fixed bottom-0 left-0 right-0 z-50"></div>
        <div className="flex items-center justify-around relative">
          {/* Tab Indicator */}
          <div
            className="absolute top-0 left-0 h-1 bg-primary rounded-full transition-transform duration-300"
            style={{
              width: `${100 / tabs.length}%`,
              transform: `translateX(${activeTab * 100}%)`,
            }}
          />
          
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              onClick={() => switchTab(index)}
              className={cn(
                "flex flex-col items-center py-2 px-3 transition-colors",
                activeTab === index
                  ? "text-primary"
                  : "text-gray-400 hover:text-gray-600"
              )}
            >
              {tab.icon}
              <span className="text-xs mt-1 font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

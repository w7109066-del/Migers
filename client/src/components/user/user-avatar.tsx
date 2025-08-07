import { cn } from "@/lib/utils";

interface UserAvatarProps {
  username: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  isOnline?: boolean;
  onClick?: () => void;
  className?: string;
  profilePhotoUrl?: string;
  fancyFrame?: boolean;
}

const sizeClasses = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-xs",
  md: "w-12 h-12 text-sm",
  lg: "w-16 h-16 text-lg",
  xl: "w-20 h-20 text-xl",
};

const indicatorSizes = {
  xs: "w-2 h-2",
  sm: "w-3 h-3",
  md: "w-4 h-4",
  lg: "w-5 h-5",
  xl: "w-6 h-6",
};

const frameStyles = {
  xs: "p-1",
  sm: "p-1.5",
  md: "p-2",
  lg: "p-3",
  xl: "p-4",
};

export function UserAvatar({ 
  username, 
  size = "md", 
  isOnline, 
  onClick, 
  className,
  profilePhotoUrl,
  fancyFrame = false
}: UserAvatarProps) {
  const initials = username
    .split(/[\s_]+/)
    .map(word => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Generate consistent colors based on username
  const colorVariants = [
    "from-purple-400 to-pink-400",
    "from-blue-400 to-indigo-400",
    "from-green-400 to-teal-400",
    "from-yellow-400 to-orange-400",
    "from-red-400 to-rose-400",
    "from-indigo-400 to-purple-400",
    "from-teal-400 to-cyan-400",
    "from-orange-400 to-red-400",
  ];

  const colorIndex = username.charCodeAt(0) % colorVariants.length;
  const gradientColor = colorVariants[colorIndex];

  if (fancyFrame) {
    return (
      <div className="relative">
        {/* Outer Decorative Frame */}
        <div 
          className={cn(
            "relative rounded-full",
            sizeClasses[size],
            frameStyles[size]
          )}
          style={{
            background: `
              conic-gradient(from 0deg, 
                #ffd700 0deg, #ff6b35 60deg, #f7931e 120deg, 
                #ffd700 180deg, #9b59b6 240deg, #3498db 300deg, #ffd700 360deg),
              radial-gradient(ellipse at center, 
                rgba(255, 215, 0, 0.3) 0%, 
                rgba(255, 215, 0, 0.1) 70%, 
                transparent 100%)
            `,
            boxShadow: `
              inset 0 0 20px rgba(255, 215, 0, 0.5),
              0 0 25px rgba(255, 215, 0, 0.3),
              0 8px 32px rgba(0, 0, 0, 0.3)
            `,
            filter: 'drop-shadow(0 4px 8px rgba(255, 215, 0, 0.4))'
          }}
        >
          {/* Inner Frame with Gems */}
          <div 
            className="relative w-full h-full rounded-full"
            style={{
              background: `
                linear-gradient(45deg, 
                  #8b4513 0%, #daa520 25%, #ffd700 50%, #daa520 75%, #8b4513 100%),
                radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8) 2%, transparent 4%),
                radial-gradient(circle at 70% 20%, rgba(138, 43, 226, 0.8) 2%, transparent 4%),
                radial-gradient(circle at 20% 80%, rgba(0, 191, 255, 0.8) 2%, transparent 4%),
                radial-gradient(circle at 80% 70%, rgba(255, 20, 147, 0.8) 2%, transparent 4%)
              `,
              border: '2px solid #ffd700',
              boxShadow: 'inset 0 2px 4px rgba(255, 215, 0, 0.6)'
            }}
          >
            {/* Decorative Elements */}
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{
                  background: 'linear-gradient(45deg, #ff1493, #9400d3)',
                  boxShadow: '0 0 8px rgba(255, 20, 147, 0.8)'
                }}
              />
            </div>
            <div className="absolute -top-1 -left-2">
              <div 
                className="w-2 h-2 rounded-full"
                style={{
                  background: 'linear-gradient(45deg, #00bfff, #1e90ff)',
                  boxShadow: '0 0 6px rgba(0, 191, 255, 0.8)'
                }}
              />
            </div>
            <div className="absolute -top-1 -right-2">
              <div 
                className="w-2 h-2 rounded-full"
                style={{
                  background: 'linear-gradient(45deg, #ffd700, #ffaa00)',
                  boxShadow: '0 0 6px rgba(255, 215, 0, 0.8)'
                }}
              />
            </div>
            <div className="absolute -bottom-2 left-1/4">
              <div 
                className="w-2 h-2 rounded-full"
                style={{
                  background: 'linear-gradient(45deg, #00ff7f, #32cd32)',
                  boxShadow: '0 0 6px rgba(0, 255, 127, 0.8)'
                }}
              />
            </div>
            <div className="absolute -bottom-2 right-1/4">
              <div 
                className="w-2 h-2 rounded-full"
                style={{
                  background: 'linear-gradient(45deg, #ff4500, #ff6347)',
                  boxShadow: '0 0 6px rgba(255, 69, 0, 0.8)'
                }}
              />
            </div>

            {/* Crown Elements */}
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <div 
                className="w-4 h-2"
                style={{
                  background: 'linear-gradient(to top, #ffd700, #ffaa00)',
                  clipPath: 'polygon(20% 100%, 0% 0%, 50% 50%, 100% 0%, 80% 100%)',
                  filter: 'drop-shadow(0 1px 2px rgba(255, 215, 0, 0.8))'
                }}
              />
            </div>

            {/* Avatar Content */}
            <div className="w-full h-full rounded-full overflow-hidden" style={{ margin: '4px' }}>
              <div
                className={cn(
                  "w-full h-full rounded-full flex items-center justify-center text-white font-semibold overflow-hidden",
                  !profilePhotoUrl && `bg-gradient-to-br ${gradientColor}`,
                  onClick && "cursor-pointer hover:scale-105 transition-transform"
                )}
                onClick={onClick}
              >
                {profilePhotoUrl ? (
                  <img 
                    src={profilePhotoUrl} 
                    alt={username} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {isOnline !== undefined && (
          <div
            className={cn(
              "absolute -bottom-1 -right-1 rounded-full border-2 border-white z-20",
              indicatorSizes[size],
              isOnline ? "bg-accent" : "bg-gray-400"
            )}
          />
        )}
      </div>
    );
  }

  // Regular avatar (existing code)
  return (
    <div className="relative">
      {/* Decorative Frame */}
      <div 
        className={cn(
          "absolute inset-0 rounded-full",
          sizeClasses[size],
          "bg-contain bg-center bg-no-repeat pointer-events-none z-10"
        )}
        style={{
          backgroundImage: `url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')`,
          mixBlendMode: 'multiply'
        }}
      />

      {/* Avatar Frame Background */}
      <div 
        className={cn(
          "absolute inset-0 rounded-full z-0",
          sizeClasses[size]
        )}
        style={{
          background: `
            radial-gradient(circle at 25% 25%, #ff6b6b, transparent 50%),
            radial-gradient(circle at 75% 25%, #4ecdc4, transparent 50%),
            radial-gradient(circle at 25% 75%, #45b7d1, transparent 50%),
            radial-gradient(circle at 75% 75%, #96ceb4, transparent 50%),
            linear-gradient(45deg, #ffd93d, #ff6b6b, #4ecdc4, #45b7d1)
          `,
          padding: '3px'
        }}
      />

      {/* Main Avatar */}
      <div className="relative z-5">
        <div
          className={cn(
            "rounded-full flex items-center justify-center text-white font-semibold overflow-hidden relative",
            sizeClasses[size],
            !profilePhotoUrl && `bg-gradient-to-br ${gradientColor}`,
            onClick && "cursor-pointer hover:scale-105 transition-transform",
            className
          )}
          style={{ margin: '3px' }}
          onClick={onClick}
        >
          {profilePhotoUrl ? (
            <img 
              src={profilePhotoUrl} 
              alt={username} 
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>
      </div>

      {isOnline !== undefined && (
        <div
          className={cn(
            "absolute -bottom-1 -right-1 rounded-full border-2 border-white z-20",
            indicatorSizes[size],
            isOnline ? "bg-accent" : "bg-gray-400"
          )}
        />
      )}
    </div>
  );
}
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  username: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  isOnline?: boolean;
  onClick?: () => void;
  className?: string;
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

export function UserAvatar({ 
  username, 
  size = "md", 
  isOnline, 
  onClick, 
  className 
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

  return (
    <div className="relative">
      <div
        className={cn(
          "bg-gradient-to-br rounded-full flex items-center justify-center text-white font-semibold",
          sizeClasses[size],
          gradientColor,
          onClick && "cursor-pointer hover:scale-105 transition-transform",
          className
        )}
        onClick={onClick}
      >
        <span>{initials}</span>
      </div>
      
      {isOnline !== undefined && (
        <div
          className={cn(
            "absolute -bottom-1 -right-1 rounded-full border-2 border-white",
            indicatorSizes[size],
            isOnline ? "bg-accent" : "bg-gray-400"
          )}
        />
      )}
    </div>
  );
}

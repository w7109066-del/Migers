import { cn } from "@/lib/utils";

interface UserStatusProps {
  isOnline: boolean;
  className?: string;
}

export function UserStatus({ isOnline, className }: UserStatusProps) {
  return (
    <div className={cn("text-xs font-medium", className)}>
      {isOnline ? (
        <span className="text-accent">Online</span>
      ) : (
        <span className="text-gray-400">Offline</span>
      )}
    </div>
  );
}

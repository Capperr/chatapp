import { getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  color?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showOnline?: boolean;
}

const sizes = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-xl",
};

export function Avatar({
  name,
  color = "#8b5cf6",
  size = "md",
  className,
  showOnline = false,
}: AvatarProps) {
  const initials = getInitials(name);

  return (
    <div className={cn("relative flex-shrink-0", className)}>
      <div
        className={cn(
          "rounded-full flex items-center justify-center font-semibold text-white select-none",
          sizes[size]
        )}
        style={{
          backgroundColor: color,
          boxShadow: `0 0 0 2px ${color}30`,
        }}
      >
        {initials}
      </div>
      {showOnline && (
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[rgb(var(--bg-secondary))]" />
      )}
    </div>
  );
}

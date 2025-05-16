import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  progressClassName?: string;
}

const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ className, value = 0, max = 100, progressClassName, ...props }, ref) => {
    const percentage = Math.min(Math.max(0, value), max) / max * 100;

    return (
      <div
        ref={ref}
        className={cn("relative w-full overflow-hidden rounded-full bg-gray-200", className)}
        {...props}
      >
        <div
          className={cn("h-full w-full flex-1 bg-primary transition-all", progressClassName)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  }
);

ProgressBar.displayName = "ProgressBar";

export { ProgressBar }; 
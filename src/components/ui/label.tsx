// src/components/ui/label.tsx
"use client"; // If it ever uses client-side logic, otherwise not strictly needed for this simple version

import * as React from "react";
import { cn } from "@/lib/utils"; // Assuming you have this utility

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 block mb-1", // Added block and mb-1 for basic styling
        className
      )}
      {...props}
    />
  )
);
Label.displayName = "Label";

export { Label };
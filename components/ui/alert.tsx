import React from "react";
import { cn } from "@/lib/utils";

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Alert({ className, children, ...props }: AlertProps) {
  return (
    <div
      className={cn(
        "p-4 rounded-lg border",
        className
      )}
      role="alert"
      {...props}
    >
      {children}
    </div>
  );
} 
import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = "Loading data..." }: LoadingStateProps) {
  return (
    <div className="w-full py-16 flex flex-col items-center justify-center space-y-3 app-text-secondary">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--color-rose)]" />
      <p className="text-xs font-medium app-text-muted animate-pulse">{message}</p>
    </div>
  );
}

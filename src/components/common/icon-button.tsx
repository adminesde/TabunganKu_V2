"use client";

import * as React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface IconButtonProps extends ButtonProps {
  icon: React.ElementType;
  tooltip: string;
}

export function IconButton({ icon: Icon, tooltip, ...props }: IconButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" {...props}>
            <Icon className="h-4 w-4" />
            <span className="sr-only">{tooltip}</span> {/* For accessibility */}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
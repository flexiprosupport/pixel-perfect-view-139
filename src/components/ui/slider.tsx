import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  trackClassName?: string;
  rangeClassName?: string;
  thumbClassName?: string;
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, trackClassName, rangeClassName, thumbClassName, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center cursor-pointer",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track 
      className={cn(
        "relative h-3 w-full grow overflow-hidden rounded-full bg-muted/50 border border-border/50",
        trackClassName
      )}
    >
      <SliderPrimitive.Range 
        className={cn(
          "absolute h-full bg-gradient-to-r from-foreground/80 to-foreground transition-all duration-150",
          rangeClassName
        )} 
      />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb 
      className={cn(
        "block h-6 w-6 rounded-full border-3 border-foreground bg-background shadow-lg shadow-foreground/20 ring-offset-background transition-all duration-150 hover:scale-110 hover:shadow-xl hover:shadow-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 active:scale-95 disabled:pointer-events-none disabled:opacity-50",
        thumbClassName
      )} 
    />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };

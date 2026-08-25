import { cn } from "@/lib/utils";
import { PLATFORM_CONFIG } from "@/lib/engagement-types";
import { Instagram, Music, Youtube, Twitter, Facebook } from "lucide-react";

interface PlatformSelectorProps {
  selected: string;
  onSelect: (platform: string) => void;
  availablePlatforms?: string[]; // Only show platforms with active bundles
}

const iconMap = {
  Instagram,
  Music,
  Youtube,
  Twitter,
  Facebook,
};

export function PlatformSelector({ selected, onSelect, availablePlatforms }: PlatformSelectorProps) {
  // Filter platforms based on availablePlatforms prop
  const platformsToShow = availablePlatforms
    ? Object.entries(PLATFORM_CONFIG).filter(([key]) => availablePlatforms.includes(key))
    : Object.entries(PLATFORM_CONFIG);

  if (platformsToShow.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No platforms configured. Contact admin to set up engagement bundles.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {platformsToShow.map(([key, config]) => {
        const Icon = iconMap[config.icon as keyof typeof iconMap];
        const isSelected = selected === key;

        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={cn(
              "group relative flex items-center gap-1.5 h-8 pl-1 pr-2.5 rounded-full font-bold text-[10px] uppercase tracking-[0.12em] transition-all duration-200",
              isSelected
                ? `bg-gradient-to-r ${config.color} text-white shadow-md shadow-black/20 ring-1 ring-white/30 -rotate-1`
                : "bg-secondary/60 text-muted-foreground border border-border/60 hover:text-foreground hover:border-border"
            )}
          >
            <span
              className={cn(
                "flex items-center justify-center h-6 w-6 rounded-full shrink-0",
                isSelected
                  ? "bg-white/25 backdrop-blur-sm"
                  : "bg-foreground/5"
              )}
            >
              <Icon className={cn("h-3.5 w-3.5", isSelected ? "text-white" : "text-muted-foreground")} />
            </span>
            <span>{config.label}</span>
            {isSelected && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-white ring-2 ring-background" />
            )}
          </button>
        );
      })}
    </div>
  );
}

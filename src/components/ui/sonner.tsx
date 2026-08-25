import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { Check, X, AlertTriangle, Info, Loader2 } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      expand={false}
      richColors={false}
      closeButton
      duration={3500}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-zinc-950/95 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-white group-[.toaster]:border group-[.toaster]:border-white/[0.08] group-[.toaster]:shadow-[0_4px_24px_rgba(0,0,0,0.5)] group-[.toaster]:rounded-full group-[.toaster]:px-5 group-[.toaster]:py-3 group-[.toaster]:min-w-0 group-[.toaster]:max-w-[420px] group-[.toaster]:gap-3",
          title: "group-[.toast]:text-[13px] group-[.toast]:font-medium group-[.toast]:tracking-tight group-[.toast]:text-white/90",
          description: "group-[.toast]:text-[12px] group-[.toast]:text-zinc-500 group-[.toast]:mt-0.5 group-[.toast]:leading-snug",
          actionButton: "group-[.toast]:bg-white group-[.toast]:text-black group-[.toast]:rounded-full group-[.toast]:font-medium group-[.toast]:text-xs group-[.toast]:px-4 group-[.toast]:py-1.5 group-[.toast]:transition-all group-[.toast]:hover:scale-105",
          cancelButton: "group-[.toast]:bg-zinc-800 group-[.toast]:text-zinc-400 group-[.toast]:rounded-full group-[.toast]:text-xs group-[.toast]:transition-all group-[.toast]:hover:bg-zinc-700",
          closeButton: "group-[.toast]:bg-transparent group-[.toast]:border-0 group-[.toast]:text-zinc-600 group-[.toast]:transition-all hover:group-[.toast]:text-white",
          success: "",
          error: "",
          warning: "",
          info: "",
          loading: "",
        },
      }}
      icons={{
        success: (
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
            <Check className="h-3 w-3 text-white stroke-[3]" />
          </div>
        ),
        error: (
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-white/90 flex items-center justify-center">
            <X className="h-3 w-3 text-zinc-900 stroke-[3]" />
          </div>
        ),
        warning: (
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
            <AlertTriangle className="h-3 w-3 text-white stroke-[3]" />
          </div>
        ),
        info: (
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-zinc-600 flex items-center justify-center">
            <Info className="h-3 w-3 text-white stroke-[3]" />
          </div>
        ),
        loading: (
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center">
            <Loader2 className="h-3 w-3 text-white animate-spin stroke-[3]" />
          </div>
        ),
      }}
      {...props}
    />
  );
};

export { Toaster, toast };

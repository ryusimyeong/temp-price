import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const variants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700 disabled:pointer-events-none disabled:opacity-50", {
  variants: { variant: { default: "bg-emerald-800 text-white hover:bg-emerald-900", outline: "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50", ghost: "text-stone-600 hover:bg-stone-100" }, size: { default: "h-11 px-5", sm: "h-9 px-3", lg: "h-14 px-7" } },
  defaultVariants: { variant: "default", size: "default" },
});
export function Button({ className, variant, size, asChild = false, ...props }: React.ComponentProps<"button"> & VariantProps<typeof variants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(variants({ variant, size, className }))} {...props} />;
}

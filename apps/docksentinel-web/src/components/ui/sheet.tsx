import * as React from "react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type SheetSide = "top" | "right" | "bottom" | "left";

function Sheet(props: React.ComponentProps<typeof Dialog>) {
  return <Dialog {...props} />;
}

function SheetTrigger(props: React.ComponentProps<typeof DialogTrigger>) {
  return <DialogTrigger {...props} />;
}

function SheetClose(props: React.ComponentProps<typeof DialogClose>) {
  return <DialogClose {...props} />;
}

interface SheetContentProps extends React.ComponentProps<typeof DialogContent> {
  side?: SheetSide;
}

const sideClasses: Record<SheetSide, string> = {
  top: "inset-x-4 top-4 max-w-none rounded-[2rem]",
  right: "ml-auto h-[calc(100%-2rem)] max-w-md rounded-[2rem]",
  bottom: "inset-x-4 bottom-4 max-w-none rounded-[2rem]",
  left: "mr-auto h-[calc(100%-2rem)] max-w-md rounded-[2rem]",
};

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ side = "right", className, ...props }, ref) => (
    <DialogContent
      ref={ref}
      className={cn(
        "flex h-full max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden p-0",
        sideClasses[side],
        className,
      )}
      {...props}
    />
  ),
);

SheetContent.displayName = "SheetContent";

function SheetHeader(props: React.ComponentProps<typeof DialogHeader>) {
  return <DialogHeader {...props} />;
}

function SheetTitle(props: React.ComponentProps<typeof DialogTitle>) {
  return <DialogTitle {...props} />;
}

function SheetDescription(props: React.ComponentProps<typeof DialogDescription>) {
  return <DialogDescription {...props} />;
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};

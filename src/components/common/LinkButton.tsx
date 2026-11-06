
"use client";

import Link from "next/link";
import type { LinkProps } from "next/link";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface LinkButtonProps extends Omit<ButtonProps, 'asChild'> {
  href: LinkProps["href"];
  text: string;
  className?: string;
  icon?: LucideIcon;
}

export function LinkButton({ href, text, variant = "outline", className, icon: Icon, ...props }: LinkButtonProps) {
  return (
    <Button asChild variant={variant} className={cn("w-full", className)} {...props}>
      <Link href={href}>
        {Icon && <Icon className="mr-2 h-4 w-4" />}
        {text}
      </Link>
    </Button>
  );
}


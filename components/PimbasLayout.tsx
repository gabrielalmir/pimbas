import type { ComponentProps, ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MatchKind } from "@/lib/domain";
import { cn } from "@/lib/utils";

export function Page({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "mx-auto min-h-[calc(100vh-92px)] w-full max-w-[1440px] px-4 pb-6 pt-[18px] md:px-7 md:pb-[34px] md:pt-7 lg:px-10 lg:pb-10 lg:pt-[34px]",
        className,
      )}
      {...props}
    />
  );
}

export function PageHeader({
  className,
  hero = false,
  dark = false,
  ...props
}: ComponentProps<"header"> & { hero?: boolean; dark?: boolean }) {
  return (
    <header
      className={cn(
        "relative -mx-4 -mt-[18px] mb-[18px] overflow-hidden border-b-4 border-[var(--pmb-gold)] bg-primary px-4 py-6 text-primary-foreground [background-image:linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%),var(--field-rods)] md:-mx-7 md:px-7 md:py-8 lg:-mx-10 lg:px-10",
        hero ? "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center sm:flex" : "block",
        dark && "bg-[var(--pmb-felt-deep)]",
        className,
      )}
      {...props}
    />
  );
}

export function Eyebrow({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "mb-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--pmb-gold)]",
        className,
      )}
      {...props}
    />
  );
}

export function PimbasAvatar({
  initials,
  src,
  alt,
  className,
  size = "default",
}: {
  initials?: ReactNode;
  src?: string;
  alt?: string;
  className?: string;
  size?: "sm" | "default" | "lg" | "xl";
}) {
  return (
    <Avatar
      className={cn(
        "border-[3px] border-[var(--pmb-gold)] bg-[var(--pmb-paper)] text-[var(--pmb-felt)] shadow-[0_6px_0_rgba(9,41,31,0.18)]",
        size === "sm" && "size-[34px] border-0 bg-[var(--pmb-felt)] text-[var(--pmb-paper)]",
        size === "default" && "size-12",
        size === "lg" && "size-[72px]",
        size === "xl" && "size-28 border-4",
        className,
      )}
    >
      {src && <AvatarImage src={src} alt={alt ?? String(initials ?? "Avatar")} />}
      <AvatarFallback className="bg-transparent font-black text-current">{initials}</AvatarFallback>
    </Avatar>
  );
}

export function KindBadge({ kind, children }: { kind: MatchKind; children?: ReactNode }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "w-fit uppercase",
        kind === "friendly"
          ? "bg-[color-mix(in_oklch,var(--pmb-felt),white_84%)] text-[var(--pmb-felt)]"
          : "bg-[color-mix(in_oklch,var(--pmb-clay),white_84%)] text-[var(--pmb-clay)]",
      )}
    >
      {children ?? (kind === "friendly" ? "Amistoso" : "Torneio")}
    </Badge>
  );
}

export function LiveBadge() {
  return (
    <Badge className="w-fit animate-[pmb-pulse_1.6s_infinite] bg-[var(--pmb-clay)] text-[var(--pmb-paper)] uppercase">
      Ao vivo
    </Badge>
  );
}

export function SurfaceCard({
  className,
  contentClassName,
  children,
}: {
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}) {
  return (
    <Card
      className={cn(
        "rounded-lg border-foreground/10 bg-card shadow-[0_14px_0_rgba(23,73,56,0.08),0_18px_34px_rgba(42,33,19,0.08)]",
        className,
      )}
    >
      <CardContent className={cn("p-4", contentClassName)}>{children}</CardContent>
    </Card>
  );
}

export function SectionCard({
  title,
  action,
  className,
  children,
}: {
  title?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card
      className={cn(
        "mt-3.5 rounded-lg border-foreground/10 bg-card shadow-[0_14px_0_rgba(23,73,56,0.08),0_18px_34px_rgba(42,33,19,0.08)]",
        className,
      )}
    >
      {(title || action) && (
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border/70 px-4 pb-3 pt-4">
          {title && (
            <CardTitle className="font-display text-lg uppercase leading-none">{title}</CardTitle>
          )}
          {action}
        </CardHeader>
      )}
      <CardContent className={cn("p-4", title || action ? "pt-4" : undefined)}>
        {children}
      </CardContent>
    </Card>
  );
}

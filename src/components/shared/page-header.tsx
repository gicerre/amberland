import { cn } from "@/lib/utils";

import { SectionDivider } from "./fantasy-card";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

/** Intestazione standard delle pagine: titolo dorato, sottotitolo e azioni. */
export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6 sm:mb-8", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-gold-gradient font-heading text-2xl font-bold tracking-wider sm:text-3xl lg:text-4xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:mt-2 sm:text-base">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      <SectionDivider className="mt-4 sm:mt-5" />
    </div>
  );
}

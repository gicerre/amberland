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
    <div className={cn("mb-8", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-gold-gradient font-heading text-3xl font-bold tracking-wider sm:text-4xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-2xl text-base text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <SectionDivider className="mt-5" />
    </div>
  );
}

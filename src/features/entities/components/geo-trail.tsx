"use client";

import { Globe } from "lucide-react";
import Link from "next/link";

import {
  BreadcrumbTab,
  BreadcrumbSeparator,
} from "@/components/shared/fantasy-breadcrumb";
import { cn } from "@/lib/utils";
import type { Entity } from "@/types/entities";

import { ENTITY_REGISTRY } from "../registry";

export function GeoTrail({
  chain,
  current,
}: {
  chain: Entity[];
  current: Entity;
}) {
  const steps = [...chain, current];

  return (
    <nav
      aria-label="Posizione nel mondo"
      className="flex flex-wrap items-center gap-y-1"
    >
      {/* Step "Mondo" — solo icona globo */}
      <span className="inline-flex items-center">
        <BreadcrumbTab isCurrent={false} py="py-2" className="text-gold/55 hover:text-gold/90">
          <Link href="/mondo" title="Atlante" className="transition-colors">
            <Globe className="size-3.5" />
          </Link>
        </BreadcrumbTab>
        <BreadcrumbSeparator />
      </span>

      {/* Step geografici — icona entità + tipo + nome */}
      {steps.map((step, index) => {
        const config = ENTITY_REGISTRY[step.type];
        const Icon = config.icon;
        const isCurrent = index === steps.length - 1;

        const content = (
          <span className="flex items-center gap-2">
            <Icon
              className="size-3.5 shrink-0"
              style={{ color: config.accent }}
            />
            <span className="flex flex-col leading-tight">
              <span
                className="text-[8px] font-bold tracking-[0.18em] uppercase"
                style={{ color: config.accent }}
              >
                {config.label}
              </span>
              <span
                className={cn(
                  "max-w-[5rem] truncate text-[0.65rem] font-semibold sm:max-w-[9rem] sm:text-xs",
                  isCurrent ? "text-gold" : "text-foreground/70"
                )}
              >
                {step.name}
              </span>
            </span>
          </span>
        );

        return (
          <span key={step.id} className="inline-flex items-center">
            <BreadcrumbTab isCurrent={isCurrent} py="py-2">
              {isCurrent ? (
                content
              ) : (
                <Link
                  href={`/entita/${step.id}`}
                  className="transition-colors hover:opacity-90"
                >
                  {content}
                </Link>
              )}
            </BreadcrumbTab>
            {!isCurrent && <BreadcrumbSeparator />}
          </span>
        );
      })}
    </nav>
  );
}

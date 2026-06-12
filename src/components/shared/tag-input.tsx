"use client";

import { X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Campo tag semplice ed efficace (desktop + mobile):
 * - Invio conferma ciò che hai scritto (anche più tag se separati da virgola).
 * - Incollare una stringa con virgole crea automaticamente i tag.
 * - Backspace a campo vuoto rimuove l'ultimo tag; X per rimuoverne uno.
 */
export function TagInput({
  value,
  onChange,
  placeholder = "Scrivi e premi Invio (virgola = più tag)…",
  className,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState("");

  /** Aggiunge uno o più tag da una stringa (separati da virgola), senza duplicati. */
  const commit = (raw: string) => {
    const incoming = raw
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (incoming.length === 0) {
      setDraft("");
      return;
    }
    const next = [...value];
    for (const tag of incoming) {
      if (!next.includes(tag)) next.push(tag);
    }
    onChange(next);
    setDraft("");
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(draft);
          } else if (
            event.key === "Backspace" &&
            draft === "" &&
            value.length > 0
          ) {
            onChange(value.slice(0, -1));
          }
        }}
        onPaste={(event) => {
          const text = event.clipboardData.getData("text");
          // Solo se contiene virgole: creiamo i tag al volo (incolla rapido).
          if (text.includes(",")) {
            event.preventDefault();
            commit(draft + text);
          }
        }}
        placeholder={placeholder}
        aria-label="Aggiungi tag"
      />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="gap-1 border-gold/30 bg-gold/5 text-foreground/80"
            >
              {tag}
              <button
                type="button"
                aria-label={`Rimuovi tag ${tag}`}
                onClick={() => onChange(value.filter((item) => item !== tag))}
                className="text-muted-foreground transition-colors hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

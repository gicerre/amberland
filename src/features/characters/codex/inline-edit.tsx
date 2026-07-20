"use client";

import { Check, Minus, Pencil, Plus } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

/* ============================================================
 * Inline editing — le primitive del Codex.
 *
 * Ogni valore della scheda è un bersaglio: click → modifica sul
 * posto, Invio/blur salva, Esc annulla, spunta di conferma.
 * Il salvataggio è ottimistico (CodexProvider): la conferma
 * visiva è immediata, l'errore fa rollback con toast.
 * ============================================================ */

/** Flash di conferma dopo un commit (spunta che svanisce). */
function useCommitFlash(): [boolean, () => void] {
  const [flash, setFlash] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const trigger = () => {
    setFlash(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlash(false), 1100);
  };
  return [flash, trigger];
}

function CommitCheck({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <Check
      aria-hidden
      className="pointer-events-none absolute -top-1 -right-1 size-3.5 animate-[scale-in_180ms_var(--ease-out)_both] text-emerald-bright drop-shadow-[0_0_6px_rgba(108,201,160,0.6)]"
    />
  );
}

/* ──────────────────────────────────────────────────────────
 * InlineText — testo breve modificabile sul posto.
 * ────────────────────────────────────────────────────────── */

export function InlineText({
  value,
  onCommit,
  disabled,
  placeholder = "—",
  className,
  inputClassName,
  align = "left",
  ariaLabel,
}: {
  value: string;
  onCommit: (next: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  align?: "left" | "center";
  ariaLabel: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [flash, triggerFlash] = useCommitFlash();
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    if (disabled) return;
    setDraft(value);
    setEditing(true);
  };

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next !== value) {
      onCommit(next);
      triggerFlash();
    }
  };

  const handleKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") commit();
    if (event.key === "Escape") {
      setDraft(value);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={handleKey}
        aria-label={ariaLabel}
        className={cn(
          "field-engraved w-full min-w-0 rounded-md px-1.5 py-0.5 text-inherit outline-none",
          align === "center" && "text-center",
          className,
          inputClassName
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      disabled={disabled}
      aria-label={disabled ? undefined : `Modifica: ${ariaLabel}`}
      className={cn(
        "group/inline relative max-w-full rounded-md text-left transition-colors",
        align === "center" && "text-center",
        !disabled &&
          "cursor-text decoration-gold/40 underline-offset-4 hover:bg-gold/8 hover:text-gold-bright focus-visible:bg-gold/8",
        !value && "text-muted-foreground/70 italic",
        className
      )}
    >
      {value || placeholder}
      {!disabled && (
        <Pencil
          aria-hidden
          className="ml-1 inline size-3 align-baseline text-gold/0 transition-colors group-hover/inline:text-gold/60"
        />
      )}
      <CommitCheck show={flash} />
    </button>
  );
}

/* ──────────────────────────────────────────────────────────
 * InlineNumber — numero modificabile: click, frecce, stepper.
 * ────────────────────────────────────────────────────────── */

export function InlineNumber({
  value,
  onCommit,
  disabled,
  min,
  max,
  format,
  className,
  ariaLabel,
}: {
  value: number;
  onCommit: (next: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  /** Formattazione del valore in lettura (es. modificatore +3). */
  format?: (value: number) => string;
  className?: string;
  ariaLabel: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [flash, triggerFlash] = useCommitFlash();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const clamp = (raw: number) => {
    let next = Number.isFinite(raw) ? raw : value;
    if (typeof min === "number") next = Math.max(min, next);
    if (typeof max === "number") next = Math.min(max, next);
    return next;
  };

  const commitValue = (raw: number) => {
    const next = clamp(raw);
    if (next !== value) {
      onCommit(next);
      triggerFlash();
    }
  };

  const commitDraft = () => {
    setEditing(false);
    commitValue(Number(draft));
  };

  const handleKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") commitDraft();
    if (event.key === "Escape") setEditing(false);
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setDraft((current) => String(clamp(Number(current) + 1)));
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setDraft((current) => String(clamp(Number(current) - 1)));
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        inputMode="numeric"
        value={draft}
        min={min}
        max={max}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commitDraft}
        onKeyDown={handleKey}
        aria-label={ariaLabel}
        className={cn(
          "field-engraved w-full min-w-0 rounded-md px-1 py-0.5 text-center tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          className
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (disabled) return;
        setDraft(String(value));
        setEditing(true);
      }}
      disabled={disabled}
      aria-label={disabled ? undefined : `Modifica: ${ariaLabel}`}
      className={cn(
        "relative rounded-md tabular-nums transition-colors",
        !disabled &&
          "cursor-text hover:bg-gold/8 hover:text-gold-bright focus-visible:bg-gold/8",
        className
      )}
    >
      {format ? format(value) : value}
      <CommitCheck show={flash} />
    </button>
  );
}

/* ──────────────────────────────────────────────────────────
 * Stepper — coppia −/+ per valori a incremento (HP, slot, usi).
 * ────────────────────────────────────────────────────────── */

export function Stepper({
  onDecrement,
  onIncrement,
  decrementLabel,
  incrementLabel,
  disabled,
  className,
  children,
}: {
  onDecrement: () => void;
  onIncrement: () => void;
  decrementLabel: string;
  incrementLabel: string;
  disabled?: boolean;
  className?: string;
  /** Contenuto centrale (il valore, spesso un InlineNumber). */
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-hairline bg-surface-0 p-0.5",
        className
      )}
    >
      <button
        type="button"
        onClick={onDecrement}
        disabled={disabled}
        aria-label={decrementLabel}
        className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-crimson/15 hover:text-crimson-light focus-visible:bg-crimson/15 disabled:pointer-events-none disabled:opacity-40"
      >
        <Minus className="size-3.5" />
      </button>
      <div className="min-w-0 px-1">{children}</div>
      <button
        type="button"
        onClick={onIncrement}
        disabled={disabled}
        aria-label={incrementLabel}
        className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-emerald-deep hover:text-emerald-bright focus-visible:bg-emerald-deep disabled:pointer-events-none disabled:opacity-40"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 * InlineTextarea — testo lungo (tratti, ideali, storia breve).
 * ────────────────────────────────────────────────────────── */

export function InlineTextarea({
  value,
  onCommit,
  disabled,
  placeholder = "Scrivi qui…",
  emptyHint = "Nessun contenuto. Clicca per scrivere.",
  className,
  ariaLabel,
  rows = 4,
}: {
  value: string;
  onCommit: (next: string) => void;
  disabled?: boolean;
  placeholder?: string;
  emptyHint?: string;
  className?: string;
  ariaLabel: string;
  rows?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [flash, triggerFlash] = useCommitFlash();
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) areaRef.current?.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next !== value.trim()) {
      onCommit(next);
      triggerFlash();
    }
  };

  if (editing) {
    return (
      <textarea
        ref={areaRef}
        value={draft}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
          // Ctrl/Cmd+Invio conferma (Invio da solo va a capo).
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) commit();
        }}
        aria-label={ariaLabel}
        className={cn(
          "field-engraved w-full resize-y rounded-lg px-3 py-2 text-[15px] leading-relaxed outline-none",
          className
        )}
      />
    );
  }

  if (!value && disabled) return null;

  return (
    <button
      type="button"
      onClick={() => {
        if (disabled) return;
        setDraft(value);
        setEditing(true);
      }}
      disabled={disabled}
      aria-label={disabled ? undefined : `Modifica: ${ariaLabel}`}
      className={cn(
        "group/inline relative block w-full rounded-lg text-left transition-colors",
        !disabled && "cursor-text hover:bg-gold/5 focus-visible:bg-gold/5",
        className
      )}
    >
      {value ? (
        <p className="text-[15px] leading-relaxed whitespace-pre-line text-foreground/90">
          {value}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground/70 italic">{emptyHint}</p>
      )}
      {!disabled && (
        <Pencil
          aria-hidden
          className="absolute top-1 right-1 size-3.5 text-gold/0 transition-colors group-hover/inline:text-gold/50"
        />
      )}
      <CommitCheck show={flash} />
    </button>
  );
}

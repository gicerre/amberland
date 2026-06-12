"use client";

import { GripVertical, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { ImageUpload } from "@/components/shared/image-upload";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ImageFolder } from "@/lib/upload/image-service";

/**
 * Galleria immagini del form entità: aggiunta tramite ImageUpload,
 * riordino con drag & drop nativo, rimozione singola.
 */
export function GalleryManager({
  value,
  onChange,
  folder,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  folder: ImageFolder;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const moveImage = (from: number, to: number) => {
    if (from === to) return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {value.map((url, index) => (
            <li
              key={`${url}-${index}`}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => {
                event.preventDefault();
                setOverIndex(index);
              }}
              onDragLeave={() => setOverIndex(null)}
              onDrop={(event) => {
                event.preventDefault();
                if (dragIndex !== null) moveImage(dragIndex, index);
                setDragIndex(null);
                setOverIndex(null);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              className={cn(
                "group relative aspect-video cursor-grab overflow-hidden rounded-lg border border-gold/20 active:cursor-grabbing",
                overIndex === index && dragIndex !== index && "border-gold ring-2 ring-gold/40",
                dragIndex === index && "opacity-50"
              )}
            >
              <Image
                src={url}
                alt={`Immagine ${index + 1}`}
                fill
                sizes="200px"
                className="pointer-events-none object-cover"
              />
              <span className="absolute top-1.5 left-1.5 rounded bg-background/80 p-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <GripVertical className="size-3.5 text-gold" />
              </span>
              <Button
                type="button"
                variant="destructive"
                size="icon-xs"
                aria-label="Rimuovi immagine"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                className="absolute top-1.5 right-1.5 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <ImageUpload
        value=""
        onChange={(url) => {
          if (url) onChange([...value, url]);
        }}
        folder={folder}
      />
      <p className="text-xs text-muted-foreground">
        Trascina le immagini per riordinarle. La prima viene usata come copertina
        alternativa nella galleria.
      </p>
    </div>
  );
}

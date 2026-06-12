"use client";

import { ImagePlus, Link2, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { FantasyImage } from "@/components/shared/fantasy-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MAX_IMAGE_SIZE_BYTES,
  isLikelyImageUrl,
  isUploadConfigured,
  uploadImage,
  type ImageFolder,
} from "@/lib/upload/image-service";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  folder: ImageFolder;
  className?: string;
}

/**
 * Campo immagine per i form del Master.
 * - Se Cloudinary è configurato: carica il file e restituisce l'URL.
 * - In ogni caso: permette di incollare l'URL di un'immagine già online
 *   (fallback gratuito senza alcun servizio di storage).
 */
export function ImageUpload({
  value,
  onChange,
  folder,
  className,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Seleziona un file immagine");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error("Immagine troppo grande", { description: "Massimo 10 MB" });
      return;
    }
    setUploading(true);
    try {
      const url = await uploadImage(folder, file);
      onChange(url);
      toast.success("Immagine caricata");
    } catch (error) {
      toast.error("Caricamento non riuscito", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const applyUrl = () => {
    const trimmed = urlDraft.trim();
    if (!isLikelyImageUrl(trimmed)) {
      toast.error("URL non valido", {
        description: "Incolla un link che inizia con http(s)://",
      });
      return;
    }
    onChange(trimmed);
    setUrlDraft("");
    toast.success("Immagine collegata");
  };

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      {value ? (
        <div className="group relative overflow-hidden rounded-lg border border-gold/25">
          <FantasyImage src={value} alt="Anteprima" className="aspect-video" />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
            {isUploadConfigured && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
              >
                <RefreshCw className="size-3.5" />
                Sostituisci
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={uploading}
              onClick={() => onChange("")}
            >
              <Trash2 className="size-3.5" />
              Rimuovi
            </Button>
          </div>
        </div>
      ) : (
        <>
          {isUploadConfigured && (
            <>
              <button
                type="button"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gold/30 bg-night/30 text-muted-foreground transition-colors hover:border-gold/60 hover:text-gold disabled:opacity-60"
              >
                {uploading ? (
                  <>
                    <Loader2 className="size-6 animate-spin text-gold" />
                    <span className="text-sm">Caricamento in corso…</span>
                  </>
                ) : (
                  <>
                    <ImagePlus className="size-6" />
                    <span className="text-sm">Carica un&apos;immagine</span>
                    <span className="text-xs opacity-70">
                      PNG, JPG o WebP — max 10 MB
                    </span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-gold/15" />
                oppure
                <span className="h-px flex-1 bg-gold/15" />
              </div>
            </>
          )}

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gold/60" />
              <Input
                value={urlDraft}
                onChange={(event) => setUrlDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyUrl();
                  }
                }}
                placeholder="Incolla l'URL di un'immagine…"
                className="pl-9"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={applyUrl}
              disabled={!urlDraft.trim()}
            >
              Usa
            </Button>
          </div>

          {!isUploadConfigured && (
            <p className="text-xs text-muted-foreground/80">
              Suggerimento: configura Cloudinary in <code>.env.local</code> per
              caricare i file direttamente. Vedi README.
            </p>
          )}
        </>
      )}
    </div>
  );
}

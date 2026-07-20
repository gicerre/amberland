"use client";

import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import Mention from "@tiptap/extension-mention";
import { Placeholder } from "@tiptap/extension-placeholder";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import {
  EditorContent,
  useEditor,
  type Editor,
  type JSONContent,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { SuggestionOptions } from "@tiptap/suggestion";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useAllEntities } from "@/features/entities/data";
import { uploadImage } from "@/lib/upload/image-service";
import { cn } from "@/lib/utils";
import type { Entity } from "@/types/entities";

import { MentionHoverArea } from "./entity-hover-card";
import {
  buildMentionSuggestion,
  type MentionAttrs,
} from "./mention-suggestion";
import type { RichTextValue } from "./rich-text-utils";

export {
  richTextToPlainText,
  isEmptyRichText,
  type RichTextValue,
} from "./rich-text-utils";

/* ============================================================
 * Editor WYSIWYG (Tiptap) — usato per lore, descrizioni e note.
 * Output in JSON (JSONContent). Retrocompatibile: una stringa legacy
 * viene mostrata/normalizzata come testo semplice.
 * ============================================================ */

function buildExtensions(
  placeholder?: string,
  mentionSuggestion?: Omit<SuggestionOptions<Entity, MentionAttrs>, "editor">
) {
  return [
    StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Image,
    // Sempre presente: anche renderer ed editor senza trigger «@» devono
    // saper leggere le citazioni inline salvate nei contenuti.
    Mention.configure({
      HTMLAttributes: { class: "entity-mention" },
      renderText: ({ node }) =>
        `@${(node.attrs.label as string) ?? node.attrs.id}`,
      ...(mentionSuggestion ? { suggestion: mentionSuggestion } : {}),
    }),
    ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
  ];
}

/* ----------------------------- Editor ----------------------------- */

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  folder = "misc",
  enableMentions = false,
}: {
  value: RichTextValue;
  onChange: (value: JSONContent) => void;
  placeholder?: string;
  className?: string;
  folder?: Parameters<typeof uploadImage>[0];
  /** Attiva le citazioni inline: digitando «@» si cerca tra le entità. */
  enableMentions?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Le estensioni vivono fuori dal ciclo React: il popup delle menzioni
  // legge le entità da una ref sempre aggiornata.
  const { data: entities } = useAllEntities();
  const entitiesRef = useRef<Entity[]>([]);
  entitiesRef.current = entities ?? [];
  const [mentionSuggestion] = useState(() =>
    enableMentions
      ? buildMentionSuggestion(() => entitiesRef.current)
      : undefined
  );

  const editor = useEditor({
    extensions: buildExtensions(placeholder, mentionSuggestion),
    content: (value ?? "") as JSONContent | string,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "rich-text min-h-40 max-w-none px-4 py-3 focus:outline-none",
          className
        ),
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });

  const insertImage = async (file: File | undefined) => {
    if (!file || !editor) return;
    setUploading(true);
    try {
      const url = await uploadImage(folder, file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch (error) {
      toast.error("Caricamento immagine non riuscito", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (!editor) {
    return (
      <div className="rounded-lg border border-hairline-strong bg-night/20 p-4 text-sm text-muted-foreground">
        Caricamento editor…
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-hairline-strong bg-night/20">
      <Toolbar editor={editor} onPickImage={() => fileRef.current?.click()} uploading={uploading} />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void insertImage(event.target.files?.[0])}
      />
      <EditorContent editor={editor} />
    </div>
  );
}

const COLORS = ["#e8dcc0", "#d4af37", "#c43146", "#4f86c6", "#5b9c6a", "#9b59b6"];

function Toolbar({
  editor,
  onPickImage,
  uploading,
}: {
  editor: Editor;
  onPickImage: () => void;
  uploading: boolean;
}) {
  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL del collegamento", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-hairline bg-card/60 p-1.5">
      <Btn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Grassetto">
        <Bold className="size-4" />
      </Btn>
      <Btn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Corsivo">
        <Italic className="size-4" />
      </Btn>
      <Btn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Sottolineato">
        <UnderlineIcon className="size-4" />
      </Btn>
      <Btn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Barrato">
        <Strikethrough className="size-4" />
      </Btn>
      <Divider />
      <Btn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Titolo 1">
        <Heading1 className="size-4" />
      </Btn>
      <Btn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Titolo 2">
        <Heading2 className="size-4" />
      </Btn>
      <Btn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Titolo 3">
        <Heading3 className="size-4" />
      </Btn>
      <Divider />
      <Btn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Elenco puntato">
        <List className="size-4" />
      </Btn>
      <Btn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Elenco numerato">
        <ListOrdered className="size-4" />
      </Btn>
      <Btn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Citazione">
        <Quote className="size-4" />
      </Btn>
      <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Separatore">
        <Minus className="size-4" />
      </Btn>
      <Divider />
      <Btn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Allinea a sinistra">
        <AlignLeft className="size-4" />
      </Btn>
      <Btn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Centra">
        <AlignCenter className="size-4" />
      </Btn>
      <Btn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Allinea a destra">
        <AlignRight className="size-4" />
      </Btn>
      <Divider />
      <Btn active={editor.isActive("link")} onClick={setLink} title="Collegamento">
        <Link2 className="size-4" />
      </Btn>
      <Btn active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()} title="Evidenzia">
        <Highlighter className="size-4" />
      </Btn>
      <label className="relative flex size-8 cursor-pointer items-center justify-center rounded-md hover:bg-accent" title="Colore testo">
        <span
          className="size-4 rounded-full border border-gold/40"
          style={{ background: (editor.getAttributes("textStyle").color as string) || "#e8dcc0" }}
        />
        <input
          type="color"
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
        />
      </label>
      <div className="flex items-center gap-0.5">
        {COLORS.map((color) => (
          <button
            key={color}
            type="button"
            title={`Colore ${color}`}
            onClick={() => editor.chain().focus().setColor(color).run()}
            className="size-4 rounded-full border border-black/20"
            style={{ background: color }}
          />
        ))}
      </div>
      <Divider />
      <Btn onClick={onPickImage} title="Immagine" disabled={uploading}>
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
      </Btn>
      <Divider />
      <Btn onClick={() => editor.chain().focus().undo().run()} title="Annulla">
        <Undo2 className="size-4" />
      </Btn>
      <Btn onClick={() => editor.chain().focus().redo().run()} title="Ripristina">
        <Redo2 className="size-4" />
      </Btn>
    </div>
  );
}

function Btn({
  active,
  onClick,
  title,
  disabled,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn(
        "flex size-8 items-center justify-center rounded-md transition-colors disabled:opacity-50",
        active
          ? "bg-gold/20 text-gold-bright"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-gold/15" />;
}

/* ----------------------------- Renderer ----------------------------- */

export function RichTextRenderer({
  content,
  className,
}: {
  content: RichTextValue;
  className?: string;
}) {
  const editor = useEditor({
    extensions: buildExtensions(),
    content: (content ?? "") as JSONContent | string,
    editable: false,
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && content !== undefined && content !== null) {
      editor.commands.setContent(content as JSONContent | string);
    }
  }, [editor, content]);

  if (!editor) return null;
  return (
    <MentionHoverArea>
      <EditorContent editor={editor} className={cn("rich-text", className)} />
    </MentionHoverArea>
  );
}

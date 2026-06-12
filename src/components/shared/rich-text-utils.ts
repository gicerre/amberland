/* ============================================================
 * Utility per contenuti rich-text — SENZA dipendenze da Tiptap,
 * così possono essere importate ovunque (data layer, ricerca)
 * senza trascinare l'editor nel bundle.
 * ============================================================ */

/** Nodo strutturale di un contenuto rich (compatibile con Tiptap JSON). */
export interface RichNode {
  type?: string;
  text?: string;
  content?: RichNode[];
  [key: string]: unknown;
}

export type RichTextValue = RichNode | string | null | undefined;

/** Estrae il testo semplice (per ricerca e anteprime). */
export function richTextToPlainText(content: RichTextValue): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  const parts: string[] = [];
  const walk = (node: RichNode) => {
    if (typeof node.text === "string") parts.push(node.text);
    node.content?.forEach(walk);
  };
  walk(content);
  return parts.join(" ").trim();
}

export function isEmptyRichText(content: RichTextValue): boolean {
  return richTextToPlainText(content).length === 0;
}

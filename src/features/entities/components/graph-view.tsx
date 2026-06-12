"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { ENTITY_TYPES, type Entity, type EntityType } from "@/types/entities";

import { useAllEntities, useAllRelations } from "../data";
import { ENTITY_REGISTRY } from "../registry";

interface GraphNode {
  id: string;
  entity: Entity;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface GraphEdge {
  a: string;
  b: string;
  hierarchy: boolean;
}

/**
 * Vista rete delle cronache (stile Obsidian): nodi = entità,
 * archi = relazioni + gerarchia geografica. Force layout su canvas,
 * con pan, zoom, trascinamento dei nodi e click per navigare.
 */
export function GraphView() {
  const router = useRouter();
  const { data: entities } = useAllEntities();
  const { data: relations } = useAllRelations();

  const [hiddenTypes, setHiddenTypes] = useState<Set<EntityType>>(new Set());
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { nodes, edges } = useMemo(() => {
    const visible = (entities ?? []).filter(
      (entity) => !hiddenTypes.has(entity.type)
    );
    const ids = new Set(visible.map((entity) => entity.id));

    const edgeList: GraphEdge[] = [];
    for (const entity of visible) {
      if (entity.parentId && ids.has(entity.parentId)) {
        edgeList.push({ a: entity.parentId, b: entity.id, hierarchy: true });
      }
    }
    for (const relation of relations ?? []) {
      if (ids.has(relation.aId) && ids.has(relation.bId)) {
        edgeList.push({ a: relation.aId, b: relation.bId, hierarchy: false });
      }
    }
    return { nodes: visible, edges: edgeList };
  }, [entities, relations, hiddenTypes]);

  // Simulazione + rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    const nodeMap = new Map<string, GraphNode>();
    nodes.forEach((entity, index) => {
      const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2;
      const radius = 60 + (index % 7) * 40;
      nodeMap.set(entity.id, {
        id: entity.id,
        entity,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
      });
    });

    const view = { x: 0, y: 0, scale: 1 };
    let alpha = 1;
    let frame = 0;
    let hoveredId: string | null = null;
    let draggingNode: GraphNode | null = null;
    let panning = false;
    let pointerStart = { x: 0, y: 0 };
    let moved = false;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      view.x = width / 2;
      view.y = height / 2;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const toWorld = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left - view.x) / view.scale,
        y: (clientY - rect.top - view.y) / view.scale,
      };
    };

    const hitTest = (clientX: number, clientY: number): GraphNode | null => {
      const point = toWorld(clientX, clientY);
      for (const node of nodeMap.values()) {
        const dx = node.x - point.x;
        const dy = node.y - point.y;
        if (dx * dx + dy * dy < 14 * 14) return node;
      }
      return null;
    };

    const simulate = () => {
      if (alpha < 0.005) return;
      const list = [...nodeMap.values()];
      // Repulsione tra nodi
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i];
          const b = list[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let distSq = dx * dx + dy * dy;
          if (distSq < 1) {
            dx = (Math.random() - 0.5) * 2;
            dy = (Math.random() - 0.5) * 2;
            distSq = dx * dx + dy * dy;
          }
          const force = (1600 / distSq) * alpha;
          const dist = Math.sqrt(distSq);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }
      // Molle sugli archi
      for (const edge of edges) {
        const a = nodeMap.get(edge.a);
        const b = nodeMap.get(edge.b);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const target = edge.hierarchy ? 90 : 130;
        const force = (dist - target) * 0.02 * alpha;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
      // Attrazione verso il centro + attrito
      for (const node of list) {
        node.vx -= node.x * 0.002 * alpha;
        node.vy -= node.y * 0.002 * alpha;
        if (draggingNode?.id !== node.id) {
          node.x += node.vx;
          node.y += node.vy;
        }
        node.vx *= 0.85;
        node.vy *= 0.85;
      }
      alpha *= 0.995;
    };

    const draw = () => {
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      context.save();
      context.translate(view.x, view.y);
      context.scale(view.scale, view.scale);

      // Archi
      for (const edge of edges) {
        const a = nodeMap.get(edge.a);
        const b = nodeMap.get(edge.b);
        if (!a || !b) continue;
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.strokeStyle = edge.hierarchy
          ? "rgba(212,175,55,0.25)"
          : "rgba(196,49,70,0.35)";
        context.lineWidth = edge.hierarchy ? 1 : 1.4;
        context.setLineDash(edge.hierarchy ? [4, 4] : []);
        context.stroke();
        context.setLineDash([]);
      }

      // Nodi
      for (const node of nodeMap.values()) {
        const accent = ENTITY_REGISTRY[node.entity.type].accent;
        const isHovered = hoveredId === node.id;
        const radius = node.entity.type === "world" ? 12 : 8;

        if (isHovered) {
          context.beginPath();
          context.arc(node.x, node.y, radius + 5, 0, Math.PI * 2);
          context.fillStyle = "rgba(212,175,55,0.18)";
          context.fill();
        }

        context.beginPath();
        context.arc(node.x, node.y, radius, 0, Math.PI * 2);
        context.fillStyle = accent;
        context.fill();
        context.strokeStyle = "rgba(10,12,18,0.9)";
        context.lineWidth = 2;
        context.stroke();

        if (view.scale > 0.55 || isHovered) {
          context.font = `${isHovered ? "600 " : ""}11px var(--font-crimson-pro), Georgia, serif`;
          context.fillStyle = isHovered
            ? "#f0d075"
            : "rgba(232,220,192,0.75)";
          context.textAlign = "center";
          context.fillText(node.entity.name, node.x, node.y + radius + 13);
        }
      }
      context.restore();
    };

    const tick = () => {
      simulate();
      draw();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    // Interazione
    const onPointerDown = (event: PointerEvent) => {
      canvas.setPointerCapture(event.pointerId);
      pointerStart = { x: event.clientX, y: event.clientY };
      moved = false;
      const node = hitTest(event.clientX, event.clientY);
      if (node) {
        draggingNode = node;
      } else {
        panning = true;
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const dx = event.clientX - pointerStart.x;
      const dy = event.clientY - pointerStart.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;

      if (draggingNode) {
        const point = toWorld(event.clientX, event.clientY);
        draggingNode.x = point.x;
        draggingNode.y = point.y;
        draggingNode.vx = 0;
        draggingNode.vy = 0;
        alpha = Math.max(alpha, 0.3);
      } else if (panning) {
        view.x += event.clientX - pointerStart.x;
        view.y += event.clientY - pointerStart.y;
        pointerStart = { x: event.clientX, y: event.clientY };
      } else {
        const node = hitTest(event.clientX, event.clientY);
        hoveredId = node?.id ?? null;
        canvas.style.cursor = node ? "pointer" : "grab";
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      if (draggingNode && !moved) {
        router.push(`/entita/${draggingNode.id}`);
      }
      draggingNode = null;
      panning = false;
      canvas.releasePointerCapture(event.pointerId);
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
      const nextScale = Math.min(2.5, Math.max(0.25, view.scale * factor));
      view.x = mouseX - ((mouseX - view.x) / view.scale) * nextScale;
      view.y = mouseY - ((mouseY - view.y) / view.scale) * nextScale;
      view.scale = nextScale;
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [nodes, edges, router]);

  const toggleType = (type: EntityType) => {
    setHiddenTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const presentTypes = useMemo(() => {
    const set = new Set((entities ?? []).map((entity) => entity.type));
    return ENTITY_TYPES.filter((type) => set.has(type));
  }, [entities]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {presentTypes.map((type) => {
          const config = ENTITY_REGISTRY[type];
          const hidden = hiddenTypes.has(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all",
                hidden
                  ? "border-gold/15 text-muted-foreground/50 opacity-60"
                  : "border-gold/30 text-foreground/85"
              )}
            >
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: config.accent }}
              />
              {config.plural}
            </button>
          );
        })}
      </div>

      <div className="relative overflow-hidden rounded-xl border border-gold/20 bg-[radial-gradient(ellipse_at_center,rgba(19,28,49,0.6),rgba(10,12,18,0.95))]">
        <canvas
          ref={canvasRef}
          className="h-[65svh] w-full touch-none"
          aria-label="Grafo delle entità del regno"
        />
        <p className="pointer-events-none absolute bottom-3 left-3 text-xs text-muted-foreground/70">
          Trascina per spostare · rotella per lo zoom · click su un nodo per aprirlo
        </p>
      </div>
    </div>
  );
}

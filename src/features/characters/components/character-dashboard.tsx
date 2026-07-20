"use client";

import {
  LayoutGrid,
  Plus,
  Search,
  Skull,
  Table as TableIcon,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { ListPageHero } from "@/components/shared/list-page-hero";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/features/auth/auth-provider";
import { SpecializedEntityCard } from "@/features/entities/components/specialized-cards";
import { useAllRelations } from "@/features/entities/data";
import { cn } from "@/lib/utils";
import {
  type CharacterKind,
  type CharacterStatus,
  type Entity,
  type Relation,
} from "@/types/entities";

import {
  CHARACTER_KIND_LABELS,
  CHARACTER_KIND_SHORT,
  CHARACTER_STATUS_BADGES,
  CHARACTER_STATUS_LABELS,
  CHARACTER_STATUS_OPTIONS,
} from "../constants";
import { useCharacters } from "../data";
import { CharacterCreateDialog } from "./character-create-dialog";

const ALL = "__all__";
const PLACE_TYPES = ["location", "city", "region", "world"];

type SortKey = "name" | "level-desc" | "level-asc";

/** Estrae i nomi di fazioni e luoghi collegati a un personaggio. */
function linksOf(relations: Relation[], charId: string) {
  const factions = new Set<string>();
  const places = new Set<string>();
  for (const relation of relations) {
    let otherType: string | null = null;
    let otherName = "";
    if (relation.aId === charId) {
      otherType = relation.bType;
      otherName = relation.bName;
    } else if (relation.bId === charId) {
      otherType = relation.aType;
      otherName = relation.aName;
    }
    if (!otherType) continue;
    if (otherType === "faction") factions.add(otherName);
    else if (PLACE_TYPES.includes(otherType)) places.add(otherName);
  }
  return { factions, places };
}

interface CharacterDashboardProps {
  /** Limita a un tipo (PC o NPC) e nasconde il filtro tipo. */
  restrictKind?: CharacterKind;
  /** Mostra solo i membri del party (fields.partyMember). */
  partyOnly?: boolean;
  title?: string;
  subtitle?: string;
  /** Se presente, mostra la testata immersiva al posto del PageHeader. */
  hero?: { eyebrow?: string; src?: string; accent?: string };
}

/** Dashboard dei personaggi: ricerca, filtri, ordinamento, card/tabella. */
export function CharacterDashboard({
  restrictKind,
  partyOnly = false,
  title = "Personaggi",
  subtitle = "Eroi, alleati e rivali: i volti che popolano le cronache del regno.",
  hero,
}: CharacterDashboardProps = {}) {
  const { isMaster } = useAuth();
  const { data: characters, isLoading } = useCharacters();
  const { data: relations } = useAllRelations();

  const [view, setView] = useState<"card" | "table">("card");
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [race, setRace] = useState<string>(ALL);
  const [klass, setKlass] = useState<string>(ALL);
  const [level, setLevel] = useState<string>(ALL);
  const [faction, setFaction] = useState<string>(ALL);
  const [place, setPlace] = useState<string>(ALL);
  const [sort, setSort] = useState<SortKey>("name");
  const [createOpen, setCreateOpen] = useState(false);

  const list = useMemo(() => {
    let scoped = characters ?? [];
    if (restrictKind)
      scoped = scoped.filter((c) => c.fields.kind === restrictKind);
    if (partyOnly)
      scoped = scoped.filter((c) => c.fields.partyMember === true);
    return scoped;
  }, [characters, restrictKind, partyOnly]);
  const allRelations = useMemo(() => relations ?? [], [relations]);

  // Mappa personaggio → fazioni/luoghi collegati (per filtri e tabella).
  const linksById = useMemo(() => {
    const map = new Map<string, { factions: string[]; places: string[] }>();
    for (const character of list) {
      const { factions, places } = linksOf(allRelations, character.id);
      map.set(character.id, {
        factions: [...factions],
        places: [...places],
      });
    }
    return map;
  }, [list, allRelations]);

  // Valori distinti per popolare i menu dei filtri.
  const options = useMemo(() => {
    const races = new Set<string>();
    const classes = new Set<string>();
    const levels = new Set<number>();
    const factions = new Set<string>();
    const places = new Set<string>();
    for (const character of list) {
      const race = String(character.fields.race ?? "").trim();
      const klass = String(character.fields.class ?? "").trim();
      const level = Number(character.fields.level ?? 0);
      if (race) races.add(race);
      if (klass) classes.add(klass);
      if (level > 0) levels.add(level);
      const links = linksById.get(character.id);
      links?.factions.forEach((value) => factions.add(value));
      links?.places.forEach((value) => places.add(value));
    }
    return {
      races: [...races].sort((a, b) => a.localeCompare(b, "it")),
      classes: [...classes].sort((a, b) => a.localeCompare(b, "it")),
      levels: [...levels].sort((a, b) => a - b),
      factions: [...factions].sort((a, b) => a.localeCompare(b, "it")),
      places: [...places].sort((a, b) => a.localeCompare(b, "it")),
    };
  }, [list, linksById]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const result = list.filter((character) => {
      const links = linksById.get(character.id);
      if (kind !== ALL && character.fields.kind !== kind) return false;
      if (status !== ALL && character.fields.status !== status) return false;
      if (race !== ALL && String(character.fields.race ?? "") !== race)
        return false;
      if (klass !== ALL && String(character.fields.class ?? "") !== klass)
        return false;
      if (level !== ALL && Number(character.fields.level ?? 0) !== Number(level))
        return false;
      if (faction !== ALL && !links?.factions.includes(faction)) return false;
      if (place !== ALL && !links?.places.includes(place)) return false;
      if (
        term &&
        !character.name.toLowerCase().includes(term) &&
        !character.tags.some((tag) => tag.toLowerCase().includes(term))
      )
        return false;
      return true;
    });

    result.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "it");
      const la = Number(a.fields.level ?? 0);
      const lb = Number(b.fields.level ?? 0);
      return sort === "level-desc" ? lb - la : la - lb;
    });
    return result;
  }, [
    list,
    linksById,
    search,
    kind,
    status,
    race,
    klass,
    level,
    faction,
    place,
    sort,
  ]);

  const activeFilters =
    [kind, status, race, klass, level, faction, place].filter(
      (value) => value !== ALL
    ).length + (search.trim() ? 1 : 0);

  const resetFilters = () => {
    setSearch("");
    setKind(ALL);
    setStatus(ALL);
    setRace(ALL);
    setKlass(ALL);
    setLevel(ALL);
    setFaction(ALL);
    setPlace(ALL);
  };

  // Creazione: i PC li crea chiunque (il proprio); gli NPC solo il Master.
  const canCreate = restrictKind === "PC" ? true : isMaster;
  const createLabel =
    restrictKind === "PC"
      ? isMaster
        ? "Personaggio del Party"
        : "Il mio personaggio"
      : "Personaggio";

  const createButton = canCreate ? (
    <Button onClick={() => setCreateOpen(true)}>
      <Plus className="size-4" />
      {createLabel}
    </Button>
  ) : undefined;

  return (
    <div>
      {hero ? (
        <ListPageHero
          eyebrow={hero.eyebrow}
          title={title}
          subtitle={subtitle}
          src={hero.src}
          accent={hero.accent}
          actions={createButton}
        />
      ) : (
        <PageHeader title={title} subtitle={subtitle} actions={createButton} />
      )}

      {/* Barra strumenti */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gold/60" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cerca tra i personaggi…"
            className="pl-9"
          />
        </div>

        <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Nome (A→Z)</SelectItem>
            <SelectItem value="level-desc">Livello (alto→basso)</SelectItem>
            <SelectItem value="level-asc">Livello (basso→alto)</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto inline-flex rounded-lg border border-hairline-strong bg-night/30 p-1">
          <ViewToggle
            active={view === "card"}
            onClick={() => setView("card")}
            label="Card"
            icon={<LayoutGrid className="size-4" />}
          />
          <ViewToggle
            active={view === "table"}
            onClick={() => setView("table")}
            label="Tabella"
            icon={<TableIcon className="size-4" />}
          />
        </div>
      </div>

      {/* Filtri */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {!restrictKind && (
          <FilterSelect
            value={kind}
            onChange={setKind}
            placeholder="Tipo"
            options={[
              { value: "PC", label: CHARACTER_KIND_LABELS.PC },
              { value: "NPC", label: CHARACTER_KIND_LABELS.NPC },
            ]}
          />
        )}
        <FilterSelect
          value={status}
          onChange={setStatus}
          placeholder="Stato"
          options={CHARACTER_STATUS_OPTIONS}
        />
        <FilterSelect
          value={race}
          onChange={setRace}
          placeholder="Razza"
          options={options.races.map((value) => ({ value, label: value }))}
        />
        <FilterSelect
          value={klass}
          onChange={setKlass}
          placeholder="Classe"
          options={options.classes.map((value) => ({ value, label: value }))}
        />
        <FilterSelect
          value={level}
          onChange={setLevel}
          placeholder="Livello"
          options={options.levels.map((value) => ({
            value: String(value),
            label: `Livello ${value}`,
          }))}
        />
        <FilterSelect
          value={faction}
          onChange={setFaction}
          placeholder="Fazione"
          options={options.factions.map((value) => ({ value, label: value }))}
        />
        <FilterSelect
          value={place}
          onChange={setPlace}
          placeholder="Luogo"
          options={options.places.map((value) => ({ value, label: value }))}
        />
        {activeFilters > 0 && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Azzera filtri
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-60 rounded-xl bg-muted/60" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={
            list.length === 0
              ? "Nessun personaggio registrato"
              : "Nessun personaggio corrisponde ai filtri"
          }
          description={
            list.length === 0
              ? "Le strade del regno sono stranamente deserte… per ora."
              : "Prova ad allargare la ricerca o ad azzerare i filtri."
          }
          action={
            list.length === 0 && canCreate ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                {createLabel}
              </Button>
            ) : list.length > 0 ? (
              <Button variant="outline" onClick={resetFilters}>
                Azzera filtri
              </Button>
            ) : undefined
          }
        />
      ) : view === "card" ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((character) => (
            <SpecializedEntityCard key={character.id} entity={character} showType={false} />
          ))}
        </div>
      ) : (
        <CharacterTable
          characters={filtered}
          linksById={linksById}
          isMaster={isMaster}
        />
      )}

      {canCreate && (
        <CharacterCreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          lockKind={restrictKind ?? (isMaster ? undefined : "PC")}
        />
      )}
    </div>
  );
}

function CharacterTable({
  characters,
  linksById,
  isMaster,
}: {
  characters: Entity[];
  linksById: Map<string, { factions: string[]; places: string[] }>;
  isMaster: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-hairline">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Stato</TableHead>
            <TableHead>Razza</TableHead>
            <TableHead>Classe</TableHead>
            <TableHead className="text-right">Liv.</TableHead>
            <TableHead>Luogo</TableHead>
            {isMaster && <TableHead>Proprietario</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {characters.map((character) => {
            const kind = (character.fields.kind as CharacterKind) ?? "NPC";
            const status =
              (character.fields.status as CharacterStatus) ?? "ALIVE";
            const links = linksById.get(character.id);
            const level = Number(character.fields.level ?? 0);
            return (
              <TableRow key={character.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/entita/${character.id}`}
                    className="flex items-center gap-2 hover:text-gold-bright"
                  >
                    {character.fields.isDead === true && (
                      <Skull className="size-3.5 shrink-0 text-red-400" />
                    )}
                    <span className="truncate">{character.name}</span>
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {CHARACTER_KIND_SHORT[kind]}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn("text-[10px]", CHARACTER_STATUS_BADGES[status])}
                  >
                    {CHARACTER_STATUS_LABELS[status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {String(character.fields.race ?? "—") || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {String(character.fields.class ?? "—") || "—"}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {level > 0 ? level : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {links?.places[0] ?? "—"}
                </TableCell>
                {isMaster && (
                  <TableCell className="text-muted-foreground">
                    {kind === "PC"
                      ? String(character.fields.ownerName ?? "") || "—"
                      : "—"}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function ViewToggle({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-gold/20 text-gold-bright"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  if (options.length === 0) return null;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={cn("w-auto min-w-32", value !== ALL && "border-gold/50 text-gold-bright")}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}: tutti</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

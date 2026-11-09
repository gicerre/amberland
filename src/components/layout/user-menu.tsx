"use client";

import { BookMarked, ChevronsUpDown, KeyRound, LogOut, Swords } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/auth-provider";
import { useMyCharacter } from "@/features/characters/data";
import { ROLE_BADGE_CLASSES, ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Menu utente (avatar, ruolo, azioni account).
 * Avatar = token del personaggio se disponibile, altrimenti l'iniziale.
 * `compact` mostra solo l'avatar — usato nella topbar mobile.
 */
export function UserMenu({ compact = false }: { compact?: boolean }) {
  const { profile, role, signOutUser } = useAuth();
  const { data: pc } = useMyCharacter();
  const router = useRouter();

  if (!profile) return null;

  const initial = profile.username.charAt(0).toUpperCase();
  const token = pc?.sheet?.tokenUrl || pc?.imageUrl || "";

  const handleSignOut = async () => {
    await signOutUser();
    router.replace("/login");
  };

  const avatar = (
    <Avatar
      className={cn(
        "border border-hairline-strong ring-1 ring-gold/40",
        compact ? "size-9" : "size-11"
      )}
    >
      {token && <AvatarImage src={token} alt={profile.username} className="object-cover" />}
      <AvatarFallback className="bg-surface-3 text-sm font-semibold text-gold-bright">
        {initial}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "group relative flex items-center gap-3 overflow-hidden text-left outline-none transition-all",
          compact
            ? "rounded-full p-0.5 hover:opacity-90"
            : "w-full rounded-xl border border-hairline bg-surface-1 p-2.5 hover:elev-1 hover:border-hairline-strong hover:bg-surface-2"
        )}
      >
        {avatar}
        {!compact && (
          <>
            <div className="relative min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-parchment">
                {profile.username}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {role ? ROLE_LABELS[role] : ""}
              </p>
            </div>
            <ChevronsUpDown className="relative size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-heading">{profile.username}</span>
            {role && (
              <Badge
                variant="outline"
                className={cn("text-[10px]", ROLE_BADGE_CLASSES[role])}
              >
                {ROLE_LABELS[role]}
              </Badge>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {pc && (
          <DropdownMenuItem asChild>
            <Link href="/pg">
              <Swords className="size-4" />
              Il mio eroe
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href="/area-personale">
            <BookMarked className="size-4" />
            Obiettivi e diario
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/cambia-password">
            <KeyRound className="size-4" />
            Cambia password
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => void handleSignOut()}
        >
          <LogOut className="size-4" />
          Lascia il regno
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

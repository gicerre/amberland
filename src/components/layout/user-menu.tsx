"use client";

import { BookMarked, ChevronsUpDown, KeyRound, LogOut } from "lucide-react";
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
        "border-2 border-gold/50 shadow-[0_0_14px_rgba(212,175,55,0.25)]",
        compact ? "size-9" : "size-11"
      )}
    >
      {token && <AvatarImage src={token} alt={profile.username} className="object-cover" />}
      <AvatarFallback className="bg-gradient-to-br from-gold/25 to-night/60 font-heading font-bold text-gold-bright">
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
            : "w-full rounded-xl border border-gold/30 bg-gradient-to-r from-gold/15 via-night/50 to-night/40 p-2.5 hover:border-gold/55 hover:shadow-[0_0_22px_rgba(212,175,55,0.18)]"
        )}
      >
        {!compact && (
          <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_left,rgba(212,175,55,0.15),transparent_60%)] opacity-0 transition-opacity group-hover:opacity-100" />
        )}
        {avatar}
        {!compact && (
          <>
            <div className="relative min-w-0 flex-1">
              <p className="truncate font-heading text-sm font-bold text-gold-bright">
                {profile.username}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {role ? ROLE_LABELS[role] : ""}
              </p>
            </div>
            <ChevronsUpDown className="relative size-4 shrink-0 text-gold/60 transition-colors group-hover:text-gold" />
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
        <DropdownMenuItem asChild>
          <Link href="/area-personale">
            <BookMarked className="size-4" />
            Area Personale
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

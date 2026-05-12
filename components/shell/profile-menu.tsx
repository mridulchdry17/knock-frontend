"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronUp, LogOut, BookOpen, Mail, Unplug } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/auth/auth-context";
import { TierBadge } from "@/components/knock/tier-badge";
import { ThemeToggleRow } from "@/components/shell/theme-toggle-row";
import { DisconnectGmailDialog } from "@/components/knock/disconnect-gmail-dialog";

function initials(name: string | null | undefined, email: string): string {
  const source = (name ?? email).trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function ProfileMenu() {
  const { user, signOutRemote } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  if (!user) return null;

  async function handleSignOut() {
    // Fire toast first so it shows even after the redirect kicks in.
    toast("Signed out. Come back soon.");
    await signOutRemote();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="group flex w-full items-center gap-3 rounded-md p-2 hover:bg-paper-2 focus:outline-none"
          aria-label="Open profile menu"
        >
          <Avatar>
            <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-left">
            <div className="truncate text-small font-medium text-ink">{user.name ?? user.email}</div>
            <div className="truncate text-caption text-ink-3">{user.email}</div>
          </div>
          <ChevronUp size={16} className="text-ink-3 group-data-[state=open]:rotate-180 transition-transform" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-[220px]">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-caption uppercase text-ink-3">Account</span>
            <TierBadge tier={user.tier} />
          </div>
          <DropdownMenuSeparator />
          <ThemeToggleRow />
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/preferences">
              <Mail size={14} aria-hidden />
              <span>
                Gmail: {user.gmail_connected ? "Connected" : "Not connected"}
              </span>
            </Link>
          </DropdownMenuItem>
          {user.gmail_connected ? (
            <DropdownMenuItem
              destructive
              onSelect={(e) => {
                e.preventDefault();
                setConfirmOpen(true);
              }}
            >
              <Unplug size={14} aria-hidden />
              <span>Disconnect Gmail</span>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem asChild>
            <a href="https://knock.app/help" target="_blank" rel="noreferrer">
              <BookOpen size={14} aria-hidden />
              <span>Help &amp; docs</span>
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={() => void handleSignOut()}>
            <LogOut size={14} aria-hidden />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DisconnectGmailDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        describedById="profile-menu-disconnect-desc"
      />
    </>
  );
}

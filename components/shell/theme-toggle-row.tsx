"use client";

import { Moon, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/theme/theme-provider";

export function ThemeToggleRow() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex items-center justify-between gap-2 px-2 py-1.5">
      <span className="flex items-center gap-2 text-small text-ink">
        {isDark ? <Moon size={14} aria-hidden /> : <Sun size={14} aria-hidden />}
        <span>{isDark ? "Dark" : "Light"} theme</span>
      </span>
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label="Toggle dark theme"
      />
    </div>
  );
}

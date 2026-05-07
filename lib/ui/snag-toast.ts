import { toast } from "sonner";

/**
 * Locked error voice — "We hit a snag…"
 * Use everywhere a network/save/load error needs to surface as a toast,
 * so the voice stays consistent across the app.
 */
export function showSnagToast(scope?: "save" | "load" | "send" | "default") {
  switch (scope) {
    case "save":
      toast.error("We hit a snag saving. Your changes are still here — try again.");
      return;
    case "load":
      toast.error("We hit a snag loading. Try again.");
      return;
    case "send":
      toast.error("We hit a snag sending. Your draft is saved — try again or skip for today.");
      return;
    default:
      toast.error("We hit a snag. Try again in a moment.");
  }
}

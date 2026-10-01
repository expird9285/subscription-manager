import { jsx } from "hono/jsx";
import type { IconNode } from "lucide";

export {
  Bot,
  CalendarClock,
  CalendarDays,
  ChartColumn,
  ChartPie,
  CircleCheck,
  Clock,
  Copy,
  CreditCard,
  Crown,
  Database,
  Download,
  KeyRound,
  Landmark,
  LayoutDashboard,
  Link,
  LogOut,
  Menu,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Trash,
  Wallet,
  X,
} from "lucide";

/** Renders a lucide icon node as inline SVG (no client-side JS needed). */
export function Icon({ icon, class: className = "h-4 w-4" }: { icon: IconNode; class?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={className}
      aria-hidden="true"
    >
      {icon.map(([tag, attrs]) => jsx(tag, attrs as Record<string, unknown>))}
    </svg>
  );
}

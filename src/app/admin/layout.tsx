export const metadata = { title: "ایڈمن پینل" };

// Pass-through layout: auth guard + AdminShell live in (panel)/layout.tsx.
// The old /admin/login page was removed — /admin/* is gated by middleware
// and the legacy URL redirects authenticated admins into the panel.
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}

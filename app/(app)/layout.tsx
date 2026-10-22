import Shell from "@/components/Shell";

// Everything here is behind a client-side login check and per-user data, so there is
// no static shell for Next to validate.
export const instant = false;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}

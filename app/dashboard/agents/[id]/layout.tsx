// This layout is now just a pass-through since the parent dashboard layout
// handles the header and sidebar dynamically
export default function AgentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
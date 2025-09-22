import { redirect } from 'next/navigation'

export default function AgentDetailPage({
  params
}: {
  params: { id: string }
}) {
  // Redirect to playground tab by default
  redirect(`/dashboard/agents/${params.id}/playground`)
}
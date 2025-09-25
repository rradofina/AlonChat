import { redirect } from 'next/navigation'

export default async function AgentDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // Redirect to playground tab by default
  redirect(`/dashboard/agents/${id}/playground`)
}
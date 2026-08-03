import { redirect } from 'next/navigation';

export default function AgentBuilderRedirect() {
  redirect('/settings?tab=agent-builder-2');
}

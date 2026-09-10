import { redirect } from 'next/navigation'

// Redirect bare (dashboard) route to /dashboard
export default function DashboardIndex() {
  redirect('/dashboard')
}

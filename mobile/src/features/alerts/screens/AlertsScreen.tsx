import { EmptyState } from '@/common/components/EmptyState'
import { Screen } from '@/common/ui'

/** In-app notifications feed (wired in a later phase). */
export function AlertsScreen() {
    return (
        <Screen scroll={false} padded={false}>
            <EmptyState title="Alerts" message="Your flood alerts and advisories will appear here." />
        </Screen>
    )
}

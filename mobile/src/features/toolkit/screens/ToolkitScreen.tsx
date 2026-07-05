import { EmptyState } from '@/common/components/EmptyState'
import { Screen } from '@/common/ui'

/** Offline disaster toolkit. Before/during/after guidance + hotlines land in Phase D. */
export function ToolkitScreen() {
    return (
        <Screen scroll={false} padded={false}>
            <EmptyState
                title="Disaster toolkit"
                message="Offline flood guidance, emergency hotlines, and a go-bag checklist will live here."
            />
        </Screen>
    )
}

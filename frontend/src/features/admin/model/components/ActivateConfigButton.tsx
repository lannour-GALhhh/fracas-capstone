import { Button } from '@/common/ui/button'
import ConfirmDialog from '../../components/ConfirmDialog'
import { useActivateRiskConfig } from '../../hooks/useModelMutations'
import type { RiskConfig } from '../../types/model'

/** Make this config the one the scoring pipeline reads. */
const ActivateConfigButton = ({ config }: { config: RiskConfig }) => {
    const activate = useActivateRiskConfig()

    if (config.is_active) {
        return (
            <Button size='sm' variant='outline' disabled>
                Active
            </Button>
        )
    }

    return (
        <ConfirmDialog
            trigger={
                <Button size='sm' variant='outline'>
                    Activate
                </Button>
            }
            title={`Activate "${config.name}"?`}
            description='The scoring pipeline switches to this config immediately (within one pipeline cycle), and any new validation run scores against it.'
            confirmLabel='Activate'
            isPending={activate.isPending}
            onConfirm={() => activate.mutate(config.id)}
        />
    )
}

export default ActivateConfigButton

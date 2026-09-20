import { useState } from 'react'
import { cn } from '@/common/utils/utils'
import OrganizationPanel from './panels/OrganizationPanel'
import RegistrationPanel from './panels/RegistrationPanel'
import RetentionPanel from './panels/RetentionPanel'
import TogglesPanel from './panels/TogglesPanel'

const TABS = [
    { key: 'organization', label: 'Organization', Panel: OrganizationPanel },
    { key: 'toggles', label: 'Operational', Panel: TogglesPanel },
    { key: 'registration', label: 'Registration', Panel: RegistrationPanel },
    { key: 'retention', label: 'Retention', Panel: RetentionPanel },
] as const

/** Admin console: system configuration grouped into tabbed singletons. */
const SettingsPage = () => {
    const [active, setActive] = useState<(typeof TABS)[number]['key']>('organization')
    const ActivePanel = TABS.find((t) => t.key === active)!.Panel

    return (
        <div className='w-full'>
            <div>
                <h1 className='text-2xl font-semibold'>Settings</h1>
                <p className='text-xs text-black/50'>
                    System-wide configuration. Each change is audited; defaults match the current
                    behaviour, so nothing changes until you edit it.
                </p>
            </div>

            <div className='mt-4 flex flex-wrap gap-1 border-b'>
                {TABS.map(({ key, label }) => (
                    <button
                        key={key}
                        type='button'
                        onClick={() => setActive(key)}
                        className={cn(
                            'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                            active === key
                                ? 'border-primary text-foreground'
                                : 'border-transparent text-muted-foreground hover:text-foreground',
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className='mt-4 max-w-2xl'>
                <ActivePanel />
            </div>
        </div>
    )
}

export default SettingsPage

import { Navigate, useParams } from 'react-router-dom'
import RainfallPanel from './panels/RainfallPanel'
import RegistrationPanel from './panels/RegistrationPanel'
import RetentionPanel from './panels/RetentionPanel'
import GeneralPanel from './panels/GeneralPanel'

const SETTINGS_PAGES = {
    general: { label: 'General', Panel: GeneralPanel },
    rainfall: { label: 'Rainfall', Panel: RainfallPanel },
    registration: { label: 'Registration', Panel: RegistrationPanel },
    retention: { label: 'Retention', Panel: RetentionPanel },
} as const

type SettingsPageKey = keyof typeof SETTINGS_PAGES

/** Admin console: one system-configuration panel per route (`/admin/settings/:group`). */
const SettingsPage = () => {
    const { group } = useParams()
    if (!group || !(group in SETTINGS_PAGES)) return <Navigate to='/admin/settings/general' replace />
    const { label, Panel } = SETTINGS_PAGES[group as SettingsPageKey]

    return (
        <div className='w-full'>
            <h1 className='text-2xl font-semibold'>{label} settings</h1>
            <div className='mt-4'>
                <Panel />
            </div>
        </div>
    )
}

export default SettingsPage

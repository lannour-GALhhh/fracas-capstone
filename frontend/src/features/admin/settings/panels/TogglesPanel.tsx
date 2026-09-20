import { useSettingsForm } from '../../hooks/useSettingsForm'
import type { OperationalToggles } from '../../types/settings'
import { SettingsSection } from '../components/SettingsSection'
import { SaveBar, TextField, ToggleField } from '../components/fields'

const TogglesForm = ({ initial }: { initial: OperationalToggles }) => {
    const { form, setField, dirty, saving, save } = useSettingsForm('toggles', initial)

    return (
        <div className='flex flex-col gap-5'>
            <ToggleField
                id='maintenance_mode'
                label='Maintenance mode'
                description='Signals clients that the system is under maintenance.'
                checked={form.maintenance_mode}
                onChange={(v) => setField('maintenance_mode', v)}
            />
            <TextField
                id='announcement_banner'
                label='Announcement banner'
                description='System-wide banner text shown across the console. Leave blank to hide.'
                value={form.announcement_banner}
                placeholder='e.g. Scheduled maintenance tonight 10pm–11pm'
                onChange={(v) => setField('announcement_banner', v)}
            />
            <SaveBar dirty={dirty} saving={saving} onSave={save} />
        </div>
    )
}

const TogglesPanel = () => (
    <SettingsSection
        group='toggles'
        title='Operational toggles'
        description='System-wide switches and the console announcement banner.'
    >
        {(initial) => <TogglesForm initial={initial} />}
    </SettingsSection>
)

export default TogglesPanel

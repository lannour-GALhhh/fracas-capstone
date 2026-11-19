import OrganizationPanel from './OrganizationPanel'
import TogglesPanel from './TogglesPanel'

/** Organization branding + operational toggles, shown together. */
const GeneralPanel = () => (
    <div className='flex flex-col gap-4'>
        <OrganizationPanel />
        <TogglesPanel />
    </div>
)

export default GeneralPanel

import UsersTable from './components/UsersTable'
import CreateUserDialog from './components/CreateUserDialog'

/** Admin console: list, search and provision operator/admin accounts. */
const UsersPage = () => {
    return (
        <div className='w-full'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
                <div>
                    <h1 className='text-2xl font-semibold'>Users</h1>
                    <p className='text-xs text-black/50'>
                        Operator and admin accounts: promote/demote, deactivate, and reset
                        passwords. Resident accounts aren't shown here.
                    </p>
                </div>
                <CreateUserDialog />
            </div>

            <UsersTable />
        </div>
    )
}

export default UsersPage

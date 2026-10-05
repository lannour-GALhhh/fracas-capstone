import UsersTable from './components/UsersTable'
import CreateUserDialog from './components/CreateUserDialog'

/** Admin: list, search, add and edit operator/admin accounts. */
const AccountsPage = () => {
    return (
        <div className='w-full p-4 sm:p-6'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
                <div>
                    <h1 className='text-2xl font-semibold'>Accounts</h1>
                    <p className='text-xs text-black/50'>
                        Operator and admin accounts: add, promote/demote, deactivate, reset
                        passwords. Resident accounts aren't shown here.
                    </p>
                </div>
                <CreateUserDialog />
            </div>

            <UsersTable />
        </div>
    )
}

export default AccountsPage

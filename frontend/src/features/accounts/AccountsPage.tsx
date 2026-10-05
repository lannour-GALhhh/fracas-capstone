import UsersTable from './components/UsersTable'
import CreateUserDialog from './components/CreateUserDialog'

/** Admin: list, search, add and edit operator/admin accounts. */
const AccountsPage = () => {
    return (
        <div className='w-full p-4'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
                <h1 className='text-2xl font-semibold'>Accounts</h1>
                <CreateUserDialog />
            </div>

            <UsersTable />
        </div>
    )
}

export default AccountsPage

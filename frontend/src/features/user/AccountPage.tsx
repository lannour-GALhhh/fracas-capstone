import { Card, CardTitle } from '@/common/ui/card'
import UserInformationCard from './components/UserInformationCard'
import { Separator } from '@/common/ui/separator'
import ProfileDetailsCard from './components/ProfileDetailsCard'
import EditProfileDialog from './components/EditProfileDialog'
import ChangePasswordDialog from './components/ChangePasswordDialog'
import OperatorActivity from './components/OperatorActivity'
import AccountChangeLog from './components/AccountChangeLog'
import ErrorState from '@/common/components/ErrorState'
import { useCurrentUser } from './hooks/useCurrentUser'

const AccountPage = () => {
	const { data: user, isLoading, isError, refetch } = useCurrentUser()

	if (isLoading) {
		return <div className='p-6 text-muted-foreground'>Loading your account…</div>
	}

	if (isError || !user) {
		return (
			<ErrorState
				title='Couldn’t load your account'
				message='We ran into a problem fetching your profile. This is usually a brief connection hiccup — give it another try.'
				onRetry={() => refetch()}
			/>
		)
	}

	return (
		<div className='mx-auto flex w-full max-w-5xl flex-col gap-4 p-4'>
			<Card className='p-6'>
				<UserInformationCard
					first_name={user.first_name || user.username}
					last_name={user.last_name}
					is_active={user.is_active}
					role={user.role}
					actions={
						<>
							<EditProfileDialog user={user} />
							<ChangePasswordDialog />
						</>
					}
				/>
				<Separator />
				<ProfileDetailsCard
					email={user.email || '—'}
					phone_number={user.phone_number || '—'}
					address={user.address}
				/>
			</Card>

			<div className='grid gap-4 lg:grid-cols-2'>
				<Card className='p-6'>
					<CardTitle>My activity</CardTitle>
					<OperatorActivity />
				</Card>
				<Card className='p-6'>
					<CardTitle>Account history</CardTitle>
					<AccountChangeLog />
				</Card>
			</div>
		</div>
	)
}

export default AccountPage

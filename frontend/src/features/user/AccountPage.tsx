import { Card, CardTitle } from '@/common/ui/card'
import UserInformationCard from './components/UserInformationCard'
import type { Role } from '@/common/types/Role'
import { Separator } from '@/common/ui/separator'
import { Label } from '@/common/ui/label'
import ProfileDetailsCard from './components/ProfileDetailsCard'
import { Button } from '@/common/ui/button'

const AccountPage = () => {

	const account = {
		first_name: "Ahlan-nour",
		last_name: "Sencio",
		role: "staff",
		is_active: true,

		email: "sencioahlannour@gmail.com",
		phone_number: "+639 123 456 7890",
	}

	return (
		<div className='flex p-2 h-full'>
			<Card className='w-1/3 flex flex-col p-2 bg-olive-50'>
				<UserInformationCard first_name={account.first_name} last_name={account.last_name} role={account.role} is_active={account.is_active} />
				<Separator>
				</Separator>

				<ProfileDetailsCard email={account.email} phone_number={account.phone_number} />
				<Separator></Separator>

				<Button size="lg">
					Edit Profile Information
				</Button>
				<Button size="lg" variant="outline">
					Change Password
				</Button>
			</Card>
			<div>
				<CardTitle>Profile Details</CardTitle>
			</div>
		</div>
	)
}

export default AccountPage
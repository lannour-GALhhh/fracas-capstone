import { Button } from '@/common/ui/button'
import { CardTitle, Card, CardContent } from '@/common/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/common/ui/chart'
import { Label } from '@/common/ui/label'
import { Progress, ProgressLabel } from '@/common/ui/progress'
import { CartesianGrid, Line, LineChart, XAxis } from 'recharts'

const BarangayPanel = () => {

	const chartData = [
		{name: "Now", rainfall: 22},
		{name: "1hr", rainfall: 24},
		{name: "2hr", rainfall: 18},
		{name: "3hr", rainfall: 19},
		{name: "4hr", rainfall: 20},
	]


	const chartConfig = {
		rainfall: {
			label: "Rainfall",
			color: "var(--chart-2)",
		},
	} satisfies ChartConfig

	return (
		<div className='absolute top-0 right-0 w-1/4 max-h-full bg-white z-3 overflow-y-auto overflow-x-visible'>
			<div className="h-full overflow-auto flex flex-col gap-4 p-4">
				<h1 className='text-2xl font-medium'>Tumaga</h1>

				<Card>
					<CardTitle>Hazard: Medium</CardTitle>
					<div className='grid grid-cols-2 gap-4'>
						<Card className='justify-between'>
							<Label className='text-xs'>Current Rainfall Strength</Label>
							<span className='flex items-center gap-2'>
								<h1 className='text-4xl font-semibold'>22</h1>
								<h5>mm/hr</h5>
							</span>
						</Card>
						<Card className='justify-between'>
							<Label className='text-xs'>Rate of Change</Label>
							<span className='flex items-center gap-2'>
								<h1 className='text-4xl font-semibold'>+2</h1>
								<h5>mm/hr</h5>
							</span>
						</Card>
					</div>
					<Progress value={30}>
						<ProgressLabel className="flex justify-between w-full">
							<span>Final Hazard Risk Score</span>
							<span>30%</span>	
						</ProgressLabel>
					</Progress>
				</Card>

				<Card >
					<CardTitle>Rainfall Information</CardTitle>
					<div className='w-full flex flex-col gap-2'>
						<Card size='sm' className='flex-row justify-between'>
							<Label>Current Rainfall Strength</Label>
							<h1>22 mm/hr</h1>
						</Card>
						<Card size='sm' className='flex-row justify-between'>
							<Label>Forecast Rainfall (1 hr)</Label>
							<h1>24 mm/hr</h1>
						</Card>
						<Card size='sm' className='flex-row justify-between'>
							<Label>Forecast Rainfall (2 hr)</Label>
							<h1>18 mm/hr</h1>
						</Card>
						<Card size='sm' className='flex-row justify-between'>
							<Label>Forecast Rainfall (3 hr)</Label>
							<h1>19 mm/hr</h1>
						</Card>
						<Card size='sm' className='flex-row justify-between'>
							<Label>Forecast Rainfall (4 hr)</Label>
							<h1>20 mm/hr</h1>
						</Card>
					</div>
				</Card>

				<Card className='h-fit py-2'>
					<Label>Rainfall Strength Chart</Label>
					<CardContent>
						<ChartContainer config={chartConfig}>
							<LineChart accessibilityLayer data={chartData} margin={{ top: 12, left: 2, right: 12 }}>
								<CartesianGrid vertical={false} />
								<XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
								<ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
								<Line
									dataKey="rainfall"
									type="natural"
									stroke="var(--color-rainfall)"
									strokeWidth={2}
									dot={{ fill: "var(--color-rainfall)" }}
									activeDot={{ r: 6 }}
								/>
							</LineChart>
						</ChartContainer>
					</CardContent>
				</Card>

				<Button variant="destructive" className="w-full" size="lg">Send Broadcast Alert</Button>
			<Button variant="outline" className="w-full -mt-2" size="lg">View Report</Button>
			</div>
		</div>
	)
}

export default BarangayPanel
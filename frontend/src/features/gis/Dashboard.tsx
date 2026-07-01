import { useEffect, useState, useCallback } from 'react'
import GISMap from './component/GISMap'
import RiskCard from './component/RiskCard'
import Legend from './component/Legend'
import PasonancaDamStatus from './component/PasonancaDamStatus'
import type { RiskCardType } from './types/RiskType'
import apiClient from '@/app/apiClient'
import type { FeatureCollection } from 'geojson'
import type { PasonancaDamType } from './types/PasonancaDamType'
import BarangayPanel from './component/BarangayPanel'

const Dashboard = () => {

	const [barangays, setBarangays] = useState<FeatureCollection | null>(null);

	const [isPanelVisible, setPanelVisible] = useState<boolean>(false);

	const Risks: RiskCardType[] = [
		{
			risk: "critical",
			barangays: [
				{ name: "Tumaga", link: "" },
				{ name: "Mercedes", link: "" },
			]
		},
		{
			risk: "high",
			barangays: null
		},
		{
			risk: "medium",
			barangays: null
		},
		{
			risk: "low",
			barangays: null
		},
	]

	const PasonancaDamLevel: PasonancaDamType = {
		currentLevel: 74.24,
		criticalLevel: 76.60,
		rateOfChange: 2
	}

	const riskList = Risks.map(({ risk, barangays }, index) =>
		<RiskCard
			key={index}
			risk={risk}
			barangays={barangays}
		/>
	);

	const handleFeatureClick = useCallback((id: string, properties: Record<string, unknown>): void => {
		setPanelVisible(e => !e)
	}, [])

	// useEffect(() => {
	// 	const getInfo = async () => {
	// 		const data = await apiClient.get('/api/barangays/')

	// 		setBarangays(data.data)
	// 	}	

	// 	getInfo();
	// }, [])

	// useEffect(() => {
	// 	console.log(barangays)
	// }, [barangays])

	return (
		<>
			{isPanelVisible &&
				<BarangayPanel />
			}
			<Legend />
			<div className='absolute top-4 right-4 grid grid-cols-2 gap-2 z-2 w-1/4'>
				{riskList}
				<PasonancaDamStatus
					criticalLevel={PasonancaDamLevel.criticalLevel}
					currentLevel={PasonancaDamLevel.currentLevel}
					rateOfChange={PasonancaDamLevel.rateOfChange} />
			</div>
			{/* {
				barangays && 
			} */}
			<GISMap onFeatureClick={handleFeatureClick} />
		</>
	)
}

export default Dashboard
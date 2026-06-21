import { Button } from '@/common/ui/button'

const FloodHistory = () => {
  return (
    <>
        <div className='flex gap-2 items-center'>
            <Button variant="outline">Date Range</Button>
            <Button variant="outline">All Barangays</Button>
            <Button variant="outline">All Levels</Button>
            <Button variant="ghost">Clear</Button>
        </div>
    </>
  )
}

export default FloodHistory
import { Link } from 'react-router-dom'
import { Button } from '@/common/ui/button'

/** Lucide's cloud outline with an X inside it. */
const CloudX = ({ className }: { className?: string }) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={1.5}
    strokeLinecap='round'
    strokeLinejoin='round'
    className={className}
    aria-hidden
  >
    <path d='M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z' />
    <path d='m10 11.5 5 5' />
    <path d='m15 11.5-5 5' />
  </svg>
)

export default function NotFound() {
  return (
    <div className='flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center'>
      <CloudX className='size-24 text-muted-foreground opacity-40' />
      <h1 className='text-5xl font-bold'>404</h1>
      <p className='text-lg text-muted-foreground'>It seems that the thing that you are looking for is not here</p>
      <Button className='mt-2' render={<Link to='/' />}>
        Back to the dashboard
      </Button>
    </div>
  )
}

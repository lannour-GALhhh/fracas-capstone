import { Waves } from 'lucide-react'
import { FieldDescription } from '@/common/ui/field'

/** Centered card used by the standalone auth pages (activation, forgot/reset password). */
const AuthShell = ({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) => (
    <div className='flex min-h-screen w-full items-center justify-center bg-blue-950 p-2'>
        <div className='flex w-full max-w-sm flex-col gap-8 rounded-2xl bg-white p-8'>
            <div className='flex flex-col gap-3'>
                <span className='flex size-12 items-center justify-center rounded-xl bg-blue-950'>
                    <Waves className='size-6 text-blue-200' />
                </span>
                <div>
                    <h1 className='text-2xl font-bold tracking-tight text-blue-950'>{title}</h1>
                    <FieldDescription className='mt-1'>{subtitle}</FieldDescription>
                </div>
            </div>
            {children}
        </div>
    </div>
)

export default AuthShell

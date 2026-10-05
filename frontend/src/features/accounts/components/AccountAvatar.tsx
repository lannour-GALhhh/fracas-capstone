import { cn } from '@/common/utils/utils'

/** Each of the first 3 letters drives one RGB channel, kept in 50–180 so white text stays legible. */
const colorFromName = (name: string): string => {
    const [r, g, b] = [0, 1, 2].map((i) => {
        const code = (name.toLowerCase().charCodeAt(i) || 97) // pad short names with 'a'
        return 50 + ((code * 37 + i * 53) % 131)
    })
    return `rgb(${r}, ${g}, ${b})`
}

/** Round avatar: first letter of the first name on a colour derived from its first 3 letters. */
const AccountAvatar = ({ name, className }: { name: string; className?: string }) => (
    <div
        aria-hidden
        style={{ backgroundColor: colorFromName(name) }}
        className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white',
            className,
        )}
    >
        {name.charAt(0).toUpperCase()}
    </div>
)

export default AccountAvatar

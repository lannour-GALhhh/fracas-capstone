import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/common/ui/table'
import { Card } from '@/common/ui/card'
import { Input } from '@/common/ui/input'
import { Button } from '@/common/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/common/ui/select'
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/common/ui/pagination'
import { cn } from '@/common/utils/utils'
import { getPageItems } from '@/common/utils/pageItems'
import RoleBadge from '@/features/user/components/RoleBadge'
import UserActiveBadge, { STATUS_LABEL } from '@/features/user/components/UserActiveBadge'
import type { UserStatus } from '@/features/admin/types/user'
import AccountAvatar from './AccountAvatar'
import AccountRowActions from './AccountRowActions'
import { useAdminUsers } from '@/features/admin/hooks/useAdminUsers'
import type { ConsoleRole } from '@/features/admin/types/user'

const PAGE_SIZE = 25
const COLS = 8

/** Operator/admin accounts only; residents are excluded server-side. */
const UsersTable = () => {
    const navigate = useNavigate()
    const [search, setSearch] = useState('')
    const [role, setRole] = useState<ConsoleRole | 'all'>('all')
    const [status, setStatus] = useState<'all' | UserStatus>('all')
    const [page, setPage] = useState(1)

    const filters = {
        page,
        ...(search.trim() && { search: search.trim() }),
        ...(role !== 'all' && { role }),
        ...(status !== 'all' && { status }),
    }
    const { data, isLoading, isError } = useAdminUsers(filters)

    const users = data?.results ?? []
    const count = data?.count ?? 0
    const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))
    const start = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
    const end = Math.min(page * PAGE_SIZE, count)

    const goTo = (p: number) => setPage(Math.min(Math.max(1, p), totalPages))
    const resetTo = <T,>(setter: (v: T) => void) => (value: T) => {
        setter(value)
        setPage(1)
    }

    return (
        <div>
            <Card size='sm' className='my-4 flex flex-row items-center gap-2'>
                <Input
                    value={search}
                    onChange={(e) => resetTo(setSearch)(e.target.value)}
                    placeholder='Search name, username, email, phone…'
                    className='w-64'
                />

                <Select
                    value={role}
                    onValueChange={(v) => resetTo(setRole)(v as ConsoleRole | 'all')}
                >
                    <SelectTrigger className='w-36'>
                        <SelectValue>{(v) => (v === 'all' ? 'All roles' : v)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value='all'>All roles</SelectItem>
                        <SelectItem value='operator'>Operator</SelectItem>
                        <SelectItem value='admin'>Admin</SelectItem>
                    </SelectContent>
                </Select>

                <Select
                    value={status}
                    onValueChange={(v) => resetTo(setStatus)(v as 'all' | UserStatus)}
                >
                    <SelectTrigger className='w-36'>
                        <SelectValue>
                            {(v) => (v === 'all' ? 'All statuses' : STATUS_LABEL[v as UserStatus])}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value='all'>All statuses</SelectItem>
                        <SelectItem value='active'>Active</SelectItem>
                        <SelectItem value='pending'>Pending</SelectItem>
                        <SelectItem value='inactive'>Inactive</SelectItem>
                    </SelectContent>
                </Select>

                {(search.trim() || role !== 'all' || status !== 'all') && (
                    <Button
                        size='sm'
                        variant='ghost'
                        className='cursor-pointer text-black/50'
                        onClick={() => {
                            setSearch('')
                            setRole('all')
                            setStatus('all')
                            setPage(1)
                        }}
                    >
                        Clear
                    </Button>
                )}
            </Card>

            <Table className='rounded border border-border'>
                <TableHeader className='bg-accent'>
                    <TableRow>
                        <TableHead className='w-12 pr-0' aria-label='Avatar' />
                        <TableHead>Name</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Contact No.</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className='w-12 pl-0' aria-label='Actions' />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading && (
                        <TableRow>
                            <TableCell colSpan={COLS} className='text-black/50'>
                                Loading…
                            </TableCell>
                        </TableRow>
                    )}
                    {isError && (
                        <TableRow>
                            <TableCell colSpan={COLS} className='text-destructive'>
                                Couldn't load accounts.
                            </TableCell>
                        </TableRow>
                    )}
                    {!isLoading && !isError && users.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={COLS} className='text-black/50'>
                                No accounts match these filters.
                            </TableCell>
                        </TableRow>
                    )}
                    {users.map((u) => (
                        <TableRow
                            key={u.id}
                            className='cursor-pointer'
                            onClick={() => navigate(`/accounts/${u.id}`)}
                        >
                            <TableCell className='w-12 py-2 pr-0'>
                                <AccountAvatar name={u.first_name.trim() || u.username} />
                            </TableCell>
                            <TableCell className='py-2 font-medium'>
                                {`${u.first_name} ${u.last_name}`.trim() || u.username}
                            </TableCell>
                            <TableCell className='py-2 text-black/60'>{u.username}</TableCell>
                            <TableCell>
                                <RoleBadge role={u.role} />
                            </TableCell>
                            <TableCell className='py-2 text-black/60'>
                                {u.phone_number || '—'}
                            </TableCell>
                            <TableCell className='py-2 text-black/60'>{u.email || '—'}</TableCell>
                            <TableCell>
                                <UserActiveBadge isActive={u.is_active} status={u.status} />
                            </TableCell>
                            <TableCell className='w-12 py-2 pl-0' onClick={(e) => e.stopPropagation()}>
                                <AccountRowActions user={u} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell colSpan={2}>
                            <span className='text-sm font-light'>
                                {count === 0
                                    ? 'No records'
                                    : `Showing ${start}-${end} of ${count} account${count === 1 ? '' : 's'}`}
                            </span>
                        </TableCell>
                        <TableCell colSpan={COLS - 2}>
                            <Pagination>
                                <PaginationContent className='ml-auto'>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            className={cn(page === 1 && 'pointer-events-none opacity-50')}
                                            onClick={() => goTo(page - 1)}
                                        />
                                    </PaginationItem>
                                    {getPageItems(page, totalPages).map((item, i) =>
                                        item === 'ellipsis' ? (
                                            <PaginationItem key={`e${i}`}>
                                                <PaginationEllipsis />
                                            </PaginationItem>
                                        ) : (
                                            <PaginationItem key={item}>
                                                <PaginationLink
                                                    isActive={item === page}
                                                    onClick={() => goTo(item)}
                                                >
                                                    {item}
                                                </PaginationLink>
                                            </PaginationItem>
                                        ),
                                    )}
                                    <PaginationItem>
                                        <PaginationNext
                                            className={cn(
                                                page === totalPages && 'pointer-events-none opacity-50',
                                            )}
                                            onClick={() => goTo(page + 1)}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </div>
    )
}

export default UsersTable

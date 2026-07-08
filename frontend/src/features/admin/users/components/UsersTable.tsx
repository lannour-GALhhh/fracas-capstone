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
import UserActiveBadge from '@/features/user/components/UserActiveBadge'
import type { Role } from '@/common/types/Role'
import { useAdminUsers } from '../../hooks/useAdminUsers'

const PAGE_SIZE = 25
const COLS = 5

const UsersTable = () => {
    const navigate = useNavigate()
    const [search, setSearch] = useState('')
    const [role, setRole] = useState<Role | 'all'>('all')
    const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all')
    const [page, setPage] = useState(1)

    const filters = {
        page,
        ...(search.trim() && { search: search.trim() }),
        ...(role !== 'all' && { role }),
        ...(status !== 'all' && { is_active: status === 'active' }),
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

                <Select value={role} onValueChange={(v) => resetTo(setRole)(v as Role | 'all')}>
                    <SelectTrigger className='w-36'>
                        <SelectValue>{(v) => (v === 'all' ? 'All roles' : v)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value='all'>All roles</SelectItem>
                        <SelectItem value='resident'>Resident</SelectItem>
                        <SelectItem value='operator'>Operator</SelectItem>
                        <SelectItem value='admin'>Admin</SelectItem>
                    </SelectContent>
                </Select>

                <Select
                    value={status}
                    onValueChange={(v) => resetTo(setStatus)(v as 'all' | 'active' | 'inactive')}
                >
                    <SelectTrigger className='w-36'>
                        <SelectValue>
                            {(v) => (v === 'all' ? 'All statuses' : v === 'active' ? 'Active' : 'Inactive')}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value='all'>All statuses</SelectItem>
                        <SelectItem value='active'>Active</SelectItem>
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
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Joined</TableHead>
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
                            onClick={() => navigate(`/admin/users/${u.id}`)}
                        >
                            <TableCell className='font-medium'>
                                {`${u.first_name} ${u.last_name}`.trim() || u.username}
                                <span className='ml-2 text-xs font-normal text-black/40'>
                                    @{u.username}
                                </span>
                            </TableCell>
                            <TableCell>
                                <RoleBadge role={u.role} />
                            </TableCell>
                            <TableCell>
                                <UserActiveBadge isActive={u.is_active} />
                            </TableCell>
                            <TableCell className='text-black/60'>
                                {u.email || u.phone_number || '—'}
                            </TableCell>
                            <TableCell className='text-black/60'>
                                {new Date(u.date_joined).toLocaleDateString()}
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

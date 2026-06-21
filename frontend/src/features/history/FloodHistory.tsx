import { Button } from '@/common/ui/button'
import { Card } from '@/common/ui/card'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/common/ui/table'
import { ArrowRight, CalendarIcon, Download } from 'lucide-react'
import type { FloodType } from './types/FloodType'
import capitalize from '@/common/utils/capitalize'
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/common/ui/pagination'
import { Popover, PopoverContent, PopoverTrigger } from '@/common/ui/popover'
import React from 'react'
import type { DateRange } from 'react-day-picker'
import { addDays, format } from 'date-fns'
import { Calendar } from '@/common/ui/calendar'
import { useNavigate } from 'react-router-dom'

const FloodHistory = () => {

    const navigate = useNavigate();

    const [date, setDate] = React.useState<DateRange | undefined>({
        from: new Date(new Date().getFullYear(), 0, 20),
        to: addDays(new Date(new Date().getFullYear(), 0, 20), 20),
    })

    const floodData: FloodType[] = [
        {
            date: "2026-06-15",
            barangay: "Pasonanca",
            peak_risk: "low",
            duration: 4.5,
            peak_rainfall: 82.4,
            dam_level_peak: 14.2,
        },
        {
            date: "2026-06-14",
            barangay: "Tetuan",
            peak_risk: "medium",
            duration: 2.8,
            peak_rainfall: 56.7,
            dam_level_peak: 11.8,
        },
        {
            date: "2026-06-13",
            barangay: "Talon-Talon",
            peak_risk: "low",
            duration: 1.3,
            peak_rainfall: 24.5,
            dam_level_peak: 8.1,
        },
        {
            date: "2026-06-12",
            barangay: "Putik",
            peak_risk: "high",
            duration: 6.2,
            peak_rainfall: 97.3,
            dam_level_peak: 15.7,
        },
        {
            date: "2026-06-11",
            barangay: "Canelar",
            peak_risk: "medium",
            duration: 3.7,
            peak_rainfall: 63.9,
            dam_level_peak: 12.5,
        },
        {
            date: "2026-06-10",
            barangay: "Guiwan",
            peak_risk: "high",
            duration: 5.1,
            peak_rainfall: 88.6,
            dam_level_peak: 14.9,
        },
        {
            date: "2026-06-09",
            barangay: "Mercedes",
            peak_risk: "low",
            duration: 1.9,
            peak_rainfall: 31.2,
            dam_level_peak: 9.4,
        }
    ];

    const floodDataList = floodData.map((flood, index) => 
        <TableRow key={index}> 
            <TableCell>{flood.date}</TableCell>
            <TableCell className="w-100">{flood.barangay}</TableCell>
            <TableCell>{capitalize(flood.peak_risk)}</TableCell>
            <TableCell>{flood.duration} hours</TableCell>
            <TableCell>{flood.peak_rainfall} mm/hr</TableCell>
            <TableCell>{flood.dam_level_peak} meters</TableCell>
            <TableCell>
                <Button variant="secondary" size="xs" className="cursor-pointer" onClick={() => navigate(`/history/${index}`)}>View <ArrowRight /></Button>
            </TableCell>
        </TableRow>
    )

    return (
        <>  
            <div className='w-full p-4'>
                <div className='flex items-center justify-between'>
                    <div>
                        <h1 className='text-2xl font-semibold'>Flood History</h1>
                        <p className='text-xs text-black/50'>Descriptive history of flood records and flood-related incidents</p>
                    </div>
                    <Button variant="outline" size="sm" className="cursor-pointer"><Download />Export CSV</Button>
                </div>

                <Card size='sm' className='flex flex-row gap-2 items-center my-4'>
                    <Popover>
                        <PopoverTrigger render={<Button variant="outline" id="date-picker-range" className="justify-start px-2.5 font-normal"><CalendarIcon data-icon="inline-start" />{date?.from ? (
                            date.to ? (
                            <>
                                {format(date.from, "LLL dd, y")} - {" "}
                                {format(date.to, "LLL dd, y")}
                            </>
                            ) : (
                            format(date.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Pick a date</span>
                        )}</Button>} />
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={setDate}
                            numberOfMonths={2}
                        />
                        </PopoverContent>
                    </Popover>
                    <Button size="sm" variant="outline" className="cursor-pointer">All Barangays</Button>
                    <Button size="sm" variant="outline" className="cursor-pointer">All Risk Levels</Button>
                    <Button size="sm" variant="ghost" className="text-black/50 cursor-pointer">Clear</Button>
                </Card>

                <Table className='border-border border rounded'>
                    <TableHeader className='bg-accent'>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Barangay</TableHead>
                            <TableHead>Peak Risk</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Peak Rainfall</TableHead>
                            <TableHead>Dam Level Peak</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {floodDataList}
                    </TableBody>
                    <TableFooter>
                        <TableRow> 
                            <TableCell>
                                <h1 className='font-light text-sm'>
                                    Showing 1-5 of 24 records
                                </h1>
                            </TableCell>
                            <TableCell colSpan={7}>
                                <Pagination>
                                    <PaginationContent className='ml-auto'>
                                        <PaginationItem>
                                            <PaginationPrevious />
                                        </PaginationItem>
                                        <PaginationItem>
                                            <PaginationLink isActive>1</PaginationLink>
                                        </PaginationItem>
                                        <PaginationItem>
                                            <PaginationLink>2</PaginationLink>
                                        </PaginationItem>
                                        <PaginationItem>
                                            <PaginationLink>3</PaginationLink>
                                        </PaginationItem>
                                        <PaginationItem>
                                            <PaginationLink>4</PaginationLink>
                                        </PaginationItem>
                                        <PaginationItem>
                                            <PaginationLink>5</PaginationLink>
                                        </PaginationItem>
                                        <PaginationItem>
                                            <PaginationEllipsis />
                                        </PaginationItem>
                                        <PaginationItem>
                                            <PaginationLink>7</PaginationLink>
                                        </PaginationItem>
                                        <PaginationItem>
                                            <PaginationNext />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </>
    )
}

export default FloodHistory
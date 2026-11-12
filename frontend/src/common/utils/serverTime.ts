/** Times are shown in the backend's timezone (Asia/Manila), not the viewer's, so a
 *  forecast reads the same wherever it is opened. Keep in step with `TIME_ZONE` in backend settings. */
export const SERVER_TIME_ZONE = 'Asia/Manila'

const timeFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: SERVER_TIME_ZONE, hour: 'numeric', minute: '2-digit', hour12: true,
})
const dateFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: SERVER_TIME_ZONE, month: 'long', day: 'numeric', year: 'numeric', weekday: 'long',
})

/** e.g. "7:15 AM" */
export const formatServerTime = (date: Date) => timeFmt.format(date)

/** e.g. "November 10, 2026, Tuesday" */
export const formatServerDate = (date: Date) => {
    const p = Object.fromEntries(dateFmt.formatToParts(date).map((x) => [x.type, x.value]))
    return `${p.month} ${p.day}, ${p.year}, ${p.weekday}`
}

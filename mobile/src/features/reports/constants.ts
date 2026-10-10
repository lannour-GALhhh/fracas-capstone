import type { IconName } from '@/common/ui'

import type { ReportStatus } from './types'

export const MAX_PHOTOS = 6

export const STATUS_META: Record<ReportStatus, { label: string; icon: IconName; color: string }> = {
    pending: { label: 'Pending review', icon: 'time-outline', color: '#d97706' },
    verified: { label: 'Verified', icon: 'checkmark-circle-outline', color: '#059669' },
    rejected: { label: 'Rejected', icon: 'close-circle-outline', color: '#dc2626' },
}

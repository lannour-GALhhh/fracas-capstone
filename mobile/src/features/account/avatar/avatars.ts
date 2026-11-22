import type { ImageSourcePropType } from 'react-native'

export interface AvatarOption {
    id: string
    label: string
    source: ImageSourcePropType
}

export interface AvatarGroup {
    title: string
    options: AvatarOption[]
}

/** Bundled avatars, grouped by the two source sheets (4 each). */
export const AVATAR_GROUPS: AvatarGroup[] = [
    {
        title: 'Classic',
        options: [
            { id: 'sky', label: 'Sky', source: require('../../../../assets/images/avatar/sky.png') },
            { id: 'mint', label: 'Mint', source: require('../../../../assets/images/avatar/mint.png') },
            { id: 'sand', label: 'Sand', source: require('../../../../assets/images/avatar/sand.png') },
            { id: 'lilac', label: 'Lilac', source: require('../../../../assets/images/avatar/lilac.png') },
        ],
    },
    {
        title: 'Weather',
        options: [
            { id: 'sunny', label: 'Sunny', source: require('../../../../assets/images/avatar/sunny.png') },
            { id: 'stormy', label: 'Stormy', source: require('../../../../assets/images/avatar/stormy.png') },
            { id: 'rainy', label: 'Rainy', source: require('../../../../assets/images/avatar/rainy.png') },
            { id: 'cloudy', label: 'Cloudy', source: require('../../../../assets/images/avatar/cloudy.png') },
        ],
    },
]

const BY_ID = new Map(AVATAR_GROUPS.flatMap((g) => g.options).map((o) => [o.id, o]))

export const getAvatar = (id: string | null): AvatarOption | undefined =>
    id ? BY_ID.get(id) : undefined

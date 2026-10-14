import { Image } from 'expo-image'
import { memo } from 'react'
import { StyleSheet } from 'react-native'

/**
 * Static dotted map of Zamboanga City's barangays — a pre-rendered image, so it costs nothing at
 * runtime. Regenerate with `python3 scripts/render_login_map.py`.
 */
function CityMapBackgroundBase() {
    return (
        <Image
            source={require('../../../../assets/images/login-map.png')}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            pointerEvents="none"
        />
    )
}

export const CityMapBackground = memo(CityMapBackgroundBase)

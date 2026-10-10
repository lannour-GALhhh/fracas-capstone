import * as ImagePicker from 'expo-image-picker'
import { useCallback, useState } from 'react'

import { MAX_PHOTOS } from '../constants'
import type { PickedPhoto } from '../types'

const toPhoto = (asset: ImagePicker.ImagePickerAsset, index: number): PickedPhoto => ({
    uri: asset.uri,
    name: asset.fileName ?? `report-${Date.now()}-${index}.jpg`,
    type: asset.mimeType ?? 'image/jpeg',
})

/** Camera + gallery picking, capped at MAX_PHOTOS. Returns an error string on denial. */
export function usePhotoPicker() {
    const [photos, setPhotos] = useState<PickedPhoto[]>([])

    const add = useCallback((assets: ImagePicker.ImagePickerAsset[]) => {
        setPhotos((prev) => [...prev, ...assets.map(toPhoto)].slice(0, MAX_PHOTOS))
    }, [])

    const fromGallery = useCallback(async (): Promise<string | null> => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!perm.granted) return 'Photo access is needed to attach pictures.'
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: MAX_PHOTOS,
            quality: 0.7,
        })
        if (!result.canceled) add(result.assets)
        return null
    }, [add])

    const fromCamera = useCallback(async (): Promise<string | null> => {
        const perm = await ImagePicker.requestCameraPermissionsAsync()
        if (!perm.granted) return 'Camera access is needed to take a photo.'
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 })
        if (!result.canceled) add(result.assets)
        return null
    }, [add])

    const remove = useCallback((index: number) => setPhotos((p) => p.filter((_, i) => i !== index)), [])
    const clear = useCallback(() => setPhotos([]), [])

    return { photos, fromGallery, fromCamera, remove, clear }
}

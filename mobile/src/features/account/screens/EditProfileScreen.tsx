import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { ErrorState } from '@/common/components/ErrorState'
import { useZodForm } from '@/common/hooks/useZodForm'
import { spacing } from '@/common/theme'
import { Button, Field, Screen, Spinner, Text } from '@/common/ui'
import { apiErrorMessage } from '@/common/utils/apiError'
import { AddressPicker } from '@/features/registration/components/AddressPicker'
import type { RegistrationAddress } from '@/features/registration/types'

import { useCurrentUser } from '../hooks/useCurrentUser'
import { useUpdateProfile } from '../hooks/useAccountMutations'
import { profileSchema } from '../schemas'
import type { CurrentUser, ProfileUpdate, UserAddress } from '../types'

/** The permanent-address keys `AddressPicker` reads/writes; the rest round-trip. */
const toPickerValue = (address: UserAddress): RegistrationAddress => ({
    unit: address.unit,
    province: address.province,
    province_code: address.province_code,
    city: address.city,
    city_code: address.city_code,
    barangay: address.barangay,
    barangay_code: address.barangay_code,
    zip_code: address.zip_code,
})

/** Editable form, mounted once the profile has loaded so state seeds cleanly. */
function ProfileForm({ user }: { user: CurrentUser }) {
    const update = useUpdateProfile()
    const [firstName, setFirstName] = useState(user.first_name)
    const [lastName, setLastName] = useState(user.last_name)
    const [email, setEmail] = useState(user.email)
    const [address, setAddress] = useState<UserAddress>(user.address)

    const { fieldError, onBlur, handleSubmit } = useZodForm(profileSchema, {
        first_name: firstName,
        last_name: lastName,
        email,
        zip_code: address.zip_code,
    })

    // AddressPicker emits the picker subset; merge it over the full blob so
    // country/codes we don't edit here survive the round-trip.
    const onAddressChange = (patch: RegistrationAddress) =>
        setAddress((prev) => ({ ...prev, ...patch }))

    const onSubmit = handleSubmit(() => {
        const payload: ProfileUpdate = {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: email.trim(),
            address: { ...address, zip_code: address.zip_code.trim() },
        }
        update.mutate(payload, { onSuccess: () => router.back() })
    })

    return (
        <View style={styles.form}>
            <View style={styles.names}>
                <View style={styles.half}>
                    <Field
                        label="First name"
                        value={firstName}
                        onChangeText={setFirstName}
                        onBlur={onBlur('first_name')}
                        errors={fieldError('first_name')}
                    />
                </View>
                <View style={styles.half}>
                    <Field
                        label="Last name"
                        value={lastName}
                        onChangeText={setLastName}
                        onBlur={onBlur('last_name')}
                        errors={fieldError('last_name')}
                    />
                </View>
            </View>

            <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                onBlur={onBlur('email')}
                errors={fieldError('email')}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
            />

            {/* Login username IS the phone number, so it isn't self-editable here. */}
            {user.phone_number ? (
                <View style={styles.readonly}>
                    <Text variant="label">Phone number</Text>
                    <Text variant="body" color="textMuted">
                        {user.phone_number}
                    </Text>
                    <Text variant="caption" color="textMuted">
                        You sign in with this number. Contact your barangay to change it.
                    </Text>
                </View>
            ) : null}

            <AddressPicker value={toPickerValue(address)} onChange={onAddressChange} />

            <Field
                label="ZIP code (optional)"
                value={address.zip_code}
                onChangeText={(zip_code) => setAddress((prev) => ({ ...prev, zip_code }))}
                onBlur={onBlur('zip_code')}
                errors={fieldError('zip_code')}
                placeholder="7000"
                keyboardType="number-pad"
            />

            {update.isError ? (
                <Text variant="caption" color="danger">
                    {apiErrorMessage(update.error, "Couldn't save your changes. Please try again.")}
                </Text>
            ) : null}

            <Button label="Save changes" onPress={onSubmit} loading={update.isPending} />
        </View>
    )
}

/** Edit-profile route target: name, email and permanent address. */
export function EditProfileScreen() {
    const { data, isLoading, isError, refetch } = useCurrentUser()

    return (
        <Screen edges={['bottom']}>
            <Button
                label="‹ Back"
                variant="ghost"
                onPress={() => router.back()}
                style={styles.back}
            />
            <Text variant="title" style={styles.title}>
                Edit profile
            </Text>

            {isLoading ? (
                <Spinner />
            ) : isError || !data ? (
                <ErrorState
                    title="Can't load your profile"
                    message="We couldn't load your account. Try again in a moment."
                    onRetry={refetch}
                />
            ) : (
                <ProfileForm user={data} />
            )}
        </Screen>
    )
}

const styles = StyleSheet.create({
    back: { alignSelf: 'flex-start', minHeight: 36, paddingHorizontal: 0 },
    title: { marginBottom: spacing.lg },
    form: { gap: spacing.lg },
    names: { flexDirection: 'row', gap: spacing.md },
    half: { flex: 1 },
    readonly: { gap: spacing.xs },
})

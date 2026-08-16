import type { LegalDocument } from '../types'

/**
 * Terms of Use + Privacy Policy shown at registration.
 *
 * Bundled as data (not a remote fetch) so the documents are always readable —
 * including offline, and before the resident has an account to authenticate
 * with. Both are versioned by `effective`: bump it whenever the wording changes
 * materially, since a resident's acceptance is against a specific version.
 *
 * TODO(legal): the operator name, contact addresses, and retention periods
 * below are placeholders. Have the city DRRMO and its Data Protection Officer
 * review and replace them before a public release.
 */

const OPERATOR = 'the FRACAS operations team of the Zamboanga City disaster risk reduction and management office'
const SUPPORT_EMAIL = 'support@fracas.example.ph'
const DPO_EMAIL = 'dpo@fracas.example.ph'
const EFFECTIVE = 'Version 1.0 · Effective 16 August 2026'

export const TERMS_OF_USE: LegalDocument = {
    id: 'terms',
    title: 'Terms of Use',
    effective: EFFECTIVE,
    intro: `These terms are the agreement between you and ${OPERATOR} ("we", "us") for your use of the FRACAS mobile app. Please read them before you create an account.`,
    sections: [
        {
            heading: 'Accepting these terms',
            body: [
                'By ticking the Terms of Use box and creating an account, you confirm that you have read these terms and agree to be bound by them.',
                'If you do not agree, do not create an account. You can still seek flood information from your barangay hall, the city DRRMO, and PAGASA through their usual channels.',
            ],
        },
        {
            heading: 'What FRACAS is — and what it is not',
            body: [
                'FRACAS estimates flood hazard for each barangay in Zamboanga City from rainfall data and local terrain, and sends you an alert when the barangay you are registered in reaches a high or critical level.',
                'It is a decision-support tool, not a guarantee. Estimates are computed from models and third-party data that can be wrong, late, or unavailable, and conditions on the ground can change faster than any model.',
            ],
            bullets: [
                'Official advisories and evacuation orders from PAGASA, the NDRRMC, the city DRRMO, and your barangay officials always take precedence over anything shown in this app.',
                'A low or medium reading is never an instruction to stay. If you see rising water, move to higher ground.',
                'Never delay evacuation while waiting for an alert to arrive.',
            ],
        },
        {
            heading: 'Your account',
            body: [
                'Your mobile number is your login. One account per mobile number, and the number must be one you actually control — it is where your alerts are sent.',
                'If you are under 18, register with the knowledge and consent of a parent or guardian.',
                'Keep your password to yourself. You are responsible for activity done through your account. Tell us at once if you think someone else has access to it, or if you give up the mobile number.',
            ],
        },
        {
            heading: 'Your responsibilities',
            bullets: [
                'Give an accurate home address. Your alerts are targeted by barangay, so a wrong address means alerts for the wrong place.',
                'Update your address when you move, and keep your notification settings switched on.',
                'Do not treat the app as your only warning channel — keep a radio, a charged phone, and your barangay contacts available.',
                'Submit only truthful flood reports. False reports waste responder time during an emergency and may be dealt with under applicable law.',
            ],
        },
        {
            heading: 'Alerts and messages',
            body: [
                'Alerts are delivered as push notifications and, where enabled, SMS. Delivery depends on your device, your notification permissions, mobile signal, and your network operator — none of which we control.',
                'Messages may be delayed, duplicated, or not arrive at all. Standard carrier charges for received SMS, if any, are between you and your network operator.',
                'You may opt out of non-emergency messages in your account settings. Emergency alerts for a critical barangay may still be sent while your account is active.',
            ],
        },
        {
            heading: 'Acceptable use',
            bullets: [
                'Do not impersonate another resident, a responder, or an official.',
                'Do not submit false, misleading, or malicious reports.',
                'Do not attempt to break, overload, scrape in bulk, or gain unauthorized access to the service or its data.',
                'Do not use the app for anything unlawful, or in a way that interferes with disaster response.',
            ],
        },
        {
            heading: 'Reports and content you submit',
            body: [
                'When you submit a flood report, photo, or comment, you allow us to store it and share it with responders and barangay officials so they can verify and act on it.',
                'We may edit, withhold, or remove any submission — for example, one that is unverifiable, duplicated, or contains personal information about someone else.',
            ],
        },
        {
            heading: 'Availability and changes to the service',
            body: [
                'The service may be interrupted by maintenance, outages at our data sources, network problems, or events beyond our control. We do not promise uninterrupted or error-free operation.',
                'We may add, change, or withdraw features, including the scoring model, as the system is improved.',
            ],
        },
        {
            heading: 'Limitation of liability',
            body: [
                'To the fullest extent allowed by Philippine law, the service is provided "as is" and we are not liable for loss or damage arising from your reliance on it, from an alert that was late or never arrived, or from an estimate that turned out to be wrong.',
                'Nothing in these terms limits liability that cannot be limited by law.',
            ],
        },
        {
            heading: 'Suspension and closing your account',
            body: [
                'We may suspend or close an account that breaks these terms or that is being used to disrupt emergency operations.',
                'You may close your account at any time from your account settings. Closing it stops your alerts.',
            ],
        },
        {
            heading: 'Changes to these terms',
            body: [
                'We may update these terms. When we do, we will raise the version shown above and notify you in the app. Continuing to use FRACAS after an update means you accept the revised terms.',
            ],
        },
        {
            heading: 'Governing law',
            body: [
                'These terms are governed by the laws of the Republic of the Philippines. Any dispute will be brought before the proper courts of Zamboanga City.',
            ],
        },
        {
            heading: 'Contact',
            body: [`Questions about these terms: ${SUPPORT_EMAIL}.`],
        },
    ],
}

export const PRIVACY_POLICY: LegalDocument = {
    id: 'privacy',
    title: 'Privacy Policy',
    effective: EFFECTIVE,
    intro: `This policy explains what personal data FRACAS collects, why we need it, and what rights you have over it under the Data Privacy Act of 2012 (Republic Act No. 10173).`,
    sections: [
        {
            heading: 'Who handles your data',
            body: [
                `${OPERATOR} is the personal information controller for FRACAS. Our Data Protection Officer can be reached at ${DPO_EMAIL}.`,
            ],
        },
        {
            heading: 'What we collect',
            bullets: [
                'Account details — your mobile number, the one-time codes used to verify it, your password (stored only as a cryptographic hash), and a display name if you provide one.',
                'Home address — province, city, and barangay (PSGC codes), plus optional unit or house number and ZIP code. The barangay is what your alerts are targeted on.',
                'Location, only if you allow it — a one-off GPS fix when you use "use my current location" during registration, and coarse position when a feature you open needs it, such as finding the nearest evacuation center.',
                'Device details — a push notification token, device model, OS version, and app version, so notifications reach the right device.',
                'Reports you submit — flood reports, any photos attached, and the location and time they refer to.',
                'Technical logs — request timestamps, IP address, and error diagnostics, kept for security and troubleshooting.',
            ],
        },
        {
            heading: 'Why we use it',
            bullets: [
                'To send you flood alerts for your barangay and, where relevant, evacuation guidance.',
                'To compute and display hazard levels, and to point you to the nearest open evacuation center.',
                'To verify your number, keep your account secure, and prevent abuse of the service.',
                'To pass verified reports to responders and barangay officials during an incident.',
                'To improve the accuracy of the flood model and produce statistics for disaster planning. Data used this way is aggregated and does not identify you.',
            ],
        },
        {
            heading: 'Our legal basis',
            body: [
                'We process most of your data on the basis of the consent you give when you register and when you grant location or notification permissions.',
                'During an actual emergency we may also process data to protect life and health, and to allow a public authority to carry out its disaster risk reduction mandate — both recognised bases under the Data Privacy Act.',
            ],
        },
        {
            heading: 'Location data in particular',
            body: [
                'Precise location is never collected in the background without your knowledge. It is requested at the moment a feature needs it, and you can refuse — registration works with a manually chosen address.',
                'You can withdraw the permission at any time in your device settings. Alerts will keep working, because they are based on your registered barangay rather than on live location.',
            ],
        },
        {
            heading: 'Who we share it with',
            bullets: [
                'Barangay and city disaster responders — your barangay, and the details of any report you submit, so they can act on it.',
                'Service providers acting on our instructions — the SMS gateway and push notification service that deliver your alerts, and our hosting provider. They may only use the data to provide that service.',
                'Authorities, when we are legally compelled to disclose, or when disclosure is necessary to protect life during an emergency.',
            ],
            body: ['We do not sell your personal data, and we do not use it for advertising.'],
        },
        {
            heading: 'How long we keep it',
            bullets: [
                'Account and address data — while your account is active, and for one year after you close it, so an account can be recovered and to meet audit requirements.',
                'Reports and alert records — retained as part of the disaster response record, after which they are anonymised for statistics.',
                'Technical logs — around 90 days.',
                'One-time verification codes — minutes, then discarded.',
            ],
        },
        {
            heading: 'How we protect it',
            body: [
                'Traffic between the app and our servers is encrypted in transit. Passwords are stored as salted hashes and never in plain text. Access to resident data is restricted to authorised operators and logged.',
                'No system is perfectly secure. If a breach occurs that puts you at real risk, we will notify you and the National Privacy Commission as the law requires.',
            ],
        },
        {
            heading: 'Your rights',
            body: ['Under the Data Privacy Act you have the right to:'],
            bullets: [
                'Be informed about how your data is processed.',
                'Access the data we hold about you, and get a copy in a portable format.',
                'Correct anything inaccurate, such as a wrong barangay.',
                'Object to processing, or withdraw your consent — noting that withdrawing it stops your flood alerts.',
                'Have your data erased or blocked where the law allows it.',
                'Be indemnified for damage caused by inaccurate or unlawfully obtained data.',
                'Complain to the National Privacy Commission if you believe your rights have been violated.',
            ],
        },
        {
            heading: 'Exercising your rights',
            body: [
                `Most changes — address, notification settings, closing your account — can be made in the app. For anything else, write to ${DPO_EMAIL}. We will respond within the period set by law, and we may ask you to verify your identity first.`,
            ],
        },
        {
            heading: 'Children',
            body: [
                'FRACAS is meant for the general public, including households. A resident under 18 should register with the consent of a parent or guardian, and we collect no more from them than from anyone else.',
            ],
        },
        {
            heading: 'Changes to this policy',
            body: [
                'If we change how we use your data, we will raise the version shown above and tell you in the app before the change takes effect.',
            ],
        },
        {
            heading: 'Contact',
            body: [
                `Data Protection Officer: ${DPO_EMAIL}. General support: ${SUPPORT_EMAIL}.`,
            ],
        },
    ],
}

export const LEGAL_DOCUMENTS = {
    terms: TERMS_OF_USE,
    privacy: PRIVACY_POLICY,
} as const

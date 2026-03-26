'use client'

import { useState, useCallback, useEffect } from 'react'
import { getTemplateScenes } from '@/templates/registry'

interface TemplateRowProps {
	slug: string
	name: string
	description: string
}

const SAMPLE_BG = '/sample-bg.jpg'

const sampleDataMap: Record<string, Record<string, string>> = {
	welcome: {
		backgroundImageUrl: SAMPLE_BG,
		guestName: 'Sarah & James',
		welcomeMessage: 'Welcome to your home away from home!',
		wifiSsid: 'GuestWiFi',
		wifiPassword: 'welcome2024',
	},
	'hotel-welcome': {
		backgroundImageUrl: SAMPLE_BG,
		guestName: 'The Johnsons',
		subtitle: 'Welcome to your stay',
		wifiSsid: 'Hotel_Guest',
		wifiPassword: 'staywithus',
	},
	'house-guide': {
		backgroundImageUrl: SAMPLE_BG,
		wifiSsid: 'Lakehouse_WiFi',
		wifiPassword: 'lakelife2024',
		infoText:
			'## House Rules\n\n- **Check-out** by 11:00 AM\n- No smoking indoors\n- Please be mindful of neighbors\n\n## Amenities\n\n- Pool towels in the closet\n- BBQ grill on the patio\n- Board games in the living room',
	},
	'daily-agenda': {
		backgroundImageUrl: SAMPLE_BG,
		headerText: "Today's Schedule",
		date: 'Wednesday, March 26',
		item1Time: '7:00 AM',
		item1Title: 'Breakfast Buffet',
		item1Description: 'Grand Ballroom — complimentary for all guests',
		item2Time: '10:00 AM',
		item2Title: 'Pool & Spa Open',
		item2Description: 'Rooftop level — towels provided',
		item3Time: '2:00 PM',
		item3Title: 'Wine Tasting',
		item3Description: 'Garden terrace — reservations required',
		item4Time: '7:00 PM',
		item4Title: 'Live Jazz Night',
		item4Description: 'Lobby lounge — complimentary',
		footerText: 'Ask the concierge for more details',
	},
	'local-info': {
		backgroundImageUrl: SAMPLE_BG,
		headerText: 'Explore the Area',
		layout: 'photo-right',
		title1: 'Downtown Historic District',
		description1: 'Just 10 minutes away. Explore charming shops, galleries, and award-winning restaurants along cobblestone streets.',
		title2: 'Oceanfront Boardwalk',
		description2: 'A scenic 2-mile walk with ocean views, local vendors, and family-friendly activities.',
	},
	amenities: {
		backgroundImageUrl: SAMPLE_BG,
		headerText: 'Hotel Amenities',
		amenity1Name: 'Swimming Pool',
		amenity1Hours: '6:00 AM — 10:00 PM',
		amenity1Details: 'Heated rooftop pool with city views',
		amenity1Icon: 'pool',
		amenity2Name: 'Fitness Center',
		amenity2Hours: '24 Hours',
		amenity2Details: 'Full equipment, free weights, yoga mats',
		amenity2Icon: 'gym',
		amenity3Name: 'Spa & Wellness',
		amenity3Hours: '9:00 AM — 8:00 PM',
		amenity3Details: 'Massages, facials, and sauna',
		amenity3Icon: 'spa',
		amenity4Name: 'Business Center',
		amenity4Hours: '24 Hours',
		amenity4Details: 'Printing, scanning, private meeting rooms',
		amenity4Icon: 'business',
	},
	checkout: {
		backgroundImageUrl: SAMPLE_BG,
		headerText: 'Checkout Information',
		checkoutTime: '11:00 AM',
		lateCheckout: 'Available upon request — subject to availability. Contact the front desk by 9:00 AM.',
		expressCheckout: 'Drop your key card at the front desk kiosk for express checkout.',
		luggageStorage: 'Complimentary luggage storage available at the bell desk after checkout.',
		contactNumber: 'Ext. 0 or (555) 123-4567',
		additionalInfo: 'We hope you enjoyed your stay!\nPlease leave a review on your booking platform.',
	},
	'contact-directory': {
		backgroundImageUrl: SAMPLE_BG,
		headerText: 'Guest Services Directory',
		contact1Label: 'Front Desk',
		contact1Number: 'Ext. 0',
		contact2Label: 'Concierge',
		contact2Number: 'Ext. 100',
		contact3Label: 'Room Service',
		contact3Number: 'Ext. 200',
		contact4Label: 'Housekeeping',
		contact4Number: 'Ext. 300',
		contact5Label: 'Maintenance',
		contact5Number: 'Ext. 400',
		contact6Label: 'Valet Parking',
		contact6Number: 'Ext. 500',
		footerText: 'Dial 9 for an outside line',
	},
	'emergency-info': {
		backgroundImageUrl: SAMPLE_BG,
		headerText: 'Emergency Information',
		emergencyNumber: '911',
		frontDesk: 'Ext. 0 (24 hours)',
		security: 'Ext. 555',
		nearestHospital: 'City General — 0.8 miles north on Main St.',
		nearestPharmacy: 'CVS Pharmacy — 0.3 miles east on 2nd Ave.',
		fireSafety:
			'**Fire exits** are located at both ends of each hallway.\n\nIn case of fire:\n- Do not use elevators\n- Proceed to the nearest stairwell\n- Meet at the front parking lot',
		additionalInfo: 'AED units are located in the lobby and on each even-numbered floor.',
	},
}

export function TemplateRow({ slug, name, description }: TemplateRowProps) {
	const entry = getTemplateScenes(slug)
	const Scene = entry?.scene
	const [showPreview, setShowPreview] = useState(false)

	const handleClose = useCallback(() => setShowPreview(false), [])

	useEffect(() => {
		if (!showPreview) return
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') handleClose()
		}
		document.addEventListener('keydown', handleKey)
		return () => document.removeEventListener('keydown', handleKey)
	}, [showPreview, handleClose])

	const sampleData = sampleDataMap[slug] ?? {}

	return (
		<>
			<div className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
				{/* Preview thumbnail */}
				<div className="h-[54px] w-24 shrink-0 overflow-hidden rounded bg-slate-950">
					{Scene && (
						<div style={{ width: 1920, height: 1080, transform: 'scale(0.05)', transformOrigin: 'top left' }}>
							<Scene data={sampleData} />
						</div>
					)}
				</div>
				<div className="min-w-0 flex-1">
					<p className="font-medium text-white">{name}</p>
					{description && <p className="mt-0.5 text-sm text-slate-400">{description}</p>}
				</div>
				<div className="flex shrink-0 gap-2">
					<button
						onClick={() => setShowPreview(true)}
						className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-slate-500 hover:bg-slate-800 hover:text-white"
					>
						Preview
					</button>
					<a
						href={`/clips/new?template=${slug}`}
						className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
					>
						Use Template
					</a>
				</div>
			</div>

			{/* Preview Modal */}
			{showPreview && Scene && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={handleClose}>
					<div className="relative w-full max-w-6xl px-4" onClick={e => e.stopPropagation()}>
						{/* Header */}
						<div className="mb-3 flex items-center justify-between">
							<div>
								<h3 className="text-lg font-semibold text-white">{name}</h3>
								<p className="text-sm text-slate-400">Preview with sample data</p>
							</div>
							<div className="flex items-center gap-3">
								<a
									href={`/clips/new?template=${slug}`}
									className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
								>
									Use Template
								</a>
								<button
									onClick={handleClose}
									className="rounded-lg border border-slate-700 p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
								>
									<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
										<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</div>
						</div>
						{/* 16:9 preview container */}
						<div
							className="relative overflow-hidden rounded-xl border border-slate-700 bg-black shadow-2xl"
							style={{ aspectRatio: '16/9' }}
						>
							<div
								style={{
									width: 1920,
									height: 1080,
									transform: 'scale(var(--preview-scale))',
									transformOrigin: 'top left',
									['--preview-scale' as string]: '1',
								}}
								className="preview-scene"
								ref={el => {
									if (el) {
										const parent = el.parentElement
										if (parent) {
											const scale = parent.clientWidth / 1920
											el.style.setProperty('--preview-scale', String(scale))
											el.style.transform = `scale(${scale})`
										}
									}
								}}
							>
								<Scene data={sampleData} />
							</div>
						</div>
					</div>
				</div>
			)}
		</>
	)
}

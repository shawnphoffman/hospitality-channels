'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { getTemplateScenes } from '@/templates/registry'

const SCENE_W = 1920
const SCENE_H = 1080

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
		qrCodeValue: 'WIFI:T:WPA;S:Lakehouse_WiFi;P:lakelife2024;;',
		qrCodeLabel: 'Lakehouse WiFi',
		infoText:
			'## House Rules\n- **Check-out** by 11:00 AM\n- No smoking indoors\n- Please be mindful of neighbors\n## Amenities\n- Pool towels in the closet\n- BBQ grill on the patio\n- Board games in the living room',
	},
	'house-guide-image-left': {
		backgroundImageUrl: SAMPLE_BG,
		infoImageUrl: SAMPLE_BG,
		qrCodeValue: 'WIFI:T:WPA;S:Lakehouse_WiFi;P:lakelife2024;;',
		qrCodeLabel: 'Lakehouse WiFi',
		infoText:
			'## House Rules\n- **Check-out** by 11:00 AM\n- No smoking indoors\n- Please be mindful of neighbors\n## Amenities\n- Pool towels in the closet\n- BBQ grill on the patio\n- Board games in the living room',
	},
	'house-guide-image-right': {
		backgroundImageUrl: SAMPLE_BG,
		infoImageUrl: SAMPLE_BG,
		qrCodeValue: 'WIFI:T:WPA;S:Lakehouse_WiFi;P:lakelife2024;;',
		qrCodeLabel: 'Lakehouse WiFi',
		infoText:
			'## House Rules\n- **Check-out** by 11:00 AM\n- No smoking indoors\n- Please be mindful of neighbors\n## Amenities\n- Pool towels in the closet\n- BBQ grill on the patio\n- Board games in the living room',
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
		headerText: 'Contact Information',
		contact1Label: 'Front Desk',
		contact1Number: '(555) 234-5678',
		contact2Label: 'Concierge',
		contact2Number: '(555) 234-5679',
		contact3Label: 'Room Service',
		contact3Number: '(555) 234-5680',
		contact4Label: 'Housekeeping',
		contact4Number: '(555) 234-5681',
		contact5Label: 'Maintenance',
		contact5Number: '(555) 234-5682',
		contact6Label: 'Valet Parking',
		contact6Number: '(555) 234-5683',
		footerText: 'Available 24 hours a day',
	},
}

export function TemplateRow({ slug, name, description }: TemplateRowProps) {
	const entry = getTemplateScenes(slug)
	const Scene = entry?.scene
	const [showPreview, setShowPreview] = useState(false)
	const modalWrapperRef = useRef<HTMLDivElement>(null)
	const [modalScale, setModalScale] = useState(0)

	const handleClose = useCallback(() => {
		setShowPreview(false)
		setModalScale(0)
	}, [])

	const recalcModalScale = useCallback(() => {
		const el = modalWrapperRef.current
		if (!el) return
		const s = el.clientWidth / SCENE_W
		setModalScale(Math.max(s, 0.05))
	}, [])

	useEffect(() => {
		if (!showPreview) return
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') handleClose()
		}
		document.addEventListener('keydown', handleKey)
		// Compute scale once modal is open and laid out
		requestAnimationFrame(recalcModalScale)
		window.addEventListener('resize', recalcModalScale)
		return () => {
			document.removeEventListener('keydown', handleKey)
			window.removeEventListener('resize', recalcModalScale)
		}
	}, [showPreview, handleClose, recalcModalScale])

	const sampleData = sampleDataMap[slug] ?? {}
	const scaledW = Math.round(SCENE_W * modalScale)
	const scaledH = Math.round(SCENE_H * modalScale)

	return (
		<>
			<div className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
				{/* Preview thumbnail */}
				<div className="h-[108px] w-48 shrink-0 overflow-hidden rounded bg-slate-950">
					{Scene && (
						<div style={{ width: 1920, height: 1080, transform: 'scale(0.1)', transformOrigin: 'top left' }}>
							<Scene data={sampleData} />
						</div>
					)}
				</div>
				<div className="min-w-0 flex-1">
					<p className="font-medium text-white">{name}</p>
					{description && <p className="mt-0.5 text-sm text-slate-400">{description}</p>}
				</div>
				<div className="flex shrink-0 flex-col gap-2">
					<button
						onClick={() => setShowPreview(true)}
						className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-slate-500 hover:bg-slate-800 hover:text-white"
					>
						Preview
					</button>
					<Link
						href={`/clips/new?template=${slug}`}
						className="rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-500"
					>
						Use Template
					</Link>
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
								<Link
									href={`/clips/new?template=${slug}`}
									className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
								>
									Use Template
								</Link>
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
						<div ref={modalWrapperRef} className="overflow-hidden rounded-xl border border-slate-700 bg-black shadow-2xl">
							{modalScale > 0 && (
								<div style={{ width: scaledW, height: scaledH }} className="relative overflow-hidden">
									<div
										style={{ width: SCENE_W, height: SCENE_H, transform: `scale(${modalScale})`, transformOrigin: 'top left' }}
										className="absolute left-0 top-0"
									>
										<div className="absolute inset-0 overflow-hidden">
											<Scene data={sampleData} />
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</>
	)
}

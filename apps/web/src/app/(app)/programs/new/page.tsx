export const dynamic = 'force-dynamic'

import { NewProgramForm } from './form'

export default function NewProgramPage() {
	return (
		<div>
			<h2 className="mb-6 text-2xl font-bold text-white">New Program</h2>
			<NewProgramForm />
		</div>
	)
}

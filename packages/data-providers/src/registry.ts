import type { DataProvider } from './types.js'
import { weatherProvider } from './weather/open-meteo.js'

const providers: DataProvider[] = [weatherProvider as DataProvider]

const providerRegistry = new Map<string, DataProvider>(providers.map(p => [p.id, p]))

/** Returns the provider for an id, or undefined if unknown. */
export function getProvider(id: string): DataProvider | undefined {
	return providerRegistry.get(id)
}

/** All registered providers, for listing in the editor UI. */
export function listProviders(): DataProvider[] {
	return providers
}

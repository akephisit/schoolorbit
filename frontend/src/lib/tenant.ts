export function getSchoolByDomain(host: string): { schoolId: string; name: string } {
	// For development, always return demo school
	if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
		return {
			schoolId: '00000000-0000-0000-0000-000000000001',
			name: 'Demo School'
		};
	}

	// In production, you'd query the meta database or have a mapping
	// For now, just return demo
	return {
		schoolId: '00000000-0000-0000-0000-000000000001',
		name: 'Demo School'
	};
}

export function getBranding(schoolId: string) {
	// Stub branding configuration
	return {
		name: 'SchoolOrbit',
		logo: null,
		primaryColor: '#3b82f6',
		secondaryColor: '#64748b',
		theme: 'light'
	};
}
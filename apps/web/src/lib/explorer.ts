import type { Location, Note, UserMark, BlockRange } from '@jw-notes-sync/core';

export function buildLocationMap(locations: Location[]): Map<number, Location> {
	const map = new Map<number, Location>();
	for (const loc of locations) {
		map.set(loc.LocationId, loc);
	}
	return map;
}

export function getLocationLabel(loc: Location | undefined): string {
	if (!loc) return '';
	return loc.Title ?? loc.KeySymbol ?? '';
}

export interface LocationGroup<T> {
	location: Location | undefined;
	label: string;
	items: T[];
}

export function groupByLocation<T>(
	items: T[],
	getLocationId: (item: T) => number | null,
	locationMap: Map<number, Location>,
): LocationGroup<T>[] {
	const groups = new Map<number | null, T[]>();

	for (const item of items) {
		const locId = getLocationId(item);
		const existing = groups.get(locId);
		if (existing) {
			existing.push(item);
		} else {
			groups.set(locId, [item]);
		}
	}

	const result: LocationGroup<T>[] = [];
	for (const [locId, groupItems] of groups) {
		const location = locId != null ? locationMap.get(locId) : undefined;
		result.push({
			location,
			label: getLocationLabel(location),
			items: groupItems,
		});
	}

	return result.sort((a, b) => a.label.localeCompare(b.label));
}

export function searchNotes(notes: Note[], query: string): Note[] {
	if (!query.trim()) return notes;
	const q = query.toLowerCase();
	return notes.filter(
		(n) =>
			(n.Title && n.Title.toLowerCase().includes(q)) ||
			(n.Content && n.Content.toLowerCase().includes(q)),
	);
}

export const HIGHLIGHT_COLORS: Record<number, { name: string; bg: string; fg: string }> = {
	1: { name: 'Yellow', bg: '#fef08a', fg: '#854d0e' },
	2: { name: 'Green', bg: '#bbf7d0', fg: '#166534' },
	3: { name: 'Blue', bg: '#bfdbfe', fg: '#1e40af' },
	4: { name: 'Pink', bg: '#fecdd3', fg: '#9f1239' },
	5: { name: 'Purple', bg: '#e9d5ff', fg: '#6b21a8' },
};

export function getBlockRangesForMark(
	blockRanges: BlockRange[],
	userMarkId: number,
): BlockRange[] {
	return blockRanges.filter((br) => br.UserMarkId === userMarkId);
}

export interface HighlightWithContext {
	mark: UserMark;
	location: Location | undefined;
	blockRanges: BlockRange[];
}

export function buildHighlights(
	userMarks: UserMark[],
	blockRanges: BlockRange[],
	locationMap: Map<number, Location>,
): HighlightWithContext[] {
	const rangesByMarkId = new Map<number, BlockRange[]>();
	for (const br of blockRanges) {
		const existing = rangesByMarkId.get(br.UserMarkId);
		if (existing) {
			existing.push(br);
		} else {
			rangesByMarkId.set(br.UserMarkId, [br]);
		}
	}

	return userMarks.map((mark) => ({
		mark,
		location: locationMap.get(mark.LocationId),
		blockRanges: rangesByMarkId.get(mark.UserMarkId) ?? [],
	}));
}

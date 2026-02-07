export function getPreview(content: string, maxLength = 180): string {
	if (content.length <= maxLength) return content;
	return content.slice(0, maxLength) + '\u2026';
}

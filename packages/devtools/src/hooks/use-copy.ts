import { useEffect, useState } from "react";

export function useCopy(timeout = 1200) {
	const [copied, setCopied] = useState<string | null>(null);

	useEffect(() => {
		if (!copied) {
			return;
		}

		const timer = window.setTimeout(() => setCopied(null), timeout);
		return () => window.clearTimeout(timer);
	}, [copied, timeout]);

	async function copy(key: string, text: string) {
		await navigator.clipboard?.writeText(text);
		setCopied(key);
	}

	return { copied, copy };
}

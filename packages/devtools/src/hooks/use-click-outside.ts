import { type RefObject, useEffect } from "react";

export function useClickOutside<T extends HTMLElement>(
	ref: RefObject<T | null>,
	enabled: boolean,
	onOutside: () => void,
) {
	useEffect(() => {
		if (!enabled) {
			return;
		}

		function handlePointerDown(event: PointerEvent) {
			if (ref.current?.contains(event.target as Node)) {
				return;
			}

			onOutside();
		}

		document.addEventListener("pointerdown", handlePointerDown);
		return () => document.removeEventListener("pointerdown", handlePointerDown);
	}, [enabled, onOutside, ref]);
}

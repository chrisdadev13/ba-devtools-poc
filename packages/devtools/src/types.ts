export type BetterAuthDevtoolsStatus =
	| "signed-in"
	| "signed-out"
	| "loading"
	| "error";
export type BetterAuthDevtoolsPanel =
	| "session"
	| "users"
	| "config"
	| "prefs"
	| "diagnostics"
	| null;
export type BetterAuthDevtoolsPosition =
	| "bottom-left"
	| "bottom-right"
	| "top-left"
	| "top-right";
export type BetterAuthDevtoolsSize = "small" | "medium" | "large";
export type BetterAuthDevtoolsTheme = "system" | "light" | "dark";

export type BetterAuthDevtoolsUser = {
	id: string;
	email?: string;
	name?: string;
	image?: string | null;
	emailVerified?: boolean;
	createdAt?: string;
	updatedAt?: string;
	[key: string]: unknown;
};

export type BetterAuthDevtoolsAuthClient = {
	useSession: () => {
		data: unknown;
		isPending: boolean;
		isRefetching?: boolean;
		error: Error | null;
		refetch?: () => Promise<void>;
	};
	getSession?: () => Promise<unknown>;
	signOut?: () => Promise<unknown>;
	$fetch?: (
		path: string,
		options?: Record<string, unknown>,
	) => Promise<unknown>;
	$store?: {
		notify?: (signal?: string) => void;
	};
};

export type BetterAuthDevtoolsProps = {
	auth: BetterAuthDevtoolsAuthClient;
	defaultOpen?: boolean;
	defaultPosition?: BetterAuthDevtoolsPosition;
	defaultSize?: BetterAuthDevtoolsSize;
	defaultTheme?: BetterAuthDevtoolsTheme;
};

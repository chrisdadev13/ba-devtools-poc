"use client";

import {
	type CSSProperties,
	type MouseEvent as ReactMouseEvent,
	type ReactNode,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useClickOutside } from "../hooks/use-click-outside";
import { useCopy } from "../hooks/use-copy";
import type {
	BetterAuthDevtoolsAuthClient,
	BetterAuthDevtoolsPanel,
	BetterAuthDevtoolsPosition,
	BetterAuthDevtoolsProps,
	BetterAuthDevtoolsSize,
	BetterAuthDevtoolsStatus,
	BetterAuthDevtoolsTheme,
	BetterAuthDevtoolsUser,
} from "../types";
import styles from "./better-auth-devtools.module.css";
import { BetterAuthLogo } from "./better-auth-logo";

const STORAGE_KEY = "better-auth-devtools:preferences";
const SESSION_HIDE_KEY = "better-auth-devtools:hidden";
const PANEL_MIN_WIDTH = 320;
const PANEL_MIN_HEIGHT = 280;
const PANEL_MARGIN = 20;

type PanelDimensions = {
	width: number;
	height: number;
};

type Preferences = {
	position: BetterAuthDevtoolsPosition;
	size: BetterAuthDevtoolsSize;
	theme: BetterAuthDevtoolsTheme;
	panelSize?: PanelDimensions;
};

type ResizeDirection =
	| "top"
	| "right"
	| "bottom"
	| "left"
	| "top-left"
	| "top-right"
	| "bottom-left"
	| "bottom-right";

const DEFAULT_PANEL_SIZE: Record<BetterAuthDevtoolsSize, PanelDimensions> = {
	small: { width: 380, height: 420 },
	medium: { width: 420, height: 460 },
	large: { width: 460, height: 500 },
};

type DevtoolsConfig = {
	baseURL?: string;
	emailAndPassword?: { enabled?: boolean };
	plugins?: string[];
	tables?: string[];
};

type UsersResponse = {
	users: BetterAuthDevtoolsUser[];
	total: number;
	limit: number;
	offset: number;
};

function cn(...classes: Array<string | false | null | undefined>) {
	return classes.filter(Boolean).join(" ");
}

function readPreferences(defaults: Preferences): Preferences {
	if (typeof window === "undefined") {
		return defaults;
	}

	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
	} catch {
		return defaults;
	}
}

function writePreferences(preferences: Preferences) {
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
	} catch {
		// Preferences are optional; private browsing can reject storage writes.
	}
}

function constrainPanelDimensions(dimensions: PanelDimensions): PanelDimensions {
	if (typeof window === "undefined") {
		return dimensions;
	}

	return {
		width: Math.min(
			window.innerWidth - PANEL_MARGIN * 2,
			Math.max(PANEL_MIN_WIDTH, dimensions.width),
		),
		height: Math.min(
			window.innerHeight - PANEL_MARGIN * 2,
			Math.max(PANEL_MIN_HEIGHT, dimensions.height),
		),
	};
}

function getPanelDimensions(
	size: BetterAuthDevtoolsSize,
	panelSize: PanelDimensions | null,
) {
	return constrainPanelDimensions(panelSize ?? DEFAULT_PANEL_SIZE[size]);
}

function getResizeDirections(position: BetterAuthDevtoolsPosition) {
	switch (position) {
		case "bottom-left":
			return ["top", "right", "top-right"] as const;
		case "bottom-right":
			return ["top", "left", "top-left"] as const;
		case "top-left":
			return ["bottom", "right", "bottom-right"] as const;
		case "top-right":
			return ["bottom", "left", "bottom-left"] as const;
		default: {
			position satisfies never;
			return [];
		}
	}
}

function unwrapFetch<T>(result: unknown): T {
	if (result && typeof result === "object") {
		const maybeResult = result as {
			data?: T;
			error?: { message?: string; statusText?: string } | null;
		};
		if (maybeResult.error) {
			throw new Error(
				maybeResult.error.message ??
					maybeResult.error.statusText ??
					"Request failed",
			);
		}

		if ("data" in maybeResult) {
			return maybeResult.data as T;
		}
	}

	return result as T;
}

function getSessionUser(sessionData: unknown): BetterAuthDevtoolsUser | null {
	if (!sessionData || typeof sessionData !== "object") {
		return null;
	}

	const maybeSession = sessionData as { user?: BetterAuthDevtoolsUser | null };
	return maybeSession.user ?? null;
}

function getSessionObject(
	sessionData: unknown,
): Record<string, unknown> | null {
	if (!sessionData || typeof sessionData !== "object") {
		return null;
	}

	const maybeSession = sessionData as {
		session?: Record<string, unknown> | null;
	};
	return maybeSession.session ?? null;
}

function formatValue(value: unknown) {
	if (value === null || value === undefined || value === "") {
		return "-";
	}

	return String(value);
}

async function fetchDevtools<T>(
	auth: BetterAuthDevtoolsAuthClient,
	path: string,
	options?: Record<string, unknown>,
) {
	if (!auth.$fetch) {
		throw new Error("The provided Better Auth client does not expose $fetch.");
	}

	return unwrapFetch<T>(await auth.$fetch(path, options));
}

export function BetterAuthDevtools({
	auth,
	defaultOpen = false,
	defaultPosition = "bottom-left",
	defaultSize = "medium",
	defaultTheme = "system",
}: BetterAuthDevtoolsProps) {
	const session = auth.useSession();
	const rootRef = useRef<HTMLDivElement>(null);
	const [open, setOpen] = useState(defaultOpen);
	const [panel, setPanel] = useState<BetterAuthDevtoolsPanel>(null);
	const [position, setPosition] =
		useState<BetterAuthDevtoolsPosition>(defaultPosition);
	const [size, setSize] = useState<BetterAuthDevtoolsSize>(defaultSize);
	const [theme, setTheme] = useState<BetterAuthDevtoolsTheme>(defaultTheme);
	const [panelSize, setPanelSize] = useState<PanelDimensions | null>(null);
	const [hidden, setHidden] = useState(false);
	const [query, setQuery] = useState("");
	const [users, setUsers] = useState<BetterAuthDevtoolsUser[]>([]);
	const [usersTotal, setUsersTotal] = useState(0);
	const [usersLoading, setUsersLoading] = useState(false);
	const [usersError, setUsersError] = useState<string | null>(null);
	const [signingInUserId, setSigningInUserId] = useState<string | null>(null);
	const [config, setConfig] = useState<DevtoolsConfig | null>(null);
	const [configError, setConfigError] = useState<string | null>(null);
	const { copied, copy } = useCopy();

	const currentUser = getSessionUser(session.data);
	const sessionObject = getSessionObject(session.data);
	const status: BetterAuthDevtoolsStatus = session.isPending
		? "loading"
		: session.error
			? "error"
			: currentUser
				? "signed-in"
				: "signed-out";

	const preferences = useMemo(
		() => ({ position, size, theme, ...(panelSize ? { panelSize } : {}) }),
		[position, size, theme, panelSize],
	);

	const sessionJson = JSON.stringify(session.data ?? null, null, 2);

	useEffect(() => {
		const stored = readPreferences({
			position: defaultPosition,
			size: defaultSize,
			theme: defaultTheme,
		});
		setPosition(stored.position);
		setSize(stored.size);
		setTheme(stored.theme);
		setPanelSize(stored.panelSize ?? null);
		setHidden(window.sessionStorage.getItem(SESSION_HIDE_KEY) === "true");
	}, [defaultPosition, defaultSize, defaultTheme]);

	useEffect(() => {
		if (!panelSize) {
			return;
		}

		function handleResize() {
			setPanelSize((current) =>
				current ? constrainPanelDimensions(current) : current,
			);
		}

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, [panelSize]);

	useEffect(() => {
		writePreferences(preferences);
	}, [preferences]);

	useClickOutside(rootRef, open, () => {
		setOpen(false);
		setPanel(null);
	});

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (
				(event.metaKey || event.ctrlKey) &&
				event.shiftKey &&
				event.key.toLowerCase() === "b"
			) {
				event.preventDefault();
				setOpen((value) => !value);
				setPanel(null);
			}

			if (event.key === "Escape") {
				if (panel) {
					setPanel(null);
					return;
				}

				setOpen(false);
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [panel]);

	useEffect(() => {
		if (panel !== "users") {
			return;
		}

		let cancelled = false;
		async function loadUsers() {
			setUsersLoading(true);
			setUsersError(null);
			try {
				const response = await fetchDevtools<UsersResponse>(
					auth,
					"/better-auth-devtools/users",
					{
						method: "GET",
						query: { limit: 100 },
					},
				);

				if (!cancelled) {
					setUsers(response.users);
					setUsersTotal(response.total);
				}
			} catch (error) {
				if (!cancelled) {
					setUsersError(
						error instanceof Error ? error.message : "Failed to load users.",
					);
				}
			} finally {
				if (!cancelled) {
					setUsersLoading(false);
				}
			}
		}

		loadUsers();
		return () => {
			cancelled = true;
		};
	}, [auth, panel]);

	useEffect(() => {
		if (panel !== "config") {
			return;
		}

		let cancelled = false;
		async function loadConfig() {
			setConfigError(null);
			try {
				const response = await fetchDevtools<DevtoolsConfig>(
					auth,
					"/better-auth-devtools/config",
					{
						method: "GET",
					},
				);
				if (!cancelled) {
					setConfig(response);
				}
			} catch (error) {
				if (!cancelled) {
					setConfigError(
						error instanceof Error ? error.message : "Failed to load config.",
					);
				}
			}
		}

		loadConfig();
		return () => {
			cancelled = true;
		};
	}, [auth, panel]);

	async function refreshSession() {
		if (session.refetch) {
			await session.refetch();
			return;
		}

		await auth.getSession?.();
		auth.$store?.notify?.("$sessionSignal");
	}

	async function signOut() {
		await auth.signOut?.();
		auth.$store?.notify?.("$sessionSignal");
		await session.refetch?.();
		setPanel(null);
	}

	async function signInAs(userId: string) {
		setSigningInUserId(userId);
		setUsersError(null);
		try {
			await fetchDevtools(auth, "/better-auth-devtools/sign-in-as", {
				method: "POST",
				body: { userId },
			});
			auth.$store?.notify?.("$sessionSignal");
			await session.refetch?.();
			setPanel(null);
		} catch (error) {
			setUsersError(
				error instanceof Error ? error.message : "Failed to sign in as user.",
			);
		} finally {
			setSigningInUserId(null);
		}
	}

	function hideForSession() {
		window.sessionStorage.setItem(SESSION_HIDE_KEY, "true");
		setHidden(true);
	}

	if (hidden) {
		return null;
	}

	const filteredUsers = users.filter((user) => {
		const normalizedQuery = query.trim().toLowerCase();
		if (!normalizedQuery) {
			return true;
		}

		return [user.email, user.name, user.id].some((value) =>
			String(value ?? "")
				.toLowerCase()
				.includes(normalizedQuery),
		);
	});

	return (
		<div
			ref={rootRef}
			className={styles.root}
			data-position={position}
			data-size={size}
			data-theme={theme}
		>
			{!open ? (
				<button
					className={styles.launcher}
					type="button"
					aria-label="Open Better Auth devtools"
					onClick={() => setOpen(true)}
				>
					<span className={styles.logo}>
						<BetterAuthLogo aria-hidden="true" />
					</span>
					<span className={styles.launcherLabel}>BA</span>
					<span className={styles.statusDot} data-status={status} />
				</button>
			) : null}

			{open && !panel ? (
				<Card>
					<Header title="Better Auth" onClose={() => setOpen(false)} />
					<div className={styles.content}>
						<InfoRow label="Status" value={<StatusPill status={status} />} />
						<InfoRow
							label="User"
							value={currentUser?.email ?? currentUser?.name ?? "-"}
						/>
						<InfoRow
							label="Session"
							value={formatValue(sessionObject?.expiresAt)}
						/>
					</div>
					<Divider />
					<div className={styles.content}>
						{currentUser ? (
							<MenuItem
								label="Session Info"
								onClick={() => setPanel("session")}
							/>
						) : null}
						<MenuItem label="Users" onClick={() => setPanel("users")} />
						<MenuItem label="Config" onClick={() => setPanel("config")} />
						{status === "error" ? (
							<MenuItem
								label="Diagnostics"
								onClick={() => setPanel("diagnostics")}
							/>
						) : null}
					</div>
					<Divider />
					<div className={styles.content}>
						<MenuItem
							label="Preferences"
							value={<SettingsIcon />}
							onClick={() => setPanel("prefs")}
						/>
					</div>
				</Card>
			) : null}

			{open && panel === "session" ? (
				<Panel
					title="Session Info"
					position={position}
					size={size}
					panelSize={panelSize}
					onResize={setPanelSize}
					onBack={() => setPanel(null)}
					onClose={() => setOpen(false)}
				>
					<Section title="User">
						<KV k="id" v={currentUser?.id} mono />
						<KV k="name" v={currentUser?.name} />
						<KV k="email" v={currentUser?.email} />
						<KV
							k="emailVerified"
							v={
								currentUser
									? String(Boolean(currentUser.emailVerified))
									: undefined
							}
						/>
					</Section>
					<Section title="Session">
						{sessionObject
							? Object.entries(sessionObject).map(([key, value]) => (
									<KV key={key} k={key} v={formatValue(value)} mono />
								))
							: null}
					</Section>
					<Section title="Actions">
						<div className={styles.panelActions}>
							<Button onClick={refreshSession}>
								<RefreshIcon />
								Refresh session
							</Button>
							<Button onClick={signOut}>
								<LogOutIcon />
								Sign out
							</Button>
							<Button onClick={() => copy("session", sessionJson)}>
								{copied === "session" ? <CheckIcon /> : <CopyIcon />}Copy JSON
							</Button>
						</div>
					</Section>
					<Section title="Raw">
						<pre className={styles.jsonBlock}>{sessionJson}</pre>
					</Section>
				</Panel>
			) : null}

			{open && panel === "users" ? (
				<Panel
					title="Users"
					position={position}
					size={size}
					panelSize={panelSize}
					onResize={setPanelSize}
					onBack={() => setPanel(null)}
					onClose={() => setOpen(false)}
				>
					<div className={styles.content}>
						<div className={styles.searchBox}>
							<SearchIcon />
							<input
								className={styles.searchInput}
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								placeholder="Search users..."
							/>
						</div>
					</div>
					<Divider />
					{usersError ? (
						<div className={styles.emptyState}>
							{usersError}
							<br />
							Add <span className={styles.mono}>betterAuthDevtools()</span> to
							your server plugins.
						</div>
					) : null}
					{!usersError && usersLoading ? (
						<div className={styles.emptyState}>Loading users...</div>
					) : null}
					{!usersError && !usersLoading ? (
						<div className={styles.userList}>
							{filteredUsers.map((user) => {
								const isCurrent = user.id === currentUser?.id;
								return (
									<div className={styles.userRow} key={user.id}>
										<div className={styles.userMain}>
											<div className={styles.userEmail}>
												<span className={styles.truncate}>
													{user.email ?? user.name ?? user.id}
												</span>
												{isCurrent ? (
													<span className={styles.badge}>current</span>
												) : null}
											</div>
											<div className={styles.userMeta}>
												{user.name ? `${user.name} · ` : ""}
												{user.emailVerified ? "verified" : "unverified"}
											</div>
										</div>
										<Button
											disabled={isCurrent || signingInUserId !== null}
											onClick={() => signInAs(user.id)}
										>
											{signingInUserId === user.id
												? "Signing in..."
												: "Sign in"}
										</Button>
									</div>
								);
							})}
							{filteredUsers.length === 0 ? (
								<div className={styles.emptyState}>No users found.</div>
							) : null}
						</div>
					) : null}
					{usersTotal > users.length ? (
						<div className={styles.emptyState}>
							Showing {users.length} of {usersTotal} users.
						</div>
					) : null}
				</Panel>
			) : null}

			{open && panel === "config" ? (
				<Panel
					title="Config"
					position={position}
					size={size}
					panelSize={panelSize}
					onResize={setPanelSize}
					onBack={() => setPanel(null)}
					onClose={() => setOpen(false)}
				>
					{configError ? (
						<div className={styles.emptyState}>{configError}</div>
					) : null}
					{!configError ? (
						<>
							<Section>
								<KV k="Base URL" v={config?.baseURL} />
								<KV
									k="Email/password"
									v={
										config
											? config.emailAndPassword?.enabled
												? "enabled"
												: "disabled"
											: "loading"
									}
								/>
							</Section>
							<Section title="Plugins">
								<FieldList
									items={config?.plugins ?? []}
									empty="No plugins reported."
								/>
							</Section>
							<Section title="Tables">
								<FieldList
									items={config?.tables ?? []}
									empty="No tables reported."
								/>
							</Section>
							<div className={cn(styles.bodyCopy, styles.content)}>
								Secrets are never displayed.
							</div>
						</>
					) : null}
				</Panel>
			) : null}

			{open && panel === "diagnostics" ? (
				<Panel
					title="Diagnostics"
					position={position}
					size={size}
					panelSize={panelSize}
					onResize={setPanelSize}
					onBack={() => setPanel(null)}
					onClose={() => setOpen(false)}
				>
					<Section>
						<KV k="Session status" v={status} />
						<KV k="Last error" v={session.error?.message} />
					</Section>
					<div className={styles.actions}>
						<Button className={styles.primaryButton} onClick={refreshSession}>
							<RefreshIcon />
							Retry session fetch
						</Button>
					</div>
				</Panel>
			) : null}

			{open && panel === "prefs" ? (
				<Panel
					title="Preferences"
					position={position}
					size={size}
					panelSize={panelSize}
					onResize={setPanelSize}
					onBack={() => setPanel(null)}
					onClose={() => setOpen(false)}
				>
					<PrefRow label="Theme" hint="Select widget theme.">
						<Select
							value={theme}
							onChange={(value) => setTheme(value as BetterAuthDevtoolsTheme)}
							options={["system", "light", "dark"]}
						/>
					</PrefRow>
					<PrefRow label="Position" hint="Adjust widget placement.">
						<Select
							value={position}
							onChange={(value) =>
								setPosition(value as BetterAuthDevtoolsPosition)
							}
							options={["bottom-left", "bottom-right", "top-left", "top-right"]}
						/>
					</PrefRow>
					<PrefRow label="Size" hint="Adjust widget scale.">
						<Select
							value={size}
							onChange={(value) => setSize(value as BetterAuthDevtoolsSize)}
							options={["small", "medium", "large"]}
						/>
					</PrefRow>
					<PrefRow
						label="Hide for this session"
						hint="Restore by reloading a new browser session."
					>
						<Button onClick={hideForSession}>Hide</Button>
					</PrefRow>
					<PrefRow label="Shortcut" hint="Toggle the widget.">
						<span className={styles.kbd}>⌘ ⇧ B</span>
					</PrefRow>
				</Panel>
			) : null}
		</div>
	);
}

function Card({ children }: { children: ReactNode }) {
	return <div className={styles.card}>{children}</div>;
}

function Panel({
	children,
	title,
	position,
	size,
	panelSize,
	onResize,
	onBack,
	onClose,
}: {
	children: ReactNode;
	title: string;
	position: BetterAuthDevtoolsPosition;
	size: BetterAuthDevtoolsSize;
	panelSize: PanelDimensions | null;
	onResize: (panelSize: PanelDimensions) => void;
	onBack: () => void;
	onClose: () => void;
}) {
	const panelRef = useRef<HTMLDivElement>(null);
	const [draggingDirection, setDraggingDirection] =
		useState<ResizeDirection | null>(null);
	const dimensions = getPanelDimensions(size, panelSize);

	return (
		<div
			className={styles.panel}
			ref={panelRef}
			style={
				{
					"--ba-panel-current-width": `${dimensions.width}px`,
					"--ba-panel-current-height": `${dimensions.height}px`,
				} as CSSProperties
			}
		>
			<div className={styles.header}>
				<button className={styles.backButton} type="button" onClick={onBack}>
					<ChevronLeftIcon />
					{title}
				</button>
				<button
					className={styles.iconButton}
					type="button"
					aria-label="Close"
					onClick={onClose}
				>
					<XIcon />
				</button>
			</div>
			<div className={styles.panelBody}>{children}</div>
			{getResizeDirections(position).map((direction) => (
				<ResizeHandle
					key={direction}
					direction={direction}
					draggingDirection={draggingDirection}
					panelRef={panelRef}
					setDraggingDirection={setDraggingDirection}
					onResize={onResize}
				/>
			))}
		</div>
	);
}

function ResizeHandle({
	direction,
	draggingDirection,
	panelRef,
	setDraggingDirection,
	onResize,
}: {
	direction: ResizeDirection;
	draggingDirection: ResizeDirection | null;
	panelRef: React.RefObject<HTMLDivElement | null>;
	setDraggingDirection: (direction: ResizeDirection | null) => void;
	onResize: (panelSize: PanelDimensions) => void;
}) {
	function handleMouseDown(event: ReactMouseEvent<HTMLDivElement>) {
		event.preventDefault();
		event.stopPropagation();

		const panel = panelRef.current;
		if (!panel) {
			return;
		}

		setDraggingDirection(direction);

		const initialRect = panel.getBoundingClientRect();
		const startX = event.clientX;
		const startY = event.clientY;

		function handleMouseMove(moveEvent: MouseEvent) {
			const deltaX = moveEvent.clientX - startX;
			const deltaY = moveEvent.clientY - startY;
			const nextDimensions = getResizedDimensions(
				direction,
				deltaX,
				deltaY,
				initialRect,
			);

			panel.style.setProperty(
				"--ba-panel-current-width",
				`${nextDimensions.width}px`,
			);
			panel.style.setProperty(
				"--ba-panel-current-height",
				`${nextDimensions.height}px`,
			);
		}

		function handleMouseUp() {
			setDraggingDirection(null);
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);

			const resizedPanel = panelRef.current;
			if (!resizedPanel) {
				return;
			}

			const { width, height } = resizedPanel.getBoundingClientRect();
			onResize(constrainPanelDimensions({ width, height }));
		}

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
	}

	return (
		<>
			<div
				className={cn(
					styles.resizeHandle,
					styles[`resizeHandle-${direction}`],
					draggingDirection &&
						draggingDirection !== direction &&
						styles.resizeHandleNoHover,
				)}
				onMouseDown={handleMouseDown}
			/>
			{!direction.includes("-") ? (
				<div
					className={cn(
						styles.resizeLine,
						styles[`resizeLine-${direction}`],
						draggingDirection === direction && styles.resizeLineDragging,
					)}
				/>
			) : null}
		</>
	);
}

function getResizedDimensions(
	direction: ResizeDirection,
	deltaX: number,
	deltaY: number,
	initialRect: DOMRect,
) {
	const growsLeft = direction.includes("left");
	const growsRight = direction.includes("right");
	const growsTop = direction.includes("top");
	const growsBottom = direction.includes("bottom");

	return constrainPanelDimensions({
		width: initialRect.width + (growsRight ? deltaX : growsLeft ? -deltaX : 0),
		height: initialRect.height + (growsBottom ? deltaY : growsTop ? -deltaY : 0),
	});
}

function Header({ title, onClose }: { title: string; onClose: () => void }) {
	return (
		<div className={styles.header}>
			<div className={styles.titleGroup}>
				<span className={styles.logo}>
					<BetterAuthLogo aria-hidden="true" />
				</span>
				<span className={styles.title}>{title}</span>
			</div>
			<button
				className={styles.iconButton}
				type="button"
				aria-label="Close"
				onClick={onClose}
			>
				<XIcon />
			</button>
		</div>
	);
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
	return (
		<div className={styles.infoRow}>
			<span className={styles.label}>{label}</span>
			<span className={styles.value}>{value}</span>
		</div>
	);
}

function MenuItem({
	label,
	value = <ChevronRightIcon />,
	onClick,
}: {
	label: string;
	value?: ReactNode;
	onClick: () => void;
}) {
	return (
		<button className={styles.menuItem} type="button" onClick={onClick}>
			<span>{label}</span>
			<span className={styles.menuValue}>{value}</span>
		</button>
	);
}

function Divider() {
	return <div className={styles.divider} />;
}

function StatusPill({ status }: { status: BetterAuthDevtoolsStatus }) {
	const label = {
		"signed-in": "Signed in",
		"signed-out": "Signed out",
		loading: "Loading",
		error: "Error",
	}[status];

	return (
		<span className={styles.statusPill} data-status={status}>
			<span className={styles.statusDot} data-status={status} />
			{label}
		</span>
	);
}

function Section({ title, children }: { title?: string; children: ReactNode }) {
	return (
		<section className={styles.section}>
			{title ? <div className={styles.sectionTitle}>{title}</div> : null}
			{children}
		</section>
	);
}

function KV({ k, v, mono }: { k: string; v: unknown; mono?: boolean }) {
	return (
		<div className={styles.kvRow}>
			<span className={styles.key}>{k}</span>
			<span className={cn(styles.kvValue, mono && styles.mono)}>
				{formatValue(v)}
			</span>
		</div>
	);
}

function Button({
	children,
	className,
	disabled,
	onClick,
}: {
	children: ReactNode;
	className?: string;
	disabled?: boolean;
	onClick: () => void | Promise<void>;
}) {
	return (
		<button
			className={cn(styles.button, className)}
			type="button"
			disabled={disabled}
			onClick={onClick}
		>
			{children}
		</button>
	);
}

function FieldList({ items, empty }: { items: string[]; empty: string }) {
	return (
		<div className={styles.fieldList}>
			{items.length ? items.map((item) => <div key={item}>{item}</div>) : empty}
		</div>
	);
}

function PrefRow({
	label,
	hint,
	children,
}: {
	label: string;
	hint: string;
	children: ReactNode;
}) {
	return (
		<div className={styles.prefRow}>
			<div>
				<div className={styles.prefLabel}>{label}</div>
				<div className={styles.hint}>{hint}</div>
			</div>
			<div>{children}</div>
		</div>
	);
}

function Select({
	value,
	onChange,
	options,
}: {
	value: string;
	onChange: (value: string) => void;
	options: string[];
}) {
	return (
		<select
			className={styles.select}
			value={value}
			onChange={(event) => onChange(event.target.value)}
		>
			{options.map((option) => (
				<option key={option} value={option}>
					{option.replaceAll("-", " ")}
				</option>
			))}
		</select>
	);
}

function SvgIcon({ children }: { children: ReactNode }) {
	return (
		<svg
			aria-hidden="true"
			width="14"
			height="14"
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			{children}
		</svg>
	);
}

function ChevronRightIcon() {
	return (
		<SvgIcon>
			<path d="m6 3 5 5-5 5" />
		</SvgIcon>
	);
}
function ChevronLeftIcon() {
	return (
		<SvgIcon>
			<path d="m10 3-5 5 5 5" />
		</SvgIcon>
	);
}
function XIcon() {
	return (
		<SvgIcon>
			<path d="M4 4l8 8M12 4l-8 8" />
		</SvgIcon>
	);
}
function SettingsIcon() {
	return (
		<SvgIcon>
			<path d="M8 2.5v2M8 11.5v2M3.2 5.25l1.7 1M11.1 9.75l1.7 1M3.2 10.75l1.7-1M11.1 6.25l1.7-1" />
			<circle cx="8" cy="8" r="2.2" />
		</SvgIcon>
	);
}
function CopyIcon() {
	return (
		<SvgIcon>
			<rect x="5" y="5" width="8" height="8" rx="1.5" />
			<path d="M3 10.5V4a1 1 0 0 1 1-1h6.5" />
		</SvgIcon>
	);
}
function CheckIcon() {
	return (
		<SvgIcon>
			<path d="m3 8.5 3 3L13 4" />
		</SvgIcon>
	);
}
function RefreshIcon() {
	return (
		<SvgIcon>
			<path d="M13 8a5 5 0 1 1-1.45-3.54" />
			<path d="M13 3.5V7h-3.5" />
		</SvgIcon>
	);
}
function LogOutIcon() {
	return (
		<SvgIcon>
			<path d="M6.5 13H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h2.5" />
			<path d="M10 11l3-3-3-3M13 8H6" />
		</SvgIcon>
	);
}
function SearchIcon() {
	return (
		<SvgIcon>
			<circle cx="7" cy="7" r="4" />
			<path d="m10 10 3 3" />
		</SvgIcon>
	);
}

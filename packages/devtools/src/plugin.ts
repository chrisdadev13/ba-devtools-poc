import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";
import type { BetterAuthDevtoolsLoginLink } from "./types";

export type BetterAuthDevtoolsPluginOptions = {
	enabled?: boolean;
	defaultLimit?: number;
	maxLimit?: number;
	loginLinks?: BetterAuthDevtoolsLoginLink[];
};

type NormalizedLoginLink = BetterAuthDevtoolsLoginLink & { key: string };

const SENSITIVE_FIELD_NAMES = new Set([
	"password",
	"secret",
	"token",
	"accessToken",
	"refreshToken",
	"idToken",
]);

function isEnabled(enabled: boolean | undefined) {
	return enabled ?? process.env.NODE_ENV !== "production";
}

function assertEnabled(enabled: boolean | undefined) {
	if (!isEnabled(enabled)) {
		throw new APIError("NOT_FOUND", {
			message: "Better Auth devtools are not enabled.",
		});
	}
}

function serializeValue(value: unknown): unknown {
	if (value instanceof Date) {
		return value.toISOString();
	}

	return value;
}

function serializeUser(user: Record<string, unknown>) {
	return Object.fromEntries(
		Object.entries(user)
			.filter(([key]) => !SENSITIVE_FIELD_NAMES.has(key))
			.map(([key, value]) => [key, serializeValue(value)]),
	);
}

function getLoginLinkKey(link: BetterAuthDevtoolsLoginLink, index: number) {
	return link.key ?? link.userId ?? link.email ?? `login-link-${index + 1}`;
}

function normalizeLoginLinks(
	links: BetterAuthDevtoolsLoginLink[] | undefined,
): NormalizedLoginLink[] {
	const keys = new Set<string>();
	return (links ?? []).map((link, index) => {
		const key = getLoginLinkKey(link, index);
		if (keys.has(key)) {
			throw new Error(`Duplicate Better Auth devtools login link key: ${key}`);
		}

		keys.add(key);
		return { ...link, key };
	});
}

function serializeLoginLink(link: NormalizedLoginLink) {
	return {
		key: link.key,
		label: link.label,
		...(link.email ? { email: link.email } : {}),
		...(link.userId ? { userId: link.userId } : {}),
		...(link.createIfMissing !== undefined
			? { createIfMissing: link.createIfMissing }
			: {}),
	};
}

function getDefaultName(email: string, label: string) {
	return email.split("@")[0] || label;
}

const usersQuerySchema = z.object({
	limit: z.coerce.number().int().positive().optional(),
	offset: z.coerce.number().int().min(0).optional(),
	search: z.string().optional(),
});

const signInAsBodySchema = z.object({
	userId: z.string().min(1),
});

const loginLinkBodySchema = z.object({
	key: z.string().min(1),
});

const loginLinkQuerySchema = z.object({
	key: z.string().min(1),
	callbackURL: z.string().optional(),
});

export function betterAuthDevtools(
	options: BetterAuthDevtoolsPluginOptions = {},
) {
	const defaultLimit = options.defaultLimit ?? 25;
	const maxLimit = options.maxLimit ?? 100;
	const loginLinks = normalizeLoginLinks(options.loginLinks);

	return {
		id: "better-auth-devtools",
		endpoints: {
			betterAuthDevtoolsConfig: createAuthEndpoint(
				"/better-auth-devtools/config",
				{
					method: "GET",
				},
				async (ctx) => {
					assertEnabled(options.enabled);

					return ctx.json({
						baseURL: ctx.context.baseURL,
						emailAndPassword: {
							enabled: Boolean(ctx.context.options.emailAndPassword?.enabled),
						},
						plugins:
							ctx.context.options.plugins
								?.map((plugin) => plugin.id)
								.filter(Boolean) ?? [],
						loginLinks: loginLinks.map((link) => serializeLoginLink(link)),
						tables: Object.keys(ctx.context.tables),
					});
				},
			),
			betterAuthDevtoolsLoginLink: createAuthEndpoint(
				"/better-auth-devtools/login-link",
				{
					method: "GET",
					query: loginLinkQuerySchema,
				},
				async (ctx) => {
					assertEnabled(options.enabled);

					const link = loginLinks.find((entry) => entry.key === ctx.query.key);
					if (!link) {
						throw new APIError("NOT_FOUND", {
							message: "Login link not found.",
						});
					}

					let user = link.userId
						? await ctx.context.internalAdapter.findUserById(link.userId)
						: null;
					if (!user && link.email) {
						const foundUser = await ctx.context.internalAdapter.findUserByEmail(
							link.email,
						);
						user = foundUser?.user ?? null;
					}

					if (!user && link.createIfMissing) {
						if (!link.email) {
							throw new APIError("BAD_REQUEST", {
								message: "createIfMissing requires an email.",
							});
						}

						user = await ctx.context.internalAdapter.createUser({
							...(link.userId ? { id: link.userId } : {}),
							email: link.email,
							name: link.name ?? getDefaultName(link.email, link.label),
							image: link.image ?? null,
							emailVerified: link.emailVerified ?? true,
						});
					}

					if (!user) {
						throw new APIError("NOT_FOUND", {
							message: "User not found.",
						});
					}

					const callbackURL = ctx.query.callbackURL ?? "/";
					if (
						!ctx.context.isTrustedOrigin(callbackURL, {
							allowRelativePaths: true,
						})
					) {
						throw new APIError("FORBIDDEN", {
							message: "Callback URL is not trusted.",
						});
					}

					const session = await ctx.context.internalAdapter.createSession(
						user.id,
					);
					await setSessionCookie(ctx, { session, user });

					throw ctx.redirect(callbackURL);
				},
			),
			betterAuthDevtoolsLoginLinkSignIn: createAuthEndpoint(
				"/better-auth-devtools/login-link/sign-in",
				{
					method: "POST",
					body: loginLinkBodySchema,
				},
				async (ctx) => {
					assertEnabled(options.enabled);

					const link = loginLinks.find((entry) => entry.key === ctx.body.key);
					if (!link) {
						throw new APIError("NOT_FOUND", {
							message: "Login link not found.",
						});
					}

					let user = link.userId
						? await ctx.context.internalAdapter.findUserById(link.userId)
						: null;
					if (!user && link.email) {
						const foundUser = await ctx.context.internalAdapter.findUserByEmail(
							link.email,
						);
						user = foundUser?.user ?? null;
					}

					if (!user && link.createIfMissing) {
						if (!link.email) {
							throw new APIError("BAD_REQUEST", {
								message: "createIfMissing requires an email.",
							});
						}

						user = await ctx.context.internalAdapter.createUser({
							...(link.userId ? { id: link.userId } : {}),
							email: link.email,
							name: link.name ?? getDefaultName(link.email, link.label),
							image: link.image ?? null,
							emailVerified: link.emailVerified ?? true,
						});
					}

					if (!user) {
						throw new APIError("NOT_FOUND", {
							message: "User not found.",
						});
					}

					const session = await ctx.context.internalAdapter.createSession(
						user.id,
					);
					await setSessionCookie(ctx, { session, user });

					return ctx.json({
						user: serializeUser(user),
						session: {
							...session,
							createdAt: serializeValue(session.createdAt),
							updatedAt: serializeValue(session.updatedAt),
							expiresAt: serializeValue(session.expiresAt),
						},
					});
				},
			),
			betterAuthDevtoolsUsers: createAuthEndpoint(
				"/better-auth-devtools/users",
				{
					method: "GET",
					query: usersQuerySchema,
				},
				async (ctx) => {
					assertEnabled(options.enabled);

					const limit = Math.min(ctx.query?.limit ?? defaultLimit, maxLimit);
					const offset = ctx.query?.offset ?? 0;
					const search = ctx.query?.search?.trim();
					const where = search
						? [
								{
									field: "email",
									operator: "contains" as const,
									value: search,
								},
							]
						: undefined;
					const [users, total] = await Promise.all([
						ctx.context.internalAdapter.listUsers(
							limit,
							offset,
							{
								field: "createdAt",
								direction: "desc",
							},
							where,
						),
						ctx.context.internalAdapter.countTotalUsers(where),
					]);

					return ctx.json({
						users: users.map((user) => serializeUser(user)),
						total,
						limit,
						offset,
					});
				},
			),
			betterAuthDevtoolsSignInAs: createAuthEndpoint(
				"/better-auth-devtools/sign-in-as",
				{
					method: "POST",
					body: signInAsBodySchema,
				},
				async (ctx) => {
					assertEnabled(options.enabled);

					const user = await ctx.context.internalAdapter.findUserById(
						ctx.body.userId,
					);
					if (!user) {
						throw new APIError("NOT_FOUND", {
							message: "User not found.",
						});
					}

					const session = await ctx.context.internalAdapter.createSession(
						user.id,
					);
					await setSessionCookie(ctx, { session, user });

					return ctx.json({
						user: serializeUser(user),
						session: {
							...session,
							createdAt: serializeValue(session.createdAt),
							updatedAt: serializeValue(session.updatedAt),
							expiresAt: serializeValue(session.expiresAt),
						},
					});
				},
			),
		},
	} satisfies BetterAuthPlugin;
}

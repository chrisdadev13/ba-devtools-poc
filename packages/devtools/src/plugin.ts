import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";

export type BetterAuthDevtoolsPluginOptions = {
	enabled?: boolean;
	defaultLimit?: number;
	maxLimit?: number;
};

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

const usersQuerySchema = z.object({
	limit: z.coerce.number().int().positive().optional(),
	offset: z.coerce.number().int().min(0).optional(),
	search: z.string().optional(),
});

const signInAsBodySchema = z.object({
	userId: z.string().min(1),
});

export function betterAuthDevtools(
	options: BetterAuthDevtoolsPluginOptions = {},
) {
	const defaultLimit = options.defaultLimit ?? 25;
	const maxLimit = options.maxLimit ?? 100;

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
						tables: Object.keys(ctx.context.tables),
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

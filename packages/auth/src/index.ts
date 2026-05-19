import { createDb } from "@better-auth-devtools/db";
import * as schema from "@better-auth-devtools/db/schema/auth";
import { betterAuthDevtools } from "@better-auth-devtools/devtools/plugin";
import { env } from "@better-auth-devtools/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

export function createAuth() {
	const db = createDb();

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",

			schema: schema,
		}),
		trustedOrigins: [env.CORS_ORIGIN],
		emailAndPassword: {
			enabled: true,
		},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		plugins: [
			betterAuthDevtools({
				loginLinks: [
					{
						key: "admin",
						label: "Admin",
						email: "admin@example.com",
						name: "Admin",
						createIfMissing: true,
					},
					{
						key: "user",
						label: "Regular User",
						email: "user@example.com",
						createIfMissing: true,
					},
				],
			}),
			nextCookies(),
		],
	});
}

export const auth = createAuth();

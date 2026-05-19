import { auth } from "@better-auth-devtools/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

function formatDate(date: Date) {
	return new Intl.DateTimeFormat("en", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
}

export default async function DashboardPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		redirect("/auth");
	}

	const displayName =
		session.user.name || session.user.email || "Authenticated user";
	const initials = displayName
		.split(/\s+/)
		.map((part) => part[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();
	const proofRows = [
		["Status", "Authenticated"],
		["Email", session.user.email],
		["User ID", session.user.id],
		["Expires", formatDate(session.session.expiresAt)],
	] as const;

	return (
		<div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
			<main className="flex w-full max-w-3xl flex-1 flex-col border-zinc-100 border-x bg-white px-6 py-8 sm:px-12 sm:py-10 dark:border-zinc-900 dark:bg-black">
				<nav className="flex items-center justify-between gap-4 text-sm">
					<div className="flex items-center gap-5 text-zinc-500 dark:text-zinc-400">
						<a
							href="/"
							className="transition-colors hover:text-zinc-950 dark:hover:text-zinc-50"
						>
							Home
						</a>
						<span className="font-medium text-zinc-950 dark:text-zinc-50">
							Dashboard
						</span>
					</div>
					<a
						href="https://github.com/better-auth/better-auth"
						className="rounded-full border border-black/8 px-3 py-1.5 font-medium text-xs text-zinc-700 transition-colors hover:bg-black/4 dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-white/10"
						target="_blank"
						rel="noopener noreferrer"
					>
						GitHub Repo
					</a>
				</nav>

				<section className="mt-20 flex flex-col gap-4 sm:mt-28">
					<p className="flex items-center gap-2 font-medium text-emerald-700 text-xs dark:text-emerald-400">
						<span className="size-1.5 rounded-full bg-emerald-500" />
						Authenticated session
					</p>
					<div className="space-y-3">
						<h1 className="max-w-md font-semibold text-2xl text-black leading-8 tracking-tight dark:text-zinc-50">
							Signed in as {displayName}.
						</h1>
						<p className="max-w-xl text-sm text-zinc-600 leading-7 dark:text-zinc-400">
							This protected dashboard only renders after the server confirms a
							valid session. The details below come directly from
							<code className="mx-1 rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
								auth.api.getSession
							</code>
							.
						</p>
					</div>
				</section>

				<section className="mt-10 rounded-3xl bg-zinc-50 p-4 dark:bg-zinc-950">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-3">
							<div className="flex size-10 items-center justify-center rounded-full bg-black font-semibold text-white text-xs dark:bg-white dark:text-black">
								{initials}
							</div>
							<div>
								<p className="font-medium text-sm text-zinc-950 dark:text-zinc-50">
									{displayName}
								</p>
								<p className="text-xs text-zinc-500 dark:text-zinc-400">
									{session.user.email}
								</p>
							</div>
						</div>
						<p className="rounded-full border border-zinc-200 bg-white px-3 py-1 font-medium text-xs text-zinc-600 dark:border-zinc-800 dark:bg-black dark:text-zinc-400">
							Email {session.user.emailVerified ? "verified" : "unverified"}
						</p>
					</div>
				</section>

				<section className="mt-8">
					<h2 className="font-medium text-black text-sm dark:text-zinc-50">
						Session proof
					</h2>
					<div className="mt-3 divide-y divide-zinc-100 rounded-3xl border border-zinc-100 bg-white/70 dark:divide-zinc-900 dark:border-zinc-900 dark:bg-zinc-950/40">
						{proofRows.map(([label, value]) => (
							<div
								key={label}
								className="grid gap-1.5 px-4 py-3 text-xs sm:grid-cols-[7rem_1fr]"
							>
								<span className="text-zinc-500 dark:text-zinc-400">
									{label}
								</span>
								<span className="break-all font-mono text-zinc-800 dark:text-zinc-200">
									{value}
								</span>
							</div>
						))}
					</div>
				</section>
			</main>
		</div>
	);
}

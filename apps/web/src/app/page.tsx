import { auth } from "@better-auth-devtools/auth";
import { headers } from "next/headers";

export default async function Home() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	const primaryHref = session?.user ? "/dashboard" : "/auth";
	const primaryLabel = session?.user ? "Dashboard" : "Login";

	return (
		<div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
			<main className="flex w-full max-w-3xl flex-1 flex-col border-zinc-100 border-x bg-white px-6 py-8 sm:px-12 sm:py-10 dark:border-zinc-900 dark:bg-black">
				<nav className="flex items-center justify-between gap-4 text-sm">
					<div className="flex items-center gap-5 text-zinc-500 dark:text-zinc-400">
						<span className="font-medium text-zinc-950 dark:text-zinc-50">
							Home
						</span>
						<a
							href="/dashboard"
							className="transition-colors hover:text-zinc-950 dark:hover:text-zinc-50"
						>
							Dashboard
						</a>
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
					<p className="font-medium text-xs text-zinc-500 dark:text-zinc-400">
						Better Auth Devtools
					</p>
					<div className="space-y-3">
						<h1 className="max-w-md font-semibold text-2xl text-black leading-8 tracking-tight dark:text-zinc-50">
							Better Auth Devtools proof of concept.
						</h1>
						<p className="max-w-xl text-sm text-zinc-600 leading-7 dark:text-zinc-400">
							This repo showcases a lightweight demo for exploring Better Auth
							Devtools, validating auth flows, and making the integration story
							easy to review. Learn more about{" "}
							<a
								href="https://www.better-auth.com"
								className="font-medium text-zinc-950 dark:text-zinc-50"
								target="_blank"
								rel="noopener noreferrer"
							>
								Better Auth
							</a>{" "}
							and browse the{" "}
							<a
								href="https://www.better-auth.com/docs"
								className="font-medium text-zinc-950 dark:text-zinc-50"
								target="_blank"
								rel="noopener noreferrer"
							>
								documentation
							</a>
							.
						</p>
					</div>
					<div className=" flex flex-col gap-3 font-medium text-sm sm:flex-row">
						<a
							className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-foreground px-4 text-background transition-colors hover:bg-[#383838] sm:w-36 dark:hover:bg-[#ccc]"
							href={primaryHref}
						>
							{primaryLabel}
						</a>
						<a
							className="flex h-10 w-full items-center justify-center rounded-full border border-black/8 px-4 text-zinc-700 transition-colors hover:bg-black/4 sm:w-36 dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-white/10"
							href="https://github.com/better-auth/better-auth"
							target="_blank"
							rel="noopener noreferrer"
						>
							GitHub Repo
						</a>
					</div>
				</section>
			</main>
		</div>
	);
}

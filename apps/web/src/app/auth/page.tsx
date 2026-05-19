"use client";

import { useState } from "react";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

export default function AuthPage() {
	const [showSignIn, setShowSignIn] = useState(false);
	const title = showSignIn
		? "Welcome back."
		: "Create your Better Auth Devtools account.";
	const description = showSignIn
		? "Sign in to continue testing the auth flow and access the protected dashboard."
		: "Start with a simple email and password account so you can validate the full sign-up and session flow.";

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
						Authentication
					</p>
					<div className="space-y-3">
						<h1 className="max-w-xl font-semibold text-2xl text-black leading-8 tracking-tight dark:text-zinc-50">
							{title}
						</h1>
						<p className="max-w-xl text-sm text-zinc-600 leading-7 dark:text-zinc-400">
							{description}
						</p>
					</div>
				</section>

				<section className="mt-10 rounded-3xl border border-zinc-100 bg-zinc-50/80 p-6 sm:p-8 dark:border-zinc-900 dark:bg-zinc-950/40">
					{showSignIn ? (
						<SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
					) : (
						<SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
					)}
				</section>
			</main>
		</div>
	);
}

"use client";

import { BetterAuthDevtools } from "@better-auth-devtools/devtools";
import { Toaster } from "@better-auth-devtools/ui/components/sonner";
import { authClient } from "@/lib/auth-client";

import { ThemeProvider } from "./theme-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			disableTransitionOnChange
		>
			{children}
			<BetterAuthDevtools auth={authClient} />
			<Toaster richColors />
		</ThemeProvider>
	);
}

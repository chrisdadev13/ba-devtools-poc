import type { PropsWithChildren, ReactNode } from "react";

export type DevtoolsBoilerplateProps = PropsWithChildren<{
	title: string;
	description?: string;
	actions?: ReactNode;
	className?: string;
}>;

export function DevtoolsBoilerplate({
	title,
	description,
	actions,
	className,
	children,
}: DevtoolsBoilerplateProps) {
	return (
		<section className={className}>
			<div>
				<h2>{title}</h2>
				{description ? <p>{description}</p> : null}
			</div>
			{actions ? <div>{actions}</div> : null}
			{children ? <div>{children}</div> : null}
		</section>
	);
}

import {
	ActionIcon,
	Badge,
	Button,
	Container,
	Group,
	Stack,
	Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCalendar, IconPill, IconSettings } from "@tabler/icons-react";
import {
	createRootRoute,
	Link,
	Outlet,
	useLocation,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import { SettingsModal } from "~/components/SettingsModal";
import { useHasPausedChanges } from "~/lib/queries";

export const Route = createRootRoute({
	component: RootLayout,
});

function RootLayout() {
	const hasPausedChanges = useHasPausedChanges();
	const [settingsOpened, settings] = useDisclosure();

	return (
		<Container size="xs" py="md" px="md">
			<Stack gap="lg">
				<Group justify="space-between">
					<Title order={3}>Pill Tracker</Title>
					<Group gap="xs">
						{hasPausedChanges && (
							<Badge color="yellow" variant="light">
								Offline – synkroniseres senere
							</Badge>
						)}
						<ActionIcon
							variant="subtle"
							color="gray"
							aria-label="Indstillinger"
							onClick={settings.open}
						>
							<IconSettings size={20} />
						</ActionIcon>
					</Group>
				</Group>
				<SettingsModal opened={settingsOpened} onClose={settings.close} />

				<Group grow>
					<NavButton to="/" icon={<IconPill size={18} />}>
						I dag
					</NavButton>
					<NavButton to="/history" icon={<IconCalendar size={18} />}>
						Historik
					</NavButton>
				</Group>

				<Outlet />
			</Stack>
		</Container>
	);
}

function NavButton(props: {
	to: "/" | "/history";
	icon: ReactNode;
	children: ReactNode;
}) {
	const pathname = useLocation({ select: (location) => location.pathname });

	return (
		<Button
			component={Link}
			to={props.to}
			variant={pathname === props.to ? "light" : "subtle"}
			leftSection={props.icon}
		>
			{props.children}
		</Button>
	);
}

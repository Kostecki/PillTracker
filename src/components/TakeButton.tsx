import { UnstyledButton } from "@mantine/core";
import { IconCheck, IconPill } from "@tabler/icons-react";
import { useState } from "react";

import classes from "./TakeButton.module.css";

export function TakeButton(props: {
	taken: boolean;
	disabled: boolean;
	onPress: () => void;
}) {
	// Only animate a switch caused by a tap, not opening the app on a day
	// that's already done
	const [animate, setAnimate] = useState(false);

	return (
		<UnstyledButton
			className={classes.button}
			disabled={props.disabled || props.taken}
			data-taken={props.taken || undefined}
			data-animate={animate || undefined}
			aria-label={props.taken ? "Taget" : "Registrer pille"}
			onClick={() => {
				setAnimate(true);
				navigator.vibrate?.(20);
				props.onPress();
			}}
		>
			<svg className={classes.ring} viewBox="0 0 100 100" aria-hidden>
				<circle cx="50" cy="50" r="47.1" pathLength={1} />
			</svg>

			<span className={classes.face} aria-hidden>
				<IconPill size={96} stroke={1.5} />
			</span>
			<span className={classes.face} data-done aria-hidden>
				<IconCheck size={96} stroke={2.25} />
			</span>
		</UnstyledButton>
	);
}

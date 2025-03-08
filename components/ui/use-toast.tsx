import { useState, useEffect } from "react";

type ToastVariant = "default" | "destructive";

interface ToastProps {
	title: string;
	description: string;
	variant?: ToastVariant;
	duration?: number;
}

interface ToastState extends ToastProps {
	id: string;
	visible: boolean;
}

let toastCounter = 0;
const toasts: ToastState[] = [];
let listeners: (() => void)[] = [];

// Function to notify all listeners
const notifyListeners = () => {
	listeners.forEach((listener) => listener());
};

export function toast(props: ToastProps) {
	const id = `toast-${++toastCounter}`;
	const newToast: ToastState = {
		...props,
		id,
		visible: true,
		variant: props.variant || "default",
		duration: props.duration || 5000,
	};

	// Add toast to the array
	toasts.push(newToast);
	notifyListeners();

	// Auto-hide the toast after duration
	setTimeout(() => {
		const index = toasts.findIndex((t) => t.id === id);
		if (index !== -1) {
			toasts[index].visible = false;
			notifyListeners();

			// Remove from array after animation
			setTimeout(() => {
				const removeIndex = toasts.findIndex((t) => t.id === id);
				if (removeIndex !== -1) {
					toasts.splice(removeIndex, 1);
					notifyListeners();
				}
			}, 300);
		}
	}, newToast.duration);

	return id;
}

export function useToast() {
	const [, setUpdate] = useState(0);

	useEffect(() => {
		const listener = () => {
			setUpdate((prev) => prev + 1);
		};

		listeners.push(listener);
		return () => {
			listeners = listeners.filter((l) => l !== listener);
		};
	}, []);

	return {
		toasts: [...toasts],
		toast,
	};
}

// Toast component for rendering
export function ToastContainer() {
	const { toasts } = useToast();

	return (
		<div className="fixed top-0 right-0 p-4 z-50 flex flex-col gap-2">
			{toasts.map((toast) => (
				<div
					key={toast.id}
					className={`p-4 rounded-md shadow-md transition-all duration-300 ${
						toast.visible
							? "opacity-100 translate-y-0"
							: "opacity-0 -translate-y-2"
					} ${
						toast.variant === "destructive"
							? "bg-red-100 border border-red-200 text-red-800"
							: "bg-white border border-gray-200"
					}`}
				>
					<div className="font-semibold">{toast.title}</div>
					<div className="text-sm mt-1">{toast.description}</div>
				</div>
			))}
		</div>
	);
}

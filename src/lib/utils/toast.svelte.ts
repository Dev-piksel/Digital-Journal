export interface ToastMessage {
	id: string;
	text: string;
	type?: 'info' | 'success' | 'danger';
}

class ToastStore {
	toasts = $state<ToastMessage[]>([]);

	show(text: string, type: 'info' | 'success' | 'danger' = 'info', durationMs = 3200) {
		const id = Math.random().toString(36).slice(2, 9);
		this.toasts = [...this.toasts, { id, text, type }];

		setTimeout(() => {
			this.remove(id);
		}, durationMs);
	}

	remove(id: string) {
		this.toasts = this.toasts.filter((t) => t.id !== id);
	}
}

export const toast = new ToastStore();

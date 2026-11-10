import { create } from 'zustand';
export const useToastStore = create((set) => ({
    toasts: [],
    pushToast: (toast) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
        setTimeout(() => {
            set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
        }, 4500);
    },
    dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

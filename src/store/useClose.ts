import { create } from "zustand";

interface CloseState {
    isOpen: boolean;
    onClose: () => void;
    onOpen: () => void;
}

const useClose = create<CloseState>()((set) => ({
  isOpen: false,
  onClose: () => set({ isOpen: false }),
  onOpen: () => set({ isOpen: true })
}));

export default useClose;
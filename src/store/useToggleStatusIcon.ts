import { create } from "zustand";

type State = {
    open: boolean;
    setToggle: () => void;
}

const useToggleStatusIcon = create<State>()((set, get) => ({
    open: false,
    setToggle: () => set({ open: !get().open })
}));

export default useToggleStatusIcon;
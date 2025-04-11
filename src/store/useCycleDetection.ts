import { create } from "zustand";

interface CycleDetectionState {
    cycleDetected: boolean;
    setCycleDetected: (cycleDetected: boolean) => void;
}

const cycleDetection = create<CycleDetectionState>()((set) => ({
    cycleDetected: false,
    setCycleDetected: (cycleDetected: boolean) => set({ cycleDetected }),
}))

export default cycleDetection;
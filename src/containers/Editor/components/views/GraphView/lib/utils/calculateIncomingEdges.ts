import { NodeData } from "reaflow";
import type { EdgeData } from "src/types/graph";

export const calculateIncomingEdges = (edges: EdgeData[], freqMap: Map<string, Set<string>>) => {
    edges.forEach(e => {
        if(freqMap[e.to]) {
            freqMap[e.to].value++;
            freqMap[e.to].parents.add(e.from);
        }
        else {
            freqMap[e.to] = {
                value: 1,
                parents: new Set([e.from])
            };
        }
    });
}
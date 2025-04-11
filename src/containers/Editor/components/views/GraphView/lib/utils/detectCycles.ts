import { getOutgoers } from "./getOutgoers";
import { Graph, GraphActions } from "../../stores/useGraph";
import { NodeData, EdgeData } from "src/types/graph";

export const detectCycles = (edges: EdgeData[], setDetectCycles: (detectCycles: boolean) => void, get: () => Graph & GraphActions) => {
    const visitedNodes = new Set();
    const queue: NodeData[] = [];
    const indegree: { [key: string]: number } = {};
    const toposort: NodeData[] = [];

    queue.push(get().nodes[0]);

    // find indegree of each node
    while(queue.length) {
        const node = queue.shift();
        
        if(node?.id) {
            const [outgoerNodes] = getOutgoers(
                node.id,
                get().nodes,
                get().edges,
                get().collapsedParents,
                get().freqMap,
                true,
                get().collapsedNodes,
                get().collapsedEdges
            );

            outgoerNodes.forEach((outgoerNode) => {
                if (!indegree[outgoerNode.id]) {
                    indegree[outgoerNode.id] = 0;
                }
                indegree[outgoerNode.id] += 1;  // Directly update the object

                if(!visitedNodes.has(outgoerNode.id)) {
                    visitedNodes.add(outgoerNode.id);
                    queue.push(outgoerNode);
                }
            })
        }
    }

    const finalResult: NodeData[] = [];

    // push toposort with indegree 0 nodes
    get().nodes.forEach((node) => {
        if(!(node.id in indegree) || indegree[node.id] === 0) {
            toposort.push(node);
            finalResult.push(node);
        }
    });


    // if toposort not possible cycle detected
    if(toposort.length === 0) {
        setDetectCycles(true);
        return;
    }

    while(toposort.length) {
        const node = toposort.shift();

        if(node && node.id) {
            const [outgoerNodes] = getOutgoers(
                node.id,
                get().nodes,
                get().edges,
                get().collapsedParents,
                get().freqMap,
                true,
                get().collapsedNodes,
                get().collapsedEdges
            );

            outgoerNodes.forEach(outgoerNode => {
                const currValue = indegree[outgoerNode.id];
                if(currValue) {
                    indegree[outgoerNode.id] = currValue - 1;
                    if(currValue - 1 === 0) {
                        toposort.push(outgoerNode);
                        finalResult.push(outgoerNode);
                    }
                }
            });
        }
    }

    if(finalResult.length === get().nodes.length) {
        setDetectCycles(false);
        return;
    }

    setDetectCycles(true);
}
import type { NodeData, EdgeData } from "src/types/graph";

export const getChildrenEdges = (nodes: NodeData[], edges: EdgeData[], currNodeId: string, freqMap: Map<string, number>, isExpand: boolean = false) => {
  const nodeIds = nodes.map(node => node.id);

  // Edge bug fixed:
  // before: all edges from and to were removed
  // after: the childNodes outGoing edge and currNode outgoing has to be removed
  const childrenEdges = edges.filter(
    // edge => nodeIds.includes(edge.from as string) || nodeIds.includes(edge.to as string)
    edge => nodeIds.includes(edge.from as string) || currNodeId === edge.from
  );

  if(isExpand) {
    childrenEdges.forEach(edge => {
      freqMap[edge.to].value++;
      freqMap[edge.to].parents.add(edge.from);
    });
  }

  return childrenEdges;
};

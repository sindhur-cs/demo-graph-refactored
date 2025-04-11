import type { NodeData, EdgeData } from "src/types/graph";

type Outgoers = [NodeData[], EdgeData[]];

export const getHighlightedPath = (
  nodeId: string,
  nodes: NodeData[],
  edges: EdgeData[],
  parent: string[] = [],
  collapsedEdges: string[]
): Outgoers => {
  let outgoerNodes: NodeData[] = [];
  const matchingNodes: string[] = [];
  const outgoerEdges: EdgeData[] = [];
  const visitedNodes: string[] = [];

  if (parent.includes(nodeId)) {
    const initialParentNode = nodes.find(n => n.id === nodeId);

    if (initialParentNode) outgoerNodes.push(initialParentNode);
  }

  const findOutgoers = (currentNodeId: string) => {
    outgoerEdges.push(...edges.filter(e => e.from === currentNodeId && !collapsedEdges.includes(e.id)));
    const outgoerIds = outgoerEdges.filter(e => e.from === currentNodeId).map(e => e.to);
    
    const nodeList = nodes.filter(n => {
      if (parent.includes(n.id) && !matchingNodes.includes(n.id)) matchingNodes.push(n.id);
      
      // exclude the nodeId and n.id because that would lead the clicked node to collapse as well 
      if(outgoerIds.includes(n.id) && !parent.includes(n.id) && n.id !== nodeId) {
        return n;
      }
    });
    
    outgoerNodes.push(...nodeList);
    nodeList.forEach(node => {
      // go through this 
      if(!visitedNodes.includes(node.id)) {
        visitedNodes.push(node.id);
        findOutgoers(node.id);
      }
    });
  };

  findOutgoers(nodeId);
  
  return [outgoerNodes, outgoerEdges];
};

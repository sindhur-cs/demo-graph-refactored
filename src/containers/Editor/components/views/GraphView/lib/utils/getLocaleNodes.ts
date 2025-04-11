import { NodeData } from "src/types/graph";

export const getLocaleNodes = (nodes: NodeData[], filter: string, nodeMapping: any, filterType: string): [string[]] => {
    const highlightedNodes = new Set<string>();
 
    Array.from(nodeMapping).map((node: any) => {
        const nodeId = node[1];
        const currNode = nodes.find(node => node.id === nodeId);

        if(filterType === "locale" && Array.isArray(currNode?.text) && currNode?.text?.find(t => t[0] === "locale")?.[1] === filter) {
            highlightedNodes.add(nodeId);
        }
        else {
            const isNode = nodes.find((node: NodeData) => node.id === nodeId);

            // when content type filter is applied highlight content type based on filter
            if(filterType === "content-type" && isNode && Array.isArray(isNode.text)) {
                // highlight those nodes who content type matches the selected filter bu should not be a base entry
                const hasMatchingContentType = isNode.text.some((item: any) => item[0] === "content_type_uid" && item[1] === filter);
                
                if (hasMatchingContentType) {
                    highlightedNodes.add(nodeId);
                }
            }
            // when worflow filter is applied highlight workflow based on filter
            else if(filterType === "workflow" && isNode && Array.isArray(isNode.text)){
                const hasWorkflowStage = isNode.text.some((item: any) => item[0] === "workflow_stage" && item[1] === filter);

                if(hasWorkflowStage) {
                    highlightedNodes.add(nodeId);
                }
            }
        }
    });

    return [Array.from(highlightedNodes)];
}
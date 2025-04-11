import React from "react";
import type { NodeProps } from "reaflow";
import { Node } from "reaflow";
import type { NodeData } from "src/types/graph";
import { ObjectNode } from "./ObjectNode";
import { TextNode } from "./TextNode";

export interface CustomNodeProps {
  node: NodeData;
  x: number;
  y: number;
  hasCollapse?: boolean;
}

const rootProps = {
  rx: 50,
  ry: 50,
};

const CustomNodeWrapper = (nodeProps: NodeProps<NodeData["data"]>) => {
  const data = nodeProps.properties.data;

  return (
    <Node
      {...nodeProps}
      {...(data?.isEmpty && rootProps)}
      animated={false}
      label={null as any}
      style={{
        fill: "transparent",
        opacity: 0,
      }}
    >
      {({ node, x, y }) => {
        if (Array.isArray(nodeProps.properties.text)) {
          if (data?.isEmpty) return null;
          return <ObjectNode node={node as NodeData} x={x} y={y} />;
        }
        
        return (
          <TextNode 
            node={node as NodeData} 
            hasCollapse={!!data?.childrenCount} 
            x={x} 
            y={y} 
          />
        );
      }}
    </Node>
  );
};

export const CustomNode = React.memo(CustomNodeWrapper);
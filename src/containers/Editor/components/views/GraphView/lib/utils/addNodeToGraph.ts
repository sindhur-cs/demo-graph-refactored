import type { NodeType } from "jsonc-parser";
import type { Graph } from "src/containers/Editor/components/views/GraphView/lib/jsonParser";
import { calculateNodeSize } from "src/containers/Editor/components/views/GraphView/lib/utils/calculateNodeSize";
import { v4 as uuidv4 } from 'uuid';

type Props = {
  graph: Graph;
  text: string | [string, string][];
  isEmpty?: boolean;
  type?: NodeType;
  color?: string[];
};

export const addNodeToGraph = ({ graph, text, type = "null", isEmpty = false, color }: Props) => {
  const id = uuidv4();
  const isParent = type === "array" || type === "object";
  const { width, height } = calculateNodeSize(text, isParent);

  console.log(text);

  // simulating the errors or checks
  const node = {
    id,
    text,
    width,
    height,
    isError: Math.random() > 0.5,
    color, 
    data: {
      type,
      isParent,
      isEmpty,
      childrenCount: isParent ? 1 : 0,
    },
  };

  graph.nodes.push(node);

  return id;
};

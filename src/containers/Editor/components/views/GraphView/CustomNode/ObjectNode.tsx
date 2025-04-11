import React from "react";
import type { CustomNodeProps } from "src/containers/Editor/components/views/GraphView/CustomNode";
import { TextRenderer } from "./TextRenderer";
import * as Styled from "./styles";
import { CheckCircle, TriangleAlert } from "lucide-react";
import useToggleStatusIcon from "src/store/useToggleStatusIcon";
import useClose from "src/store/useClose";
import { getHighlightedPath } from "../lib/utils/getHighlightedPath";
import useGraph from "../stores/useGraph";
import { NodeData } from "src/types/graph";

type Value = [string, string];

type RowProps = {
  val: Value;
  x: number;
  y: number;
  index: number;
  node: NodeData;
};

const Row = ({ val, x, y, index, node }: RowProps) => {
  const key = JSON.stringify(val);
  const rowKey = JSON.stringify(val[0])?.replaceAll('"', "");
  const rowValue = JSON.stringify(val[1]);

  return (
    <Styled.StyledRow style={{ color: node.color?.[1] }} $value={rowValue} data-key={key} data-x={x} data-y={y + index * 17.8}>
      <Styled.StyledKey style={{ color: node.color?.[1] }} $type="object">{rowKey}{rowValue && ":"} </Styled.StyledKey>
      <TextRenderer>{rowValue}</TextRenderer>
    </Styled.StyledRow>
  );
};

const Node = ({ node, x, y }: CustomNodeProps) => {
  const { open } = useToggleStatusIcon();
  const { onOpen } = useClose();
  const { nodes } = useGraph();
  const { edges, collapsedEdges } = useGraph();
  const { setHighlightedPaths, highlightedNodes } = useGraph();

  const handleNodeClick = () => {
    const highlightedPaths = getHighlightedPath(node.id, nodes, edges, [], collapsedEdges);
    setHighlightedPaths(highlightedPaths[1].map((path) => path.id), [...highlightedPaths[0].map((path) => path.id), node.id], node.id);
  };

  const handleIconClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onOpen();
  }

  return (
    <Styled.StyledForeignObject width={node.width} height={node.height} x={0} y={0} $isObject style={{ backgroundColor: node.color?.[0] }} onClick={handleNodeClick} className={`${(highlightedNodes.has(node.id) || highlightedNodes.size === 0) ? "opacity-100 text-opacity-100" : "opacity-20 text-opacity-20"}`}>
      {open ? 
        (!(node.isError) ? <div className="flex items-center justify-center absolute -top-2 -right-2 z-50 bg-green-500 rounded-full w-8 h-8 cursor-pointer" onClick={handleIconClick}>
            <CheckCircle className="text-white w-5 h-5" />
          </div> 
          : 
          <div className="flex items-center justify-center absolute -top-2 -right-2 z-50 bg-red-500 rounded-full w-8 h-8 cursor-pointer" onClick={handleIconClick}>
            <TriangleAlert className="text-white w-5 h-5" />
          </div>) 
          : 
        null}
      {(node.text as Value[]).map((val, idx) => (
        <Row val={val} index={idx} x={x} y={y} key={idx} node={node} />
      ))}
    </Styled.StyledForeignObject>
  );
};

function propsAreEqual(prev: CustomNodeProps, next: CustomNodeProps) {
  return String(prev.node.text) === String(next.node.text) && prev.node.width === next.node.width;
}

export const ObjectNode = React.memo(Node, propsAreEqual);

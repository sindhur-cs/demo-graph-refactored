import React from "react";
import type { EdgeProps } from "reaflow";
import { Edge } from "reaflow";
import useGraph from "../stores/useGraph";

const CustomEdgeWrapper = (props: EdgeProps) => {
  const { highlighedPaths, highlightedNodes } = useGraph();

  return <Edge containerClassName={`edge-${props.id}`} {...props} interpolation="curved" style={{
    stroke: highlighedPaths.has(props.id.slice(11)) ? "darkblue" : !(highlighedPaths.size === 0) && "gray",
    opacity: highlighedPaths.has(props.id.slice(11)) || ((highlighedPaths.size === 0) && highlightedNodes.size === 0) ? 1 : 0.2
  }}/>;
};

export const CustomEdge = React.memo(CustomEdgeWrapper);

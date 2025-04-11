import type { NodeType } from "jsonc-parser";

export interface NodeData {
  id: string;
  text: string | [string, string][];
  width: number;
  height: number;
  isError: boolean;
  color?: string[];
  path?: string;
  data: {
    type: NodeType;
    isParent: boolean;
    isEmpty: boolean;
    childrenCount: number;
  };
}

export interface EdgeData {
  id: string;
  from: string;
  to: string;
}

export type LayoutDirection = "LEFT" | "RIGHT" | "DOWN" | "UP";

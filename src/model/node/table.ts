import { Circle } from "./Circle.js";
import { Defs } from "./Defs.js";
import { Ellipse } from "./Ellipse.js";
import { Group } from "./Group.js";
import { Line } from "./Line.js";
import { PlainTextNode } from "./PlainTextNode.js";
import { Polygon } from "./Polygon.js";
import { Rect } from "./Rect.js";
import { Svg } from "./Svg.js";
import { Switch } from "./Switch.js";
import { Symbol as SvgSymbol } from "./Symbol.js";
import { TextPath } from "./TextPath.js";
import { TextWrapper } from "./TextWrapper.js";
import { Tspan } from "./Tspan.js";
import type { NodeBase } from "./NodeBase.js";
import { ElementNode } from "./ElementNode.js";

export const NODE_TYPES = {
  rect: Rect,
  circle: Circle,
  ellipse: Ellipse,
  line: Line,
  polygon: Polygon,
  g: Group,
  defs: Defs,
  svg: Svg,
  symbol: SvgSymbol,
  switch: Switch,
  text: TextWrapper,
  tspan: Tspan,
  textPath: TextPath,
  "#text": PlainTextNode,
} as const;

export type NodeType = keyof typeof NODE_TYPES;
export type Node = InstanceType<
  (typeof NODE_TYPES)[NodeType]
>;
export type ElementName = Exclude<NodeType, "#text">;
export type Element = Exclude<Node, PlainTextNode>;

export function isElementNode(node: NodeBase): node is Element {
  return node instanceof ElementNode;
}


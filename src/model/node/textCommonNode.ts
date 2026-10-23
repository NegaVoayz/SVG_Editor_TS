import { TextPath } from "./TextPath.js";
import { TextWrapper } from "./TextWrapper.js";
import { Tspan } from "./Tspan.js";
import type { TextCommon, TextNode } from "./TextNode.js";

export type ConcreteTextNode = TextWrapper | Tspan | TextPath;

export function withTextCommon(
  node: TextNode,
  common: TextCommon,
): ConcreteTextNode {
  if (node instanceof TextWrapper) {
    return new TextWrapper(
      common,
      node.identity,
      node.paint,
      node.transformAttr,
    );
  }
  if (node instanceof Tspan) {
    return new Tspan(
      common,
      node.identity,
      node.paint,
      node.transformAttr,
    );
  }
  if (node instanceof TextPath) {
    return new TextPath(
      node.startOffset,
      node.href,
      common,
      node.identity,
      node.paint,
      node.transformAttr,
    );
  }
  throw new Error("unsupported text node kind");
}


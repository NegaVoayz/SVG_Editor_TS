import {
  TextPath,
  TextWrapper,
  Tspan,
  type TextNode,
} from "../../model/node/index.js";
import type { TextCommon } from "../../model/node/index.js";

export function textWithCommon(
  node: TextNode,
  common: TextCommon,
): TextNode {
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


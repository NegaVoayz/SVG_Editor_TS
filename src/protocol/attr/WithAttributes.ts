import type { TextAnchor } from "../../model/node/TextNode.js";
import type { Paint } from "../../model/values/Paint.js";
import type { LengthPercentage } from "../../model/values/LengthPercentage.js";
import type { Transform } from "../../model/values/Transform.js";
import type { ViewBox } from "../../model/values/ViewBox.js";

export interface WithX<T extends LengthPercentage = LengthPercentage> {
  withX(value: T): this;
}
export interface WithY<T extends LengthPercentage = LengthPercentage> {
  withY(value: T): this;
}
export interface WithW<T extends LengthPercentage = LengthPercentage> {
  withW(value: T): this;
}
export interface WithH<T extends LengthPercentage = LengthPercentage> {
  withH(value: T): this;
}
export interface WithCx<T extends LengthPercentage = LengthPercentage> {
  withCx(value: T): this;
}
export interface WithCy<T extends LengthPercentage = LengthPercentage> {
  withCy(value: T): this;
}
export interface WithR<T extends LengthPercentage = LengthPercentage> {
  withR(value: T): this;
}
export interface WithRx<T extends LengthPercentage = LengthPercentage> {
  withRx(value: T): this;
}
export interface WithRy<T extends LengthPercentage = LengthPercentage> {
  withRy(value: T): this;
}
export interface WithX1<T extends LengthPercentage = LengthPercentage> {
  withX1(value: T): this;
}
export interface WithY1<T extends LengthPercentage = LengthPercentage> {
  withY1(value: T): this;
}
export interface WithX2<T extends LengthPercentage = LengthPercentage> {
  withX2(value: T): this;
}
export interface WithY2<T extends LengthPercentage = LengthPercentage> {
  withY2(value: T): this;
}
export interface WithDx<T extends LengthPercentage = LengthPercentage> {
  withDx(value: T): this;
}
export interface WithDy<T extends LengthPercentage = LengthPercentage> {
  withDy(value: T): this;
}
export interface WithStrokeWidth<T extends LengthPercentage = LengthPercentage> {
  withStrokeWidth(value: T): this;
}
export interface WithWidth<T extends LengthPercentage = LengthPercentage> {
  withWidth(value: T): this;
}
export interface WithHeight<T extends LengthPercentage = LengthPercentage> {
  withHeight(value: T): this;
}
export interface WithStartOffset<T extends LengthPercentage = LengthPercentage> {
  withStartOffset(value: T): this;
}
export interface WithXmlns {
  withXmlns(value: string): this;
}
export interface WithViewBox {
  withViewBox(value: ViewBox): this;
}
export interface WithTextAnchor {
  withTextAnchor(value: TextAnchor): this;
}
export interface WithFontSize {
  withFontSize(value: LengthPercentage): this;
}
export interface WithClass {
  withClass(value: string): this;
}
export interface WithFill {
  withFill(value: Paint): this;
}
export interface WithStroke {
  withStroke(value: Paint): this;
}
export interface WithTransform {
  withTransform(value: Transform): this;
}
export interface WithHref {
  withHref(value: string): this;
}
export interface WithText {
  withText(value: string): this;
}
export interface WithContent {
  withContent(value: string): this;
}

export function isWithX<T extends LengthPercentage>(
  node: object,
): node is WithX<T> {
  return "withX" in node;
}

export function isWithFill(node: object): node is WithFill {
  return "withFill" in node;
}


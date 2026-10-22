export enum LengthUnit {
  UserUnit = "user-unit",
  Em = "em",
  Ex = "ex",
  Px = "px",
  Pt = "pt",
  Mm = "mm",
  Cm = "cm",
  In = "in",
}

export function unitText(unit: LengthUnit): string {
  switch (unit) {
    case LengthUnit.UserUnit:
      return "";
    case LengthUnit.Em:
      return "em";
    case LengthUnit.Ex:
      return "ex";
    case LengthUnit.Px:
      return "px";
    case LengthUnit.Pt:
      return "pt";
    case LengthUnit.Mm:
      return "mm";
    case LengthUnit.Cm:
      return "cm";
    case LengthUnit.In:
      return "in";
  }
}


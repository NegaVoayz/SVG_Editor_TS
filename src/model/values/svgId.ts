export const ROOT_ALIAS = "svg";

function isStart(character: string): boolean {
  const value = character.codePointAt(0);
  if (value === undefined) {
    return false;
  }
  return (
    (value >= 65 && value <= 90) ||
    (value >= 97 && value <= 122) ||
    value === 58 ||
    value === 95 ||
    value >= 128
  );
}

function isCharacter(character: string): boolean {
  const value = character.codePointAt(0);
  if (value === undefined) {
    return false;
  }
  return (
    isStart(character) ||
    (value >= 48 && value <= 57) ||
    value === 45 ||
    value === 46
  );
}

export function validSvgId(id: string): boolean {
  const characters = Array.from(id);
  const first = characters[0];
  if (first === undefined || !isStart(first)) {
    return false;
  }
  return characters.slice(1).every((character) => isCharacter(character));
}

export function reservedSvgId(id: string): boolean {
  return id === ROOT_ALIAS;
}


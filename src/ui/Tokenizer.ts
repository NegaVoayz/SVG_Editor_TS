export class Tokenizer {
  public tokenize(line: string): readonly string[] {
    const words: string[] = [];
    let index = 0;
    while (index < line.length) {
      while (index < line.length && /\s/u.test(line[index] ?? "")) {
        index += 1;
      }
      if (index >= line.length) {
        break;
      }

      let word = "";
      if (line[index] === '"') {
        index += 1;
        while (index < line.length) {
          const character = line[index] ?? "";
          if (
            character === "\\" &&
            index + 1 < line.length &&
            (line[index + 1] === '"' || line[index + 1] === "\\")
          ) {
            word += line[index + 1] ?? "";
            index += 2;
            continue;
          }
          if (character === '"') {
            index += 1;
            break;
          }
          word += character;
          index += 1;
        }
      } else {
        let brackets = 0;
        while (index < line.length) {
          const character = line[index] ?? "";
          if (character === "(") {
            brackets += 1;
          } else if (character === ")") {
            brackets -= 1;
          }
          if (brackets <= 0 && /\s/u.test(character)) {
            break;
          }
          word += character;
          index += 1;
        }
      }
      words.push(word);
    }
    return words;
  }

  public static startsComment(line: string): boolean {
    return line.trimStart().startsWith("#");
  }
}


/** Naming helpers shared by emitters. Emitters derive language names from IR names; the IR stores none. */

export function capitalize(text) {
  return text.length === 0 ? text : text[0].toUpperCase() + text.slice(1);
}

/** Splits `liveSessionParticipants`, `LiveSessionPage` or `SESSION_ISSUE` into lower-case words. */
export function words(text) {
  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(word => word.toLowerCase());
}

export const pascalCase = text => words(text).map(capitalize).join("");
export const camelCase = text => {
  const pascal = pascalCase(text);
  return pascal.length === 0 ? pascal : pascal[0].toLowerCase() + pascal.slice(1);
};
export const snakeCase = text => words(text).join("_");
export const screamingSnakeCase = text => snakeCase(text).toUpperCase();
export const kebabCase = text => words(text).join("-");

const DIGIT_0 = 48;
const DIGIT_9 = 57;
const isDigit = code => !Number.isNaN(code) && code >= DIGIT_0 && code <= DIGIT_9;

/**
 * Digit-aware code-unit comparison, ported from graphql-js `naturalCompare`
 * (MIT). graphql-js uses it to sort schemas lexicographically, which is the
 * order graphql-codegen prints schema types in.
 */
export function naturalCompare(aText, bText) {
  let aIndex = 0;
  let bIndex = 0;
  while (aIndex < aText.length && bIndex < bText.length) {
    let aChar = aText.charCodeAt(aIndex);
    let bChar = bText.charCodeAt(bIndex);
    if (isDigit(aChar) && isDigit(bChar)) {
      let aNumber = 0;
      do {
        ++aIndex;
        aNumber = aNumber * 10 + aChar - DIGIT_0;
        aChar = aText.charCodeAt(aIndex);
      } while (isDigit(aChar) && aNumber > 0);
      let bNumber = 0;
      do {
        ++bIndex;
        bNumber = bNumber * 10 + bChar - DIGIT_0;
        bChar = bText.charCodeAt(bIndex);
      } while (isDigit(bChar) && bNumber > 0);
      if (aNumber < bNumber) return -1;
      if (aNumber > bNumber) return 1;
    } else {
      if (aChar < bChar) return -1;
      if (aChar > bChar) return 1;
      ++aIndex;
      ++bIndex;
    }
  }
  return aText.length - bText.length;
}

/**
 * graphql-codegen's default type naming (`convertFactory` without a
 * namingConvention): change-case-all `pascalCase` applied to each
 * underscore-separated part. Ported for GraphQL names, which are ASCII.
 */
export function codegenTypeName(name) {
  return name.split("_").map(codegenPascalCase).join("_");
}

function codegenPascalCase(part) {
  return changeCaseWords(part).map((word, index) => {
    const first = word[0];
    const initial = index > 0 && first >= "0" && first <= "9" ? `_${first}` : first.toUpperCase();
    return initial + word.slice(1).toLowerCase();
  }).join("");
}

function changeCaseWords(input) {
  const marked = input.trim()
    .replace(/([\p{Ll}\d])(\p{Lu})/gu, "$1\0$2")
    .replace(/(\p{Lu})([\p{Lu}][\p{Ll}])/gu, "$1\0$2")
    .replace(/[^\p{L}\d]+/giu, "\0");
  let start = 0;
  let end = marked.length;
  while (marked.charAt(start) === "\0") start++;
  if (start === end) return [];
  while (marked.charAt(end - 1) === "\0") end--;
  return marked.slice(start, end).split("\0");
}

/** Plain UTF-16 code-unit ordering; used for every IR list sorted "alphabetically". */
export function codeUnitCompare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

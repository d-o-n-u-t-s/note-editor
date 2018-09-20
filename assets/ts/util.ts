export function safe(expression: () => any, defaultValue: any = null) {
  try {
    return expression();
  } catch (e) {
    return defaultValue;
  }
}

export function guid(length = 32): string {
  return Array.from({ length })
    .map(() => ((Math.random() * 16) | 0).toString(16))
    .join("");
}

export type GUID = string;

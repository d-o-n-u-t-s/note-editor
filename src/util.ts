export function guid(length = 32): string {
  return Array.from({ length })
    .map(() => ((Math.random() * 16) | 0).toString(16))
    .join("");
}

export type GUID = string;

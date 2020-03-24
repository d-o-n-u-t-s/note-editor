/**
 * rgba を rgb と a に分離する
 * @param rgba rgba
 */
export function parseRgba(rgba: number) {
  const text = rgba.toString(16).padStart(8, "0");
  return {
    color: parseInt(text.substr(0, 6), 16),
    alpha: parseInt(text.substr(6, 2), 16) / 0xff
  };
}

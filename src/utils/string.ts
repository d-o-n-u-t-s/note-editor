/**
 * 文字列を非同期で置換する
 * @param str 文字列
 * @param regex 正規表現
 * @param replacer 置換処理
 */
export async function replaceAsync(
  str: string,
  regex: RegExp,
  replacer: (match: string, ...args: any[]) => Promise<string>
) {
  const promises: Promise<string>[] = [];
  str.replace(regex, (match, ...args) => {
    const promise = replacer(match, ...args);
    promises.push(promise);
    return "";
  });
  const data = await Promise.all(promises);
  return str.replace(regex, () => data.shift() as string);
}

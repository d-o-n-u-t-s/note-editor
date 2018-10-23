export function getUrlParams() {
  return location.search
    .substr(1)
    .split("&")
    .map(v => v.split("="))
    .reduce((a: any, b: any) => {
      a[b[0]] = b[1];
      return a;
    }, {});
}

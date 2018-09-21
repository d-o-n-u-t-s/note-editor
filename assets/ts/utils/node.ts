export const __require = (window as any).require;

const fsSync: any = __require("fs");
const util = __require("util");

export const fs = Object.assign(fsSync, {
  readFile: util.promisify(fsSync.readFile),
  readdir: util.promisify(fsSync.readdir)
});

import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

const readSubDirSync = (folderPath: string) => {
  let result: any[] = [];

  const readTopDirSync = (folderPath: string) => {
    let items = fs.readdirSync(folderPath);
    items = items.map(itemName => {
      return path.join(folderPath, itemName);
    });
    items.forEach(itemPath => {
      result.push(itemPath);
      if (fs.statSync(itemPath).isDirectory()) {
        readTopDirSync(itemPath);
        //再帰処理
      }
    });
  };
  readTopDirSync(folderPath);
  return result;
};

function replaceImports(src: string) {
  // console.log(src);

  return src.replace(/import[\s\S]+?;/g, (...args) => {
    const from = args[0].slice(
      args[0].indexOf(`"`) + 1,
      args[0].lastIndexOf(`"`)
    );

    // 相対パスなら無視
    if (from.startsWith("./")) return args[0];

    const s = "import".length;
    const e = args[0].lastIndexOf(`from`);

    console.error(from);

    return args[0]
      .slice(s, e)!
      .replace(/\n|\{|\}|\,|\*| as |/g, "")
      .split(" ")
      .filter(a => a.trim())
      .map(a => `type ${a} = any;`)
      .join("\n");
  });
}

const files = readSubDirSync("./assets/musicGameSystems");

for (const file of files.filter(f => f.endsWith(".ts"))) {
  var data = fs.readFileSync(file, "utf-8");

  const data2 = replaceImports(data);

  let result = ts.transpileModule(data2, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS
    }
  });

  fs.writeFileSync(file.replace(".ts", ".js"), result.outputText);
}

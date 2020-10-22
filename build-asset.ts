import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

/**
 * ファイルを列挙する
 * @param directoryPath 対象ディレクトリ
 */
const enumerateFiles = (directoryPath: string) => {
  const files: string[] = [];

  const readTopDirSync = (directoryPath: string) => {
    const items = fs.readdirSync(directoryPath).map((itemName) => {
      return path.join(directoryPath, itemName);
    });

    for (const itemPath of items) {
      files.push(itemPath);
      if (fs.statSync(itemPath).isDirectory()) {
        readTopDirSync(itemPath);
      }
    }
  };

  readTopDirSync(directoryPath);
  return files;
};

/**
 * import を変換する
 * @param src 変換ソース
 */
function replaceImports(src: string) {
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
      .filter((a) => a.trim())
      .map((a) => `type ${a} = any;`)
      .join("\n");
  });
}

const directoryPath = "./assets/musicGameSystems";

const files = enumerateFiles(directoryPath).filter((f) =>
  f.match(/src\/.*.ts$/)
);

console.log(files);

function sleep(time: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}

/**
 * .ts を .js にトランスパイルする
 * @param file 対象 .ts ファイル
 */
const transpile = async (file: string) => {
  await sleep(100);

  let data = fs.readFileSync("./" + file, "utf-8");
  data = replaceImports(data);

  const result = ts.transpileModule(data, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
    },
  });

  fs.writeFileSync(
    "./" + file.replace(".ts", ".js").replace("/src/", "/dest/"),
    result.outputText
  );
  console.log("transpiled: ", file, result.outputText.length);
};

// ファイルの更新を監視する
for (const file of files) {
  fs.watch(file, () => transpile(file));
}

for (const file of files) {
  transpile(file);
}

console.log("watch...");

import * as mobx from "mobx";

/**
 * getter/setter を省略できる observable
 * https://github.com/mobxjs/mobx/issues/839
 * @param target 対象
 * @param name プロパティ名
 * @param descriptor ディスクリプタ
 */
export default function box(
  target: Object,
  name: string | symbol,
  descriptor?: PropertyDescriptor
) {
  const privateName = `_${String(name)}`;
  mobx.observable(target, privateName, descriptor);
  return mobx.computed(target, name, {
    get() {
      return (this as any)[privateName];
    },
    set(value: any) {
      (this as any)[privateName] = value;
    },
  });
}

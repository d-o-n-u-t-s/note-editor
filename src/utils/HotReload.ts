export default class HotReload {
  /**
   * HotReload に対応した setInterval
   * @param symbol
   * @param callback
   * @param ms
   */
  static setInterval(
    symbol: string,
    callback: (...args: any[]) => void,
    ms: number
  ) {
    if ((window as any)[symbol]) {
      clearInterval((window as any)[symbol]);
    }

    (window as any)[symbol] = setInterval(callback, ms);
  }

  /**
   *
   */
  static override(target: any, key: string, overrideFunction: Function) {
    // 元のメソッドを保持しておく
    const base = ((window as any)[key] = (window as any)[key] || target[key]);

    target[key] = function (...args: any[]) {
      return overrideFunction(base.bind(this), ...args);
    };
  }
}

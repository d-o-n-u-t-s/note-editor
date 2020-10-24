const pressActions: Map<string, () => void> = new Map<string, () => void>();
const releaseActions: Map<string, () => void> = new Map<string, () => void>();
const isDowns: Map<string, boolean> = new Map<string, boolean>();

export function beginWatch() {
  window.addEventListener("keydown", (e) => {
    const action = pressActions.get(e.key);
    if (action) action();
    isDowns.set(e.key, true);
  });
  window.addEventListener("keyup", (e) => {
    const action = releaseActions.get(e.key);
    if (action) action();
    isDowns.set(e.key, false);
  });
}

export function onPress(key: string, action: () => void) {
  pressActions.set(key, action);
}

export function onRelease(key: string, action: () => void) {
  releaseActions.set(key, action);
}

export function isDown(key: string) {
  return isDowns.get(key) || false;
}

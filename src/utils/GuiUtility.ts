import { GUI } from "dat.gui";

export class GuiUtility {
  gui: GUI | null = null;

  update() {
    if (!this.gui) return;

    for (const button of (window as any).customButtons || []) {
      this.gui.remove(button);
    }
    (window as any).customButtons = [];
  }

  addButton(name: string, onClick: any) {
    if (!this.gui) return;

    (window as any).customButtons.push(
      this.gui.add(
        {
          [name]: onClick,
        },
        name
      )
    );
  }
}

export default new GuiUtility();

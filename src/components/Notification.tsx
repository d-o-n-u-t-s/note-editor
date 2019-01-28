import { observer } from "mobx-react";
import { InjectedNotistackProps, withSnackbar } from "notistack";
import * as React from "react";
import { inject, InjectedComponent } from "../stores/inject";

/**
 * 通知用コンポーネント
 */
@inject
@observer
class Notification extends InjectedComponent<InjectedNotistackProps> {
  /**
   * 通知する
   */
  notify = (notification: any) => {
    if (!notification) return;
    if (!notification.guid) return;

    this.props.enqueueSnackbar(notification.text, {
      variant: notification.type,
      anchorOrigin: {
        vertical: "bottom",
        horizontal: "right"
      }
    });
  };

  render() {
    this.notify(this.injected.editor.notification);

    return (
      <div style={{ display: "none" }}>
        {this.injected.editor.notification.guid}
      </div>
    );
  }
}

export default withSnackbar(Notification);

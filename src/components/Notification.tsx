import { observer } from "mobx-react";
import { withSnackbar, WithSnackbarProps } from "notistack";
import * as React from "react";
import { useStores } from "../stores/stores";

/**
 * 通知用コンポーネント
 */
const Notification = observer((props: WithSnackbarProps) => {
  const { editor } = useStores();

  /**
   * 通知する
   */
  function notify(notification: any) {
    if (!notification) return;
    if (!notification.guid) return;

    props.enqueueSnackbar(notification.text, {
      variant: notification.type,
      anchorOrigin: {
        vertical: "bottom",
        horizontal: "right",
      },
    });
  }

  notify(editor.notification);

  return <div style={{ display: "none" }}>{editor.notification.guid}</div>;
});

export default withSnackbar(Notification);

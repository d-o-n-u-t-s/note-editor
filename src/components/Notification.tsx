import { observer } from "mobx-react";
import { InjectedNotistackProps, withSnackbar } from "notistack";
import * as React from "react";
import { inject, InjectedComponent } from "../stores/inject";

@inject
@observer
class Notification extends InjectedComponent<InjectedNotistackProps> {
  state = {
    prevGuid: ""
  };

  shouldComponentUpdate(a: any, b: any) {
    console.log("NotiUpdate", a, b);

    return true;
  }

  render() {
    this.props.enqueueSnackbar(this.injected.editor.notification.text, {
      variant: "success",
      anchorOrigin: {
        vertical: "bottom",
        horizontal: "right"
      }
    });

    return (
      <div style={{ display: "none" }}>
        {this.injected.editor.notification.guid}
      </div>
    );
  }
}

export default withSnackbar(Notification);

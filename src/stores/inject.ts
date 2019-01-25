import { inject as mobxInject } from "mobx-react";
import * as React from "react";
import Editor from "./EditorStore";

export class InjectedComponent<
  P = {},
  S = {},
  SS = any
> extends React.Component<P, S, SS> {
  get injected() {
    return (this.props as any) as { editor: Editor };
  }
}

export const inject = mobxInject("editor");

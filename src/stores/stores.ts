import * as React from "react";
import Editor from "./EditorStore";

export const stores = {
  editor: new Editor()
};
export const context = React.createContext(stores);

export const useStores = () => React.useContext(context);

export default stores;

import StoreBase from "./StoreBase";
import IMultiWinStore from "./IMultiWinStore";
const { winManagerStoreName, winManagerKey } = require("./constants");

export default class ActionRecordStore extends StoreBase {
  clientId: string = "";

  setAction(action: string) {
    (this.appStores.multiWinStore as any).onChangeAction(this.clientId, action);
  }
}

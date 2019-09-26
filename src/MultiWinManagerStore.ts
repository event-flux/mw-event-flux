import StoreBase from "./MainStoreBase";
import { declareStoreMap } from "./StoreDeclarer";
import IExtendStoreBase from "./IExtendStoreBase";

export class WinPackStore extends StoreBase {
  destroy() {
    (this.getSubStores() || []).map(store => {
      store.destroy && store.destroy();
    });
  }
}

export default class MultiWinManagerStore extends StoreBase {
  winPackMapStore: any;

  constructor() {
    super();
    this.state = { clientIds: [] };
  }

  addWin(winId: string) {
    let { clientIds } = this.state;
    if (clientIds.indexOf(winId) === -1) {
      this.setState({ clientIds: [...clientIds, winId] });
      this.winPackMapStore.add(winId, (store: IExtendStoreBase) => {
        (store as any).clientId = winId;
      });
      this.emitter.emit("did-add-win", winId);
    }
  }

  deleteWin(winId: string) {
    let { clientIds } = this.state;
    let index = clientIds.indexOf(winId);
    if (index !== -1) {
      this.setState({
        clientIds: [...clientIds.slice(0, index), ...clientIds.slice(index + 1)],
      });
      this.emitter.emit("did-remove-win", winId);
    }
    if (!(this._appStore as any).willQuit) {
      this.winPackMapStore.get(winId).destroy();
    }
    this.winPackMapStore.delete(winId);
  }

  getClienIds() {
    return this.state.clientIds;
  }

  onDidAddWin(callback: (clientId: string) => void) {
    return this.emitter.on("did-add-win", callback);
  }

  onDidRemoveWin(callback: (clientId: string) => void) {
    return this.emitter.on("did-remove-win", callback);
  }
}

MultiWinManagerStore.innerStores = {
  winPackMap: declareStoreMap(WinPackStore, {
    defaultFilter: true,
    storeDefaultFilter: true,
  }),
};

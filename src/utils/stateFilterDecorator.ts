import { Emitter, Disposable } from "event-kit";
import { StoreBaseConstructor } from "../StoreBase";
import IStoresDeclarer from "../IStoresDeclarer";
import IExtendStoreBase, { IExtendStoreBaseConstructor } from "../IExtendStoreBase";
import { StoreMapConstructor } from "./StoreMap";
import { omit } from "./objUtils";

export default function(StoreClass: StoreBaseConstructor) {
  const ExtendStoreClass = (StoreClass as any) as IExtendStoreBaseConstructor;
  return class MainStoreBase extends ExtendStoreClass {
    static innerStores: IStoresDeclarer;
    _stateListeners: { [key: string]: any } = {};
    _stateFilters: { [key: string]: any } = {};
    _stateFiltersInit = false; // Check if or not the stateFilters has init

    appStores: any;

    getDefaultFilter(): { [key: string]: any } {
      if (this.options && this.options.defaultFilter) {
        return { "*": true };
      }
      return { "*": false };
    }

    _initForClientId = (clientId: string) => {
      let clientFilters = this.getDefaultFilter();
      this.getSubStoreInfos &&
        this.getSubStoreInfos().forEach(storeInfo => {
          let storeName = storeInfo[2];
          let stateKey = storeInfo[3];
          let subStore = this.getStore ? this.getStore(storeName) : (this as any)[storeName];
          let storeFilter = (subStore._stateFilters && subStore._stateFilters[clientId]) || { "*": true };
          if (stateKey) {
            clientFilters[stateKey] = storeFilter;
          } else {
            clientFilters = Object.assign(clientFilters, omit(storeFilter, "*"));
          }
        });
      this._stateFilters[clientId] = clientFilters;
    };

    _initStateFilters() {
      // Init the state filters for the window with clientId
      let winManagerStore = (this.appStores || this.getStores!()).winManagerStore;
      winManagerStore.getClienIds().forEach(this._initForClientId);
      this._stateFiltersInit = true;

      // winManagerStore.onDidAddWin(initForClientId);
      // winManagerStore.onDidRemoveWin((clientId) => this._stateFilters[clientId] = null);

      // For every subStore, we need update the filter when subStore filter changed.
      this.getSubStoreInfos &&
        this.getSubStoreInfos().forEach(storeInfo => {
          let storeName = storeInfo[2];
          let stateKey = storeInfo[3];
          let subStore = this.getStore ? this.getStore(storeName) : (this as any)[storeName];
          subStore.emitter.on("did-filter-update", ({ clientId, filters }: { clientId: string; filters: any }) => {
            if (stateKey) {
              this._setFilter(clientId, { [stateKey]: filters });
            } else {
              this._setFilter(clientId, omit(filters, "*"));
            }
          });
        });
    }

    _initWrap() {
      this._initStateFilters();
      super._initWrap();
    }

    _handleAddWin(clientId: string) {
      if (this._stateFiltersInit) {
        this.getSubStoreInfos &&
          this.getSubStoreInfos().forEach(storeInfo => {
            let storeName = storeInfo[2];
            let subStore = this.getStore ? this.getStore(storeName) : (this as any)[storeName];
            subStore._handleAddWin && subStore._handleAddWin(clientId);
          });
        this._initForClientId(clientId);
      }
    }

    _handleRemoveWin(clientId: string) {
      if (this._stateFiltersInit) {
        this._stateListeners[clientId] = 0;
        this._stateFilters[clientId] = null;
        this.getSubStoreInfos &&
          this.getSubStoreInfos().forEach(storeInfo => {
            let storeName = storeInfo[2];
            let subStore = this.getStore ? this.getStore(storeName) : (this as any)[storeName];
            subStore._handleRemoveWin && subStore._handleRemoveWin(clientId);
          });
      }
    }

    _setFilter(clientId: string, newFilter: any) {
      const filterRunner = () => {
        let oldFilters = this._stateFilters[clientId] || this.getDefaultFilter();
        let nextFilters = { ...oldFilters, ...newFilter };
        this._stateFilters[clientId] = nextFilters;
        if (this.emitter) {
          this.emitter.emit("did-filter-update", { clientId, filters: nextFilters });
        } else {
          this.handleFilterChange && this.handleFilterChange();
        }
      };
      filterRunner();
    }

    listen = function(this: MainStoreBase, clientId: string) {
      if (!clientId) {
        return console.error("The clientId is not specify");
      }
      let _stateListeners = this._stateListeners;
      if (_stateListeners[clientId] == null) {
        _stateListeners[clientId] = 0;
      }
      _stateListeners[clientId] += 1;
      if (_stateListeners[clientId] === 1) {
        this._setFilter(clientId, { "*": true });
      }
    };

    unlisten = function(this: MainStoreBase, clientId: string) {
      if (!clientId) {
        return console.error("The clientId is not specify");
      }
      let _stateListeners = this._stateListeners;
      _stateListeners[clientId] -= 1;
      if (_stateListeners[clientId] === 0) {
        this._setFilter(clientId, { "*": false });
      }
    };
  };
}

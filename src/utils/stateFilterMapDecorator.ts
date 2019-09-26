import { Emitter, Disposable } from "event-kit";
import { StoreBaseConstructor } from "../StoreBase";
import IStoresDeclarer from "../IStoresDeclarer";
import IExtendStoreBase, { IExtendStoreBaseConstructor } from "../IExtendStoreBase";
import { StoreMapConstructor } from "./StoreMap";
const omit = require("lodash/omit");

type KeyType = string | string[];

export interface IFilterStoreMap {
  listenForKeys(clientId: string, key: KeyType): void;
  unlistenForKeys(clientId: string, key: KeyType): void;
  add(key: string, prevInit?: any): any;
  delete(key: string): void;
  clear(): void;
  dispose(): void;
}

export default function addStateFilterForMap(StoreClass: StoreMapConstructor) {
  return class MainStoreBase extends StoreClass implements IFilterStoreMap {
    _stateListeners: { [clientIdKey: string]: number } = {};
    _stateFilters: { [clientId: string]: any } = {};
    _filterDisposables: { [key: string]: Disposable } = {};
    _stateFiltersInit = false; // Check if or not the stateFilters has init

    getDefaultFilter(): { [key: string]: any } {
      // defaultFilter=true 表示默认的*为true，并且将observe所有key
      if (this.options && this.options.defaultFilter) {
        return { "*": true };
      }
      return { "*": false };
    }

    _initForClientId = (clientId: string) => {
      let defaultFilter = this.options && this.options.defaultFilter;
      let clientFilters = this.getDefaultFilter();
      if (defaultFilter) {
        let entries = this.storeMap.entries();

        for (let [key, store] of entries) {
          clientFilters[key] = (store._stateFilters && store._stateFilters[clientId]) || { "*": true };
        }
      }
      this._stateFilters[clientId] = clientFilters;
    };

    _initStateFilters() {
      let defaultFilter = this.options && this.options.defaultFilter;
      let winManagerStore = this.appStores.winManagerStore;
      winManagerStore.getClienIds().forEach(this._initForClientId);
      this._stateFiltersInit = true;

      // winManagerStore.onDidAddWin(initForClientId);
      // winManagerStore.onDidRemoveWin((clientId) => this._stateFilters[clientId] = null);

      if (defaultFilter) {
        for (let [key, store] of this.storeMap.entries()) {
          // clientFilters[key] = defaultFilter ?
          // store._stateFilters && store._stateFilters[clientId] || { '*': true } : { '*': false };
          this._filterDisposables[key] = store.emitter.on(
            "did-filter-update",
            ({ clientId, filters }: { clientId: string; filters: any }) => {
              this._setFilter(clientId, { [key]: filters });
            }
          );
        }
      }
    }

    _initWrap() {
      this._initStateFilters();
      super._initWrap();
    }

    _setFilter(clientId: string, newFilter: any) {
      let oldFilters = this._stateFilters[clientId] || this.getDefaultFilter();
      let nextFilters = { ...oldFilters, ...newFilter };
      this._stateFilters[clientId] = nextFilters;
      this.emitter.emit("did-filter-update", { clientId, filters: nextFilters });
    }

    _handleAddWin(clientId: string) {
      if (this._stateFiltersInit) {
        let entries = this.storeMap.entries();

        for (let [key, store] of entries) {
          store._handleAddWin && store._handleAddWin(clientId);
        }
        this._initForClientId(clientId);
      }
    }

    _handleRemoveWin(clientId: string) {
      if (this._stateFiltersInit) {
        this._stateFilters[clientId] = null;
        let entries = this.storeMap.entries();

        for (let [key, store] of entries) {
          this._stateListeners[clientId + key] = 0;
          store._handleRemoveWin && store._handleRemoveWin(clientId);
        }
      }
    }

    listenForKeys = function(this: MainStoreBase, clientId: string, key: KeyType) {
      if (!clientId) {
        return console.error("The clientId is not specify");
      }
      let keys = Array.isArray(key) ? key : [key];
      let _stateListeners = this._stateListeners;
      keys.forEach(thisKey => {
        let saveKey = clientId + thisKey;
        if (_stateListeners[saveKey] == null) {
          _stateListeners[saveKey] = 0;
        }
        _stateListeners[saveKey] += 1;
        if (_stateListeners[saveKey] === 1) {
          let store = this.storeMap.get(thisKey);
          let storeFilter = (store._stateFilters && store._stateFilters[clientId]) || { "*": true };
          this._setFilter(clientId, { [thisKey]: storeFilter });
          if (this._filterDisposables[saveKey]) {
            console.error(`The ${key} for ${clientId} has listened, This May be Bugs`);
          }
          this._filterDisposables[saveKey] = store.emitter.on(
            "did-filter-update",
            ({ clientId: nowId, filters }: { clientId: string; filters: any }) => {
              if (nowId === clientId) {
                this._setFilter(clientId, { [thisKey]: filters });
              }
            }
          );
        }
      });
    };

    unlistenForKeys = function(this: MainStoreBase, clientId: string, key: KeyType) {
      if (!clientId) {
        return console.error("The clientId is not specify");
      }
      let keys = Array.isArray(key) ? key : [key];
      let _stateListeners = this._stateListeners;
      keys.forEach(thisKey => {
        let saveKey = clientId + thisKey;
        _stateListeners[saveKey] -= 1;
        if (_stateListeners[saveKey] === 0) {
          this._setFilter(clientId, { [thisKey]: false });
          this._filterDisposables[saveKey].dispose();
          delete this._filterDisposables[saveKey];
        }
      });
    };

    add(key: string, prevInit: (store: IExtendStoreBase) => void) {
      let newStore = super.add(key, prevInit) as any;
      if (newStore) {
        let defaultFilter = this.options && this.options.defaultFilter;
        if (defaultFilter) {
          Object.keys(this._stateFilters).forEach(clientId => {
            let filters = (newStore!._stateFilters && newStore._stateFilters[clientId]) || { "*": true };
            this._setFilter(clientId, { [key]: filters });
          });
          if (this._filterDisposables[key]) {
            console.error(`The key ${key} should NOT add twice`);
          }
          this._filterDisposables[key] = newStore.emitter.on(
            "did-filter-update",
            ({ clientId, filters }: { clientId: string; filters: any }) => {
              this._setFilter(clientId, { [key]: filters });
            }
          );
        }
      }
      return newStore;
    }

    deleteFilter(key: string) {
      let store = this.storeMap.get(key);
      Object.keys(this._stateFilters).forEach(clientId => {
        this._setFilter(clientId, { [key]: null });
      });
      if (this._filterDisposables[key]) {
        this._filterDisposables[key].dispose();
        delete this._filterDisposables[key];
      }
    }

    delete(key: string) {
      this.deleteFilter(key);
      super.delete(key);
    }

    clear() {
      let keys = this.storeMap.keys();
      for (let key of keys) {
        this.deleteFilter(key);
      }
      super.clear();
    }

    dispose() {
      super.dispose();
      for (let key in this._filterDisposables) {
        let disposable = this._filterDisposables[key];
        disposable && disposable.dispose();
      }
    }
  };
}

/*
  Given an source Store and find all of the store names

  Examples:
  new TodoStore({ hello: new HelloStore, world: new WorldStore }) => { todoStore: { hello, world } }  
*/
import { StoreDeclarer, StoreListDeclarer, StoreMapDeclarer } from '../StoreDeclarer';
import StoreList from './StoreList';
import StoreMap from './StoreMap';
import FilterStoreMap from './FilterStoreMap';
import { beforeInit } from './storeBuilder';
import StoreBase, { StoreBaseConstructor } from '../StoreBase';
import IStoreFilters from '../IStoreFilters';
import IExtendStoreBase, { IExtendStoreBaseConstructor, ISubStoreInfo } from '../IExtendStoreBase';
import IStoresDeclarer, { IStoresArrayDeclarer } from '../IStoresDeclarer';
import { isFunction } from './objUtils';

const storeBuilders = {
  Item: function (this: IExtendStoreBase, StoreClass: IExtendStoreBaseConstructor, storeKey: string, stateKey: string, options: any): void {
    let args = options && options.args;
    options = options ? { defaultFilter: options.defaultFilter } : null;
    let store = this.buildStore(StoreClass, args, options);
    if (this.setStore && store) {
      return this.setStore(storeKey, store);
    } else if (store) {
      (this as any)[storeKey] = store;
    }
  },
  List: function (this: IExtendStoreBase, StoreClass: IExtendStoreBaseConstructor, storeKey: string, stateKey: string, options: any): void {
    let args = options && options.args;
    let storeOptions = options ? { defaultFilter: options.storeDefaultFilter } : null;
    let storeBuilder = () => this.buildStore(StoreClass, args, storeOptions);
    let storeObserver = (store: IExtendStoreBase, index: number) => {
      return store.observe(state => {
        let oldStates = this.state[stateKey] || [];
        this.setState({
          [stateKey]: [
            ...oldStates.slice(0, index), 
            state,
            ...oldStates.slice(index + 1), 
          ]
        });
      });
    }
    let listOptions = options ? { defaultFilter: options.defaultFilter } : null;
    let newStore = new StoreList(0, storeBuilder, storeObserver, listOptions);
    newStore.appStores = this._appStore!.stores;
    if (this.setStore) return this.setStore(storeKey, newStore);
    (this as any)[storeKey] = newStore;
  },
  Map: function (this: IExtendStoreBase, StoreClass: IExtendStoreBaseConstructor, storeKey: string, stateKey: string, options: any) {
    let args = options && options.args;
    let storeOptions = options ? { defaultFilter: options.storeDefaultFilter } : null;
    let storeBuilder = () => this.buildStore(StoreClass, args, storeOptions);
    let storeObserver = (store: IExtendStoreBase, index: string) => {
      if (!stateKey) {
        return store.observe(state => 
          this.setState({
            [index]: state
          })
        );
      }
      return store.observe(state => this.setState({
        [stateKey]: { ...this.state[stateKey], [index]: state },
      }));
    }
    let mapOptions = options ? { defaultFilter: options.defaultFilter } : null;
    let newStore = null;
    if (options && options.applyFilter) {
      newStore = new FilterStoreMap(null, storeBuilder, storeObserver, mapOptions); 
    } else {
      newStore = new StoreMap(null, storeBuilder, storeObserver, mapOptions);
    }
    newStore.appStores = this._appStore!.stores;
    if (this.setStore) return this.setStore(storeKey, newStore);
    (this as any)[storeKey] = newStore;
  }
}

const storeObservers = {
  Item: function (this: IExtendStoreBase, storeKey: string, stateKey: string, options: any) {
    let store: IExtendStoreBase = this.getStore ? this.getStore(storeKey) as IExtendStoreBase : (this as any)[storeKey] as IExtendStoreBase;
    let disposable = store.observe((state) => {
      this.setState({ [stateKey]: state });
    });
    let dispose = store.dispose;
    store.dispose = function() {
      dispose.call(this);
      disposable && disposable.dispose();
    };
  },
  List: function (this: IExtendStoreBase, storeKey: string, stateKey: string, options: any) {
    let count = options && options.size || 0;
    if (count > 0) {
      let store = this.getStore ? this.getStore(storeKey) as StoreList : (this as any)[storeKey] as StoreList;      
      store.setSize(count);
    }
  },
  Map: function (this: IExtendStoreBase, storeKey: string, stateKey: string, options: any) {
    let keys = options && options.keys;
    if (Array.isArray(keys)) {
      let store = this.getStore ? this.getStore(storeKey) as StoreMap : (this as any)[storeKey] as StoreMap;            
      keys.forEach(key => store.add(key));
    }
  }
}

function extendClass(StoreClass: StoreBaseConstructor): IExtendStoreBaseConstructor {
  // return class ExtendStoreClass extends StoreClass {};
  function ExtendStoreClass(...args: any[]) {
    const obj = new StoreClass(...args);
    Object.setPrototypeOf(obj, new.target.prototype); 
    // or B.prototype, but if you derive from B you'll have to do this dance again
  
    // use obj instead of this
    return obj;
  }
  Object.setPrototypeOf(ExtendStoreClass.prototype, StoreClass.prototype);
  Object.setPrototypeOf(ExtendStoreClass, StoreClass);
  return ExtendStoreClass as any;
}

interface FilterStoreOptions {
  applyFilter: boolean;
}

function parseInnerStores(innerStores: IStoresDeclarer): IStoresArrayDeclarer | undefined {
  if (!innerStores) {
    return undefined;
  }
  if (Array.isArray(innerStores)) {
    return innerStores;
  }
  let storeDeclarer: IStoresArrayDeclarer = [];
  for (let key in innerStores) {
    let value = innerStores[key];
    storeDeclarer.push({ stateKey: key, declarer: value });
  }
  return storeDeclarer;
}

export function filterOneStore(StoreClass: IExtendStoreBaseConstructor, filterOptions?: FilterStoreOptions): IStoreFilters | null {
  if (!StoreClass) return null;
  let innerStoreArray = parseInnerStores(StoreClass.innerStores);
  if (!innerStoreArray) return null;

  let filters: IStoreFilters = {};
  let subStoreInfos: ISubStoreInfo[] = [];
  for (let innerStore of innerStoreArray) {
    let { stateKey, declarer } = innerStore;
    if (isFunction(declarer)) {
      let storeName = stateKey + 'Store';
      let Store = extendClass(declarer as StoreBaseConstructor);
      filters[storeName] = { 
        type: 'Store',
        filters: filterOneStore(Store, filterOptions),
      };
      subStoreInfos.push(['Item', Store, storeName, stateKey, filterOptions]);
    } else {
      let { options, Store } = declarer as StoreDeclarer | StoreListDeclarer | StoreMapDeclarer;
      let nowOptions: { [key: string]: any } | undefined = options;
      if (filterOptions) {
        nowOptions = { ...options, ...filterOptions };
      }
      let storeName = nowOptions && nowOptions.storeKey || stateKey + 'Store';
      let extendStore = extendClass(Store);

      if (StoreDeclarer.isStore(declarer)) {
        filters[storeName] = { 
          type: 'Store',
          filters: filterOneStore(extendStore, filterOptions),
        };
        subStoreInfos.push(['Item', extendStore, storeName, stateKey, nowOptions]);
      } else if (StoreListDeclarer.isStoreList(declarer)) {
        filters[storeName] = {
          type: 'StoreList',
          filters: filterOneStore(extendStore, filterOptions),
        }
        subStoreInfos.push(['List', extendStore, storeName, stateKey, nowOptions]);
      } else if (StoreMapDeclarer.isStoreMap(declarer)) {
        filters[storeName] = {
          type: 'StoreMap',
          filters: filterOneStore(extendStore, filterOptions),
        };
        subStoreInfos.push(['Map', extendStore, storeName, nowOptions && nowOptions.directInsert ? null : stateKey, nowOptions]);
      }
    }
  }
  StoreClass.prototype.buildStores = function() {
    subStoreInfos.forEach(([type, StoreClass, storeKey, stateKey, options]) => {
      storeBuilders[type].call(this, StoreClass, storeKey, stateKey!, options);
      let store = this.getStore ? this.getStore(storeKey) : this[storeKey];
      store.buildStores && store.buildStores();
    });
  };
  StoreClass.prototype.initStores = function(parentStore: IExtendStoreBase) {
    subStoreInfos.forEach((info) => {
      let storeKey = info[2];
      let store = this.getStore ? this.getStore(storeKey) : this[storeKey];
      
      beforeInit(store, parentStore);

      store.willInit && store.willInit();
      store.initStores && store.initStores(store);
      store._initWrap();
    });
  };
  StoreClass.prototype.startObserve = function() {
    subStoreInfos.forEach(([type, StoreClass, storeKey, stateKey, options]) => {
      let store = this.getStore ? this.getStore(storeKey) : this[storeKey];
      store.startObserve && store.startObserve();
      storeObservers[type].call(this, storeKey, stateKey!, options);
    });
  };
  StoreClass.prototype.disposeStores = function() {
    subStoreInfos.forEach(info => {
      let storeKey = info[2];
      let store = this.getStore ? this.getStore(storeKey) : this[storeKey];
      if (store) {
        store.disposeStores && store.disposeStores();
        store.dispose();
      }
    });
  };
 
  StoreClass.prototype.getSubStores = function() {
    return subStoreInfos.map(info => {
      let storeKey = info[2];
      return this.getStore ? this.getStore(storeKey) : this[storeKey];
    });
  }
  StoreClass.prototype.getSubStoreInfos = function() {
    return subStoreInfos;
  }
  return filters;
}

// function filterStore(stores) {
//   let storeFilters = {};
//   for (let key in stores) {
//     let store = stores[key];
//     storeFilters[key] = { type: 'Store', filters: filterOneStore(store.constructor) };
//   }
//   return storeFilters;
// };

// export {
//   filterOneStore,
// };
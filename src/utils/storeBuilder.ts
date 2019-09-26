import IExtendStoreBase from "../IExtendStoreBase";

export function beforeInit(store: IExtendStoreBase, parentStore: IExtendStoreBase) {
  store.parentStore = parentStore;
  if ((parentStore as any).clientId) {
    (store as any).clientId = (parentStore as any).clientId;
  }
}

export const initStore = function(store: IExtendStoreBase, parentStore: IExtendStoreBase) {
  store.buildStores && store.buildStores();

  beforeInit(store, parentStore);

  store.willInit && store.willInit();
  store.initStores && store.initStores(store);
  store._initWrap();
  store.startObserve && store.startObserve();
};

export const disposeStore = function(store: IExtendStoreBase) {
  store.disposeStores && store.disposeStores();
  store.dispose();
};

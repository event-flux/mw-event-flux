import StoreBase from "./StoreBase";
import IStoresDeclarer from "./IStoresDeclarer";
import StoreList from "./utils/StoreList";
import StoreMap from "./utils/StoreMap";

export type ISubStoreInfo = ["Item" | "List" | "Map", IExtendStoreBaseConstructor, string, string | null, any];

export interface IExtendStoreBaseConstructor {
  innerStores: IStoresDeclarer;
  new (...args: any[]): IExtendStoreBase;
}

export default interface IExtendStoreBase extends StoreBase {
  buildStores(): void;

  initStores(parentStore?: IExtendStoreBase): void;

  startObserve(): void;

  disposeStores(): void;

  getSubStores(): IExtendStoreBase[];

  getSubStoreInfos(): ISubStoreInfo[];

  // 设置子store
  setStore?(storeKey: string, store: IExtendStoreBase | StoreList | StoreMap): void;

  // 根据storeKey获取子store
  getStore?(storeKey: string): IExtendStoreBase | StoreList | StoreMap;

  // 获取所有子store
  getStores?(): IExtendStoreBase[];

  handleFilterChange?(): void;
}

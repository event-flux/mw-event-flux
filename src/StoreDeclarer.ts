import StoreBase, { StoreBaseConstructor } from "./StoreBase";

interface StoreDeclarerOptions {
  args?: [any];
  storeKey?: string;
  defaultFilter?: boolean;
}

const IS_STORE = '@@__STORE_ITEM__@@';
class StoreDeclarer {
  Store: StoreBaseConstructor;
  options: StoreDeclarerOptions | undefined;

  constructor(Store: StoreBaseConstructor, options?: StoreDeclarerOptions) {
    this.Store = Store;
    this.options = options;
  }
  
  [IS_STORE] = true;

  static isStore(maybeStore: any) {
    return !!(maybeStore && maybeStore[IS_STORE]);
  }
}


function declareStore(Store: StoreBaseConstructor, options?: StoreDeclarerOptions) {
  return new StoreDeclarer(Store, options);
}

interface StoreListDeclarerOptions {
  args?: [any];
  storeKey?: string;
  size?: number;
}
const IS_STORE_LIST = '@@__STORE_LIST__@@';

class StoreListDeclarer {
  Store: StoreBaseConstructor;
  options: StoreListDeclarerOptions | undefined;

  constructor(Store: StoreBaseConstructor, options?: StoreListDeclarerOptions) {
    this.Store = Store;
    this.options = options;
  }

  [IS_STORE_LIST] = true;

  static isStoreList(maybeList: any) {
    return !!(maybeList && maybeList[IS_STORE_LIST]);
  }
}

function declareStoreList(Store: StoreBaseConstructor, options?: StoreListDeclarerOptions) {
  return new StoreListDeclarer(Store, options);
}

// when directInsert is true, then the child state will set into the store directly.
interface StoreMapDeclarerOptions {
  args?: [any];
  storeKey?: string;
  keys?: [string];
  directInsert?: boolean;
  defaultFilter?: boolean;
  storeDefaultFilter?: boolean;
}
const IS_STORE_MAP = '@@__STORE_MAP__@@';

class StoreMapDeclarer {
  Store: StoreBaseConstructor;
  options: StoreMapDeclarerOptions | undefined;

  constructor(Store: StoreBaseConstructor, options?: StoreMapDeclarerOptions) {
    this.Store = Store;
    this.options = options;
  }

  [IS_STORE_MAP] = true;
 
  static isStoreMap(maybeMap: any) {
    return !!(maybeMap && maybeMap[IS_STORE_MAP]);
  }
}

function declareStoreMap(Store: StoreBaseConstructor, options?: StoreMapDeclarerOptions) {
  return new StoreMapDeclarer(Store, options);
}

export { 
  StoreDeclarer, StoreListDeclarer, StoreMapDeclarer, 
  declareStore, declareStoreList, declareStoreMap 
};

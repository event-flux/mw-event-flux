import { 
  StoreBaseConstructor, 
  StoreDeclarerOptions, StoreDeclarer, 
  StoreListDeclarerOptions, StoreListDeclarer,
  StoreMapDeclarerOptions, StoreMapDeclarer
} from "event-flux";

interface PerWinOptions {
  isPerWin: boolean;
}

const IS_WIN_STORE = '@@__WIN_STORE_ITEM__@@';
export class WinStoreDeclarer<T> extends StoreDeclarer<T> {
  options: StoreDeclarerOptions & PerWinOptions | undefined;

  constructor(Store: StoreBaseConstructor<T>, depStoreNames?: string[] | StoreDeclarerOptions, options?: StoreDeclarerOptions) {
    super(Store, depStoreNames, options);
    this.options!.isPerWin = true;
  }
  
  [IS_WIN_STORE] = true;

  static isWinStore(maybeStore: any) {
    return !!(maybeStore && maybeStore[IS_WIN_STORE]);
  }
}


export function declareWinStore<T>(Store: StoreBaseConstructor<T>, depStoreNames?: string[] | StoreDeclarerOptions, options?: StoreDeclarerOptions) {
  return new WinStoreDeclarer(Store, depStoreNames, options);
}

const IS_WIN_STORE_LIST = '@@__WIN_STORE_LIST__@@';

export class WinStoreListDeclarer<T> extends StoreListDeclarer<T> {
  options: StoreListDeclarerOptions & PerWinOptions | undefined;

  constructor(Store: StoreBaseConstructor<T>, depStoreNames?: string[] | StoreListDeclarerOptions, options?: StoreListDeclarerOptions) {
    super(Store, depStoreNames, options);
    this.options!.isPerWin = true;
  }

  [IS_WIN_STORE_LIST] = true;

  static isWinStoreList(maybeList: any) {
    return !!(maybeList && maybeList[IS_WIN_STORE_LIST]);
  }
}

export function declareWinStoreList<T>(Store: StoreBaseConstructor<T>, depStoreNames?: string[] | StoreListDeclarerOptions, options?: StoreListDeclarerOptions) {
  return new WinStoreListDeclarer(Store, depStoreNames, options);
}


const IS_WIN_STORE_MAP = '@@__WIN_STORE_MAP__@@';

export class WinStoreMapDeclarer<T> extends StoreMapDeclarer<T> {
  options: StoreMapDeclarerOptions & PerWinOptions | undefined;

  constructor(Store: StoreBaseConstructor<T>, depStoreNames?: string[] | StoreMapDeclarerOptions, options?: StoreMapDeclarerOptions) {
    super(Store, depStoreNames, options);
    this.options!.isPerWin = true;
  }

  [IS_WIN_STORE_MAP] = true;
 
  static isWinStoreMap(maybeMap: any) {
    return !!(maybeMap && maybeMap[IS_WIN_STORE_MAP]);
  }
}

export function declareWinStoreMap<T>(Store: StoreBaseConstructor<T>, depStoreNames?: string[] | StoreMapDeclarerOptions, options?: StoreMapDeclarerOptions) {
  return new WinStoreMapDeclarer(Store, depStoreNames, options);
}
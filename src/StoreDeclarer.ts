import {
  StoreBaseConstructor,
  StoreDeclarerOptions,
  StoreDeclarer,
  StoreListDeclarerOptions,
  StoreListDeclarer,
  StoreMapDeclarerOptions,
  StoreMapDeclarer,
} from "event-flux";

interface PerWinOptions {
  isPerWin: boolean;
}

export class WinStoreDeclarer<T> extends StoreDeclarer<T> {
  options: StoreDeclarerOptions & PerWinOptions | undefined;

  constructor(
    Store: StoreBaseConstructor<T>,
    depStoreNames?: string[] | StoreDeclarerOptions,
    options?: StoreDeclarerOptions
  ) {
    super(Store, depStoreNames, options);
    this.options!.isPerWin = true;
  }
}

export function declareWinStore<T>(
  Store: StoreBaseConstructor<T>,
  depStoreNames?: string[] | StoreDeclarerOptions,
  options?: StoreDeclarerOptions
) {
  return new WinStoreDeclarer(Store, depStoreNames, options);
}

export class WinStoreListDeclarer<T> extends StoreListDeclarer<T> {
  options: StoreListDeclarerOptions & PerWinOptions | undefined;

  constructor(
    Store: StoreBaseConstructor<T>,
    depStoreNames?: string[] | StoreListDeclarerOptions,
    options?: StoreListDeclarerOptions
  ) {
    super(Store, depStoreNames, options);
    this.options!.isPerWin = true;
  }
}

export function declareWinStoreList<T>(
  Store: StoreBaseConstructor<T>,
  depStoreNames?: string[] | StoreListDeclarerOptions,
  options?: StoreListDeclarerOptions
) {
  return new WinStoreListDeclarer(Store, depStoreNames, options);
}

export class WinStoreMapDeclarer<T> extends StoreMapDeclarer<T> {
  options: StoreMapDeclarerOptions & PerWinOptions | undefined;

  constructor(
    Store: StoreBaseConstructor<T>,
    depStoreNames?: string[] | StoreMapDeclarerOptions,
    options?: StoreMapDeclarerOptions
  ) {
    super(Store, depStoreNames, options);
    this.options!.isPerWin = true;
  }
}

export function declareWinStoreMap<T>(
  Store: StoreBaseConstructor<T>,
  depStoreNames?: string[] | StoreMapDeclarerOptions,
  options?: StoreMapDeclarerOptions
) {
  return new WinStoreMapDeclarer(Store, depStoreNames, options);
}

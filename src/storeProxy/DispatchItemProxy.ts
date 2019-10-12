import { DispatchItem } from "event-flux";

export interface IDispatchInfo {
  store: string;
  index?: string | number;
  method: string;
  args: any[];
}

export interface IStoreDispatcher {
  handleDispatch(dispatchInfo: IDispatchInfo): void;

  handleDispatchNoReturn(dispatchInfo: IDispatchInfo): void;

  handleMainMapRequestStores?(storeName: string, mapKeys: string[]): void;

  handleMainMapReleaseStores?(storeName: string, mapKeys: string[]): void;
}

export default class DispatchItemProxy implements DispatchItem {
  _refCount = 0;
  _stateKey: string | undefined;

  _init() {}

  _inject(): void {}

  dispose(): void {}

  _addRef(): void {
    this._refCount += 1;
  }

  _decreaseRef() {
    this._refCount -= 1;
  }

  getRefCount(): number {
    return this._refCount;
  }

  [property: string]: any;
}

import { DispatchItem, StoreBaseConstructor } from "event-flux";
import { DisposableLike } from "event-kit";

export interface IDispatchInfo {
  store: string;
  index?: string | number;
  method: string;
  args?: any[];
}

export interface IStoreDispatcher {
  handleDispatch(dispatchInfo: IDispatchInfo): void;

  handleDispatchNoReturn(dispatchInfo: IDispatchInfo): void;

  handleDispatchDisposable(dispatchInfo: IDispatchInfo, callback: (...args: any[]) => void): DisposableLike;

  handleMainMapRequestStores?(storeName: string, mapKeys: string[]): void;

  handleMainMapReleaseStores?(storeName: string, mapKeys: string[]): void;

  [key: string]: any;
}

export default class DispatchItemProxy implements DispatchItem {
  _refCount = 0;
  _stateKey: string | undefined;

  _init() {}

  _inject(StoreBuilder: StoreBaseConstructor<any>, stateKey?: string): void {
    this._stateKey = stateKey;
  }

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

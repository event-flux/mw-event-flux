import { DispatchItem } from "event-flux";

interface IStoreDispatcher {
  handleDispatch(storeKey: string, property: string, args: any[]): void;
}

export class StoreProxy implements DispatchItem {
  _refCount = 0;
  _stateKey: string | undefined;

  constructor(appStore: IStoreDispatcher, storeKey: string) {
    return new Proxy(this, {
      get(target: StoreProxy, property: string, receiver) {
        console.log("property:", property, target[property]);
        if (target[property]) {
          return target[property];
        }
        return (...args: any[]) => appStore.handleDispatch(storeKey, property, args);
      },
    });
  }

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

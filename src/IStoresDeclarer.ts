import { StoreBaseConstructor } from './StoreBase';
import { StoreDeclarer, StoreListDeclarer, StoreMapDeclarer } from './StoreDeclarer';

// 对象store声明方式，简洁，且对于store顺序没有任何偏好
export interface IStoresObjDeclarer {
  [stateKey: string]: StoreBaseConstructor | StoreDeclarer | StoreListDeclarer | StoreMapDeclarer;
}

export interface IOneStoreDeclarer { 
  stateKey: string; 
  declarer: StoreBaseConstructor | StoreDeclarer | StoreListDeclarer | StoreMapDeclarer 
};

// 数组store声明方式，对于store的初始化顺序有要求时使用，系统将会根据声明顺序进行 初始化
export type IStoresArrayDeclarer = IOneStoreDeclarer[];

type IStoresDeclarer = IStoresObjDeclarer | IStoresArrayDeclarer;

export default IStoresDeclarer;
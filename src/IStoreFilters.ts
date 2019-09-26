export default interface IStoreFilters {
  [storeName: string]: {
    type: "Store" | "StoreList" | "StoreMap";
    filters?: IStoreFilters | null;
  };
}

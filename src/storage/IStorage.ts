export default interface IStorage {
  set(key: string | { [key: string]: any }, value: any): void;

  get(key: string, defaultValue?: any): any;

  delete(key: string): void;

  getNSStore(namespace: string): IStorage;
}
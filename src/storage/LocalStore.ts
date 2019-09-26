import IStorage from "./IStorage";

export default class AsyncStorage implements IStorage {
  // Update the version when the storage is obsolete
  ns: string;
  constructor(version: string | null, ns: string) {
    if (version) {
      this.init(version);
    }
    this.ns = ns;
  }

  init(version: string) {
    if (version) {
      const curVersion = localStorage.getItem("version");
      if (version !== curVersion) {
        localStorage.clear();
        localStorage.setItem("version", version);
      }
    }
  }

  set(key: string | { [key: string]: any }, value: any) {
    if (typeof key === "object") {
      for (let k in key) {
        this.set(k, key[k]);
      }
      return;
    }
    key = this.ns ? this.ns + "." + key : key;
    if (value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  get(key: string, defaultValue?: any) {
    key = this.ns ? this.ns + "." + key : key;
    let value = localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
  }

  delete(key: string) {
    key = this.ns ? this.ns + "." + key : key;
    localStorage.removeItem(key);
  }

  getNSStore(namespace: string) {
    namespace = this.ns ? this.ns + "." + namespace : namespace;
    return new AsyncStorage(null, namespace);
  }
}

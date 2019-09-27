import MainAppStore from "../MainAppStore";
import { declareStore, StoreBase } from "event-flux";

describe("MainAppStore", () => {
  test("should create successfully", () => {
    let mainAppStore = new MainAppStore([declareStore(StoreBase, [], { stateKey: "todo", storeKey: "todoStore" })]);
    mainAppStore.init();
  });
});

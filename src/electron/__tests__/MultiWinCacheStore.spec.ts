import MultiWinCacheStore from "../MultiWinCacheStore";
import MainAppStore from "../../MainAppStore";
import { IMainClient, IWinInfo } from "../../mainClientTypes";
import MultiWinSaver from "../../MultiWinSaver";
import { messageName } from "../../constants";

jest.useFakeTimers();

jest.mock("../../MainClient", () => {
  class MyMainClient implements IMainClient {
    sendWinMsg = jest.fn();
    activeWin = jest.fn();
    createWin = jest.fn(winId => {
      this.multiWinSaver.addWin({ winId });
    });
    changeWin = jest.fn();
    closeWin = jest.fn();
    constructor(private multiWinSaver: MultiWinSaver) {}
  }
  return MyMainClient;
});

describe("MultiWinStore", () => {});

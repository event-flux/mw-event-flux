import BrowserMainClient from "../BrowserMainClient";
import MultiWinSaver from "../../MultiWinSaver";
import { IMainClientCallback } from "../../mainClientTypes";
import {
  renderRegisterName,
  renderDispatchName,
  renderRequestStoreName,
  renderReleaseStoreName,
  winMessageName,
} from "../../constants";

declare global {
  interface Window {
    isMainClient: string;
  }
}

describe("BrowserMainClient", () => {
  let multiWinSaver: MultiWinSaver;
  let mainClientCallback: IMainClientCallback;
  let mainClient: BrowserMainClient | undefined;

  beforeEach(() => {
    multiWinSaver = new MultiWinSaver();

    mainClientCallback = {
      handleRendererDispatch: jest.fn(),
      handleRendererDispatchNoReturn: jest.fn(),
      handleRendererDispatchObserve: jest.fn(),
      handleRendererDispatchDispose: jest.fn(),
      handleWinMessage: jest.fn(),
      handleRequestStores: jest.fn(),
      handleReleaseStores: jest.fn(),
      handleMapRequestStores: jest.fn(),
      handleMapReleaseStores: jest.fn(),
      initWin: jest.fn(),
      getStoreDeclarers: jest.fn(),
      getInitStates: jest.fn(),
    };
    mainClient = new BrowserMainClient(multiWinSaver, mainClientCallback);
  });

  afterEach(() => {
    window.removeEventListener("message", mainClient!._handleMessage);
    mainClient = undefined;
    delete window.isMainClient;
  });

  test("should handle incoming messages and add default window", async () => {
    expect((window as any).isMainClient).toBeTruthy();

    expect(multiWinSaver.winInfos).toEqual([{ winId: "mainClient", window }]);

    multiWinSaver.addWin({ winId: "win1", window });

    window.postMessage({ action: renderRegisterName, data: ["win1"] }, "*");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(multiWinSaver.isRegister("win1")).toBeTruthy();

    window.postMessage({ action: "close", data: ["win1"] }, "*");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(multiWinSaver.winInfos).toEqual([{ winId: "mainClient", window }]);

    window.postMessage({ action: renderDispatchName, data: ["win1", 12, "hello"] }, "*");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mainClientCallback.handleRendererDispatch).toHaveBeenLastCalledWith("win1", 12, "hello");

    window.postMessage({ action: renderRequestStoreName, data: ["win1", ["key1", "key2"]] }, "*");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mainClientCallback.handleRequestStores).toHaveBeenLastCalledWith("win1", ["key1", "key2"]);

    window.postMessage({ action: renderReleaseStoreName, data: ["win1", ["key1", "key2"]] }, "*");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mainClientCallback.handleRequestStores).toHaveBeenLastCalledWith("win1", ["key1", "key2"]);

    window.postMessage({ action: winMessageName, data: ["win1", "win2", "data"] }, "*");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mainClientCallback.handleWinMessage).toHaveBeenLastCalledWith("win1", "win2", "data");
  });

  test("sendWinMsg should can post message", async () => {
    let onMessage = jest.fn();
    window.addEventListener("message", onMessage);
    mainClient!.sendWinMsg({ winId: "win1", window }, "msg1", "arg1", "arg2");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(onMessage.mock.calls[0][0].data).toEqual({ action: "msg1", data: ["arg1", "arg2"] });
  });

  test("createWin should can create the new window", () => {
    let originOpen = window.open;
    let mockOpen = jest.fn(() => {
      let retWin = {
        onbeforeunload: () => {},
        close() {
          retWin.onbeforeunload && retWin.onbeforeunload!();
        },
      };
      return retWin;
    });
    window.open = mockOpen;

    let newWin = mainClient!.createWin(
      "win1",
      { path: "/hello", parentId: "win2", name: "win1", groups: ["hello"] },
      { minWidth: 300 }
    );
    expect(mockOpen.mock.calls[0][0]).toBe(
      `http://localhost/hello?path=%2Fhello&parentId=win2&name=win1&groups=hello&winId=win1&isSlave=1`
    );
    expect(mockOpen.mock.calls[0][2].split(",")[0]).toBe("minWidth=300");

    expect(multiWinSaver.winInfos).toEqual([{ winId: "mainClient", window }, { winId: "win1", window: newWin }]);

    newWin!.close();
    expect(multiWinSaver.winInfos).toEqual([{ winId: "mainClient", window }]);
    window.open = originOpen;
  });
});

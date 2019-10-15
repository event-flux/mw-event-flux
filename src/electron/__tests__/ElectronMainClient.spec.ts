import { BrowserWindow, ipcMain } from "electron";
import ElectronMainClient from "../ElectronMainClient";
import MultiWinSaver from "../../MultiWinSaver";
import { IMainClientCallback } from "../../mainClientTypes";
import {
  renderRegisterName,
  renderDispatchName,
  renderRequestStoreName,
  renderReleaseStoreName,
  winMessageName,
} from "../../constants";

describe("BrowserMainClient", () => {
  let multiWinSaver: MultiWinSaver;
  let mainClientCallback: IMainClientCallback;
  let mainClient: ElectronMainClient | undefined;

  beforeEach(() => {
    multiWinSaver = new MultiWinSaver();

    mainClientCallback = {
      handleRendererDispatch: jest.fn(),
      handleRendererDispatchNoReturn: jest.fn(),
      handleWinMessage: jest.fn(),
      handleRequestStores: jest.fn(),
      handleReleaseStores: jest.fn(),
      handleMapRequestStores: jest.fn(),
      handleMapReleaseStores: jest.fn(),
      initWin: jest.fn(),
      getStoreDeclarers: jest.fn(),
      getInitStates: jest.fn(),
    };
    mainClient = new ElectronMainClient(multiWinSaver, mainClientCallback);
  });

  afterEach(() => {
    mainClient = undefined;
  });

  test("should handle incoming messages", async () => {
    let window = new BrowserWindow({ x: 10 });
    multiWinSaver.addWin({ winId: "win1", window, webContents: window.webContents });

    ipcMain.emit(renderRegisterName, {}, "win1");
    expect(multiWinSaver.isRegister("win1")).toBeTruthy();

    ipcMain.emit(renderDispatchName, {}, "win1", 12, "hello");
    expect(mainClientCallback.handleRendererDispatch).toHaveBeenLastCalledWith("win1", 12, "hello");

    ipcMain.emit(renderRequestStoreName, {}, "win1", ["key1", "key2"]);
    expect(mainClientCallback.handleRequestStores).toHaveBeenLastCalledWith("win1", ["key1", "key2"]);

    ipcMain.emit(renderReleaseStoreName, {}, "win1", ["key1", "key2"]);
    expect(mainClientCallback.handleReleaseStores).toHaveBeenLastCalledWith("win1", ["key1", "key2"]);

    ipcMain.emit(winMessageName, {}, "win1", "win2", "data");
    expect(mainClientCallback.handleWinMessage).toHaveBeenLastCalledWith("win1", "win2", "data");
  });

  // test("sendWinMsg should can post message", async () => {
  //   let onMessage = jest.fn();
  //   window.addEventListener("message", onMessage);
  //   mainClient!.sendWinMsg({ winId: "win1", window }, "msg1", "arg1", "arg2");
  //   await new Promise(resolve => setTimeout(resolve, 0));
  //   expect(onMessage.mock.calls[0][0].data).toEqual({ action: "msg1", data: ["arg1", "arg2"] });
  // });

  // test("createWin should can create the new window", () => {
  //   let originOpen = window.open;
  //   let mockOpen = jest.fn(() => {
  //     let retWin = {
  //       onbeforeunload: () => {},
  //       close() {
  //         retWin.onbeforeunload && retWin.onbeforeunload!();
  //       },
  //     };
  //     return retWin;
  //   });
  //   window.open = mockOpen;

  //   let newWin = mainClient!.createWin(
  //     "win1",
  //     { path: "/hello", parentId: "win2", name: "win1", groups: ["hello"] },
  //     { minWidth: 300 }
  //   );
  //   expect(mockOpen.mock.calls[0][0]).toBe(
  //     `http://localhost/hello?path=%2Fhello&parentId=win2&name=win1&groups=hello&winId=win1&isSlave=1`
  //   );
  //   expect(mockOpen.mock.calls[0][2].split(",")[0]).toBe("minWidth=300");

  //   expect(multiWinSaver.winInfos).toEqual([{ winId: "mainClient", window }, { winId: "win1", window: newWin }]);

  //   newWin!.close();
  //   expect(multiWinSaver.winInfos).toEqual([{ winId: "mainClient", window }]);
  //   window.open = originOpen;
  // });
});

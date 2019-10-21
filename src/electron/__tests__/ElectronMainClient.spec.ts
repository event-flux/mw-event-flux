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
  renderDispatchObserve,
  renderDispatchDispose,
} from "../../constants";
import { decodeQuery } from "../../utils/queryHandler";

jest.useFakeTimers();

describe("ElectronMainClient", () => {
  let multiWinSaver: MultiWinSaver;
  let mainClientCallback: IMainClientCallback;
  let mainClient: ElectronMainClient | undefined;

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

    ipcMain.emit(renderDispatchObserve, {}, "win1", 12, { store: "helloStore" });
    expect(mainClientCallback.handleRendererDispatchObserve).toHaveBeenCalledWith("win1", 12, { store: "helloStore" });

    ipcMain.emit(renderDispatchDispose, {}, "win1", 12);
    expect(mainClientCallback.handleRendererDispatchDispose).toHaveBeenCalledWith("win1", 12);

    ipcMain.emit(renderRequestStoreName, {}, "win1", ["key1", "key2"]);
    expect(mainClientCallback.handleRequestStores).toHaveBeenLastCalledWith("win1", ["key1", "key2"]);

    ipcMain.emit(renderReleaseStoreName, {}, "win1", ["key1", "key2"]);
    expect(mainClientCallback.handleReleaseStores).toHaveBeenLastCalledWith("win1", ["key1", "key2"]);

    ipcMain.emit(winMessageName, {}, "win1", "win2", "data");
    expect(mainClientCallback.handleWinMessage).toHaveBeenLastCalledWith("win1", "win2", "data");
  });

  test("sendWinMsg should can post message", async () => {
    let window = new BrowserWindow({ x: 10 });

    mainClient!.sendWinMsg({ winId: "win1", window, webContents: window.webContents }, "msg1", "arg1", "arg2");
    expect((window.webContents as any).channels).toEqual([["msg1", "arg1", "arg2"]]);
  });

  test("createWin should can create the new window", () => {
    let newWin = mainClient!.createWin(
      "win1",
      { path: "/hello", parentId: "win2", name: "win1", groups: ["hello"] },
      { minWidth: 300 }
    );
    let loadUrl = require("url").parse((newWin as any).url);
    expect(decodeQuery(loadUrl.query)).toEqual({
      path: "/hello",
      parentId: "win2",
      name: "win1",
      groups: "hello",
      winId: "win1",
    });
    expect((newWin as any).props).toEqual({ minWidth: 300, show: false, x: 0, y: 0 });

    expect(multiWinSaver.winInfos).toEqual([{ winId: "win1", window: newWin, webContents: newWin.webContents }]);

    newWin!.emit("closed");
    expect(multiWinSaver.winInfos).toEqual([]);
  });

  test("changeWin should can change the window props", () => {
    let newWin = mainClient!.createWin(
      "win1",
      { path: "/hello", parentId: "win2", name: "win1", groups: ["hello"] },
      { minWidth: 300, show: false }
    );

    newWin.setContentBounds = jest.fn();
    newWin.setBounds = jest.fn();
    newWin.setMinimumSize = jest.fn();
    newWin.setMaximumSize = jest.fn();
    newWin.setTitle = jest.fn();
    newWin.show = jest.fn();

    mainClient!.changeWin(
      multiWinSaver.getWinInfo("win1"),
      { path: "/home" },
      {
        useContentSize: true,
        x: 1,
        width: 150,
        height: 150,
        minWidth: 100,
        minHeight: 100,
        maxWidth: 200,
        maxHeight: 200,
        title: "hello",
        show: true,
      }
    );

    expect(newWin.setMinimumSize).toHaveBeenLastCalledWith(100, 100);
    expect(newWin.setMaximumSize).toHaveBeenLastCalledWith(200, 200);
    expect(newWin.setTitle).toHaveBeenLastCalledWith("hello");
    expect(newWin.setContentBounds).toHaveBeenLastCalledWith({ x: 1, y: 0, width: 150, height: 150 });
    jest.runAllTimers();
    expect(newWin.show).toHaveBeenCalled();
  });
});

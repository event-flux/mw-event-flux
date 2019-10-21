import { ipcRenderer } from "electron";
import { IRendererClientCallback } from "../../rendererClientTypes";
import ElectronRendererClient from "../ElectronRendererClient";
import {
  initMessageName,
  mainDispatchName,
  mainReturnName,
  messageName,
  winMessageName,
  mainInvokeName,
} from "../../constants";

jest.useFakeTimers();

describe("ElectronRendererClient", () => {
  let rendererCallback: IRendererClientCallback;

  beforeEach(() => {
    rendererCallback = {
      handleDispatchReturn: jest.fn(),
      handleInvokeReturn: jest.fn(),
      handleMainInvoke: jest.fn(),
      handleWinMessage: jest.fn(),
      handleMessage: jest.fn(),
      handleInit: jest.fn(),
    };
  });

  test("should behave normally", async () => {
    window.history.pushState({}, "Test Title", "/home?winId=hello&hello=world");
    let rendererClient = new ElectronRendererClient(rendererCallback);
    expect(rendererClient.getQuery()).toEqual({ winId: "hello", hello: "world" });

    ipcRenderer.emit(initMessageName, {}, { hello: "world" });
    expect(rendererCallback.handleInit).toHaveBeenCalledWith({ hello: "world" });

    ipcRenderer.emit(mainDispatchName, {}, { hello: "dd" });
    expect(rendererCallback.handleDispatchReturn).toHaveBeenCalledWith({ hello: "dd" });

    ipcRenderer.emit(mainInvokeName, {}, "1", ["hello"]);
    expect(rendererCallback.handleMainInvoke).toHaveBeenCalledWith("1", ["hello"]);

    ipcRenderer.emit(mainReturnName, {}, "invoke1", undefined, "hello");
    expect(rendererCallback.handleInvokeReturn).toHaveBeenCalledWith("invoke1", undefined, "hello");

    ipcRenderer.emit(messageName, {}, "hello");
    expect(rendererCallback.handleMessage).toHaveBeenCalledWith("hello");

    ipcRenderer.emit(winMessageName, {}, "sender1", "hello");
    expect(rendererCallback.handleWinMessage).toHaveBeenCalledWith("sender1", "hello");

    ipcRenderer.send = jest.fn();
    rendererClient.sendMainMsg("myMessage", "arg0", "arg1");
    expect(ipcRenderer.send).toHaveBeenCalledWith("myMessage", "arg0", "arg1");
  });
});

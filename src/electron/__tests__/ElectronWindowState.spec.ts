import ElectronWindowState from "../ElectronWindowState";
import { screen } from "electron";
import { BrowserWindow } from "electron";

jest.useFakeTimers();

describe("ElectronWindowState", () => {
  test("should loadState correctly", () => {
    let originMatching = screen.getDisplayMatching;
    screen.getDisplayMatching = jest.fn().mockImplementation(() => {
      return { bounds: { x: 0, y: 0, width: 1200, height: 800 } };
    });
    let winState = new ElectronWindowState({}, { x: 1.2, y: 2.3, width: 2.5, height: 1.2, useContentSize: true }, null);
    expect(winState.state).toEqual({ x: 1, y: 2, width: 2, height: 1, useContentSize: true });

    winState = new ElectronWindowState({}, { x: 1.2, y: 2.3 }, null);
    expect(winState.state).toEqual({ x: 1, y: 2, width: 800, height: 600, useContentSize: false });

    winState = new ElectronWindowState({}, {}, null);
    expect(winState.state).toEqual({ x: 0, y: 0, width: 800, height: 600, useContentSize: false });

    screen.getDisplayMatching = jest.fn().mockImplementation(() => {
      return { bounds: { x: 0, y: 0, width: 400, height: 300 } };
    });
    winState = new ElectronWindowState({}, {}, null);
    expect(winState.state).toEqual({ x: 0, y: 0, width: 400, height: 300, useContentSize: false });

    screen.getDisplayMatching = jest.fn().mockImplementation(() => {
      return { bounds: { x: -2000, y: 0, width: 400, height: 300 } };
    });
    winState = new ElectronWindowState({}, {}, null);
    expect(winState.state).toEqual({ x: -2000, y: 0, width: 400, height: 300, useContentSize: false });

    screen.getDisplayMatching = jest.fn().mockImplementation(() => {
      return { bounds: { x: -2000, y: 0, width: 1200, height: 1200 } };
    });
    winState = new ElectronWindowState({}, {}, null);
    expect(winState.state).toEqual({ x: -2000 + 200, y: 300, width: 800, height: 600, useContentSize: false });

    screen.getDisplayMatching = originMatching;
  });

  test("should manage window", () => {
    let winState = new ElectronWindowState({}, { isMaximized: true, isFullScreen: true }, jest.fn());
    let window = new BrowserWindow();
    winState.manage(window);

    expect(window.isMaximized()).toBeTruthy();
    expect(window.isFullScreen()).toBeTruthy();

    window.setBounds({ x: 0, y: 0, width: 400, height: 300 });
    window.emit("move", {});
    jest.runAllTimers();

    expect(winState.state).toEqual({
      x: 0,
      y: 0,
      width: 800,
      height: 600,
      useContentSize: false,
      isMaximized: true,
      isFullScreen: true,
    });

    window.unmaximize();
    window.setFullScreen(false);
    window.emit("move", {});
    jest.runAllTimers();

    expect(winState.state).toEqual({
      x: 0,
      y: 0,
      width: 400,
      height: 300,
      useContentSize: false,
      isMaximized: false,
      isFullScreen: false,
    });

    window.setBounds({ x: 100, y: 100, width: 400, height: 300 });
    window.close();
    jest.runAllTimers();

    expect(winState.state).toEqual({
      x: 100,
      y: 100,
      width: 400,
      height: 300,
      useContentSize: false,
      isMaximized: false,
      isFullScreen: false,
    });
    expect((window as any)._eventsCount).toBe(0);
    expect(winState.onSave).toHaveBeenCalled();
  });
});

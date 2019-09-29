import MultiWinSaver from "../MultiWinSaver";

describe("MultiWinSaver", () => {
  test("addWin and deleteWin", () => {
    let multiWinSaver = new MultiWinSaver();
    let handleAddWin = jest.fn();
    let handleDeleteWin = jest.fn();

    multiWinSaver.onDidAddWin(handleAddWin);
    multiWinSaver.onDidDeleteWin(handleDeleteWin);

    multiWinSaver.addWin({ winId: "win1", prop: "win1" });

    expect(multiWinSaver.winInfos).toEqual([{ winId: "win1", prop: "win1" }]);
    expect(multiWinSaver.winIdMap).toEqual({ win1: { winId: "win1", prop: "win1" } });
    expect(handleAddWin).toHaveBeenLastCalledWith("win1");

    multiWinSaver.deleteWin("win1");
    expect(multiWinSaver.winInfos).toEqual([]);
    expect(multiWinSaver.winIdMap).toEqual({});
    expect(handleDeleteWin).toHaveBeenLastCalledWith("win1");
  });

  test("registerWin only notify once.", () => {
    let multiWinSaver = new MultiWinSaver();
    let win1Register = jest.fn();
    multiWinSaver.whenRegister("win1", win1Register);

    multiWinSaver.registerWin("win1");
    let win2Register = jest.fn();
    multiWinSaver.whenRegister("win1", win2Register);
    expect(win1Register).toHaveBeenCalled();
    expect(win2Register).toHaveBeenCalled();

    win1Register.mockReset();
    multiWinSaver.registerWin("win1");
    expect(win1Register).not.toHaveBeenCalled();
  });

  test("only notify when the same win reigster", () => {
    let multiWinSaver = new MultiWinSaver();
    let win1Register = jest.fn();
    multiWinSaver.whenRegister("win1", win1Register);

    multiWinSaver.registerWin("win2");
    expect(win1Register).not.toHaveBeenCalled();

    let win2Register = jest.fn();
    multiWinSaver.whenRegister("win1", win2Register);
    expect(win2Register).not.toHaveBeenCalled();
  });
});

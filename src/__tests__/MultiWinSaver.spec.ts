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
});

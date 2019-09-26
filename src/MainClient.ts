export default typeof window !== "object"
  ? require("./ElectronMainClient").default
  : require("./BrowserMainClient").default;

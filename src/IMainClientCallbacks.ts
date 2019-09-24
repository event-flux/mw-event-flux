export default interface IMainClientCallbacks {
  addWin(clientId: string): void;
  deleteWin(clientId: string): void;

  getStores(clientId: string): any;
  getInitStates(clientId: string): any;
  handleRendererMessage(action: string): Promise<any>;
}
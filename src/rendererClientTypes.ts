export interface IRendererClient {
  forward(invokeId: number, action: any): void;

  sendMessage(args: any): void;

  sendWindowMessage(winId: string, args: any): void;
}

export interface IRendererClientCallback {
  handleDispatchReturn(data: any): void;

  handleInvokeReturn(invokeId: string, error: any, data: any): void;

  handleMessage(data: any): void;

  handleWinMessage(senderId: string, data: any): void;
}

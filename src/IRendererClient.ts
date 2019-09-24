export type IStoreCallback = (state: any, store: any) => void;
export type IActionCallback = (action: any) => void;
export type IResultCallback = (invokeId: number, error: Error, result: any) => void;
export type IMessageCallback = (message: any) => void;
export type IWinMessageCallback = (senderId: string, message: any) => void;
export type IInitWindowCallback = (params: any) => void;
/*~ If this module has methods, declare them as functions like so.
 */
declare module "json-immutable-bn" {
  export function serialize(data: any, options?: { pretty: boolean }): string;
  export function deserialize(json: string, options?: any): any;
}

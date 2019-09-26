import { AppStore } from "event-flux";
import { IRendererClientCallback } from "./rendererClientTypes";

class IDGenerator {
  count = 0;

  genID() {
    return ++this.count;
  }

  dispose(id: number) {}
}

class RendererAppStore extends AppStore implements IRendererClientCallback {}

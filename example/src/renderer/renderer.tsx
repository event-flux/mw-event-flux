// Initial welcome page. Delete the following line to remove it.

// import React from 'react';
// import ReactDOM from 'react-dom';
// import RendererStore from 'electron-event-flux/lib/RendererAppStore';
import * as React from "react";
import * as ReactDOM from "react-dom";
import MyView from "./RootView";
import RendererAppStore from "mw-event-flux/lib/RendererAppStore";
import todoStoreDeclarer from "./rendererStore";
import { Provider } from "react-event-flux";

const rootElement = document.createElement("div");
document.body.appendChild(rootElement);

let startDate = new Date().getTime();

function reactRender(rendererAppStore) {
  console.log("spent time ", new Date().getTime() - startDate, "ms");
  console.log("render with state:", rendererAppStore.state);

  ReactDOM.render(
    <Provider appStore={rendererAppStore}>
      <MyView action={window.eventFluxWin.path} />
    </Provider>,
    rootElement
  );
}

let appStore = new RendererAppStore([todoStoreDeclarer]).init();

reactRender(appStore);

appStore.onDidInit(() => {
  reactRender(appStore);
});

window.onload = () => {
  let endDate = new Date();
  console.log("load elapse milliseconds " + (endDate.getTime() - startDate) + "ms");
};

import { h, render, Fragment } from "preact";
import "./classname-hook.js";

import { ToneCurve } from "./custom-elements/tone-curve/index.js";
customElements.define("tone-curve", ToneCurve);

import App from "./components/app/index.jsx";

render(<App />, document.querySelector("main"));

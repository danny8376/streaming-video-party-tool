import { localizeHtmlPage } from "./lib/localize_html_page";

localizeHtmlPage();

document.querySelector("#popoutVideoTime").addEventListener("click", () => {
    browser.runtime.sendMessage({event: "popoutVideoTime"});
});

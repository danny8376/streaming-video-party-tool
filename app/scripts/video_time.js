import { formatTimeString } from "./lib/time_util";

const timer = document.querySelector("#timer");

let lastTime = "";
let targetTabId = null;

// seems unable to send message here? just got ignored, monitor page loading in background.js instead
browser.runtime.sendMessage({event: "retrieveMonitoringTab"}).then(tabId => {
    if (tabId) targetTabId = tabId;
});

async function applyCSS(val) {
    val = val || (await browser.storage.local.get("videoTimeCSS")).videoTimeCSS
    const styleNode = document.querySelector("#customCSS");
    if (styleNode.childNodes.length === 0)
        styleNode.append(val);
    else
        styleNode.childNodes[0].replaceWith(val);
}

browser.runtime.onMessage.addListener((request, sender) => {
    // block any non-target tab messages
    if (sender.tab && sender.tab.id !== targetTabId) return;
    switch (request.event) {
        case "updateTargetTabId":
            targetTabId = request.tabId;
            break;
        case "videoPlayingStatus":
            const time = formatTimeString(Math.floor(request.time));
            if (lastTime !== time) {
                lastTime = time;
                timer.childNodes[0].replaceWith(time);
            }
        break;
    }
});

browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.videoTimeCSS) {
        applyCSS(changes.videoTimeCSS.newValue);
    }
});

applyCSS();

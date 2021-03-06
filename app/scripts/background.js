import { supportedHostnames } from "./lib/supported_hostnames.js";
import { parseTimeString } from "./lib/time_util";
import { ws2room } from "./lib/ws2room";
import { default as OBSWebSocket } from "obs-websocket-js";

browser.runtime.onInstalled.addListener((details) => {
  console.log('previousVersion', details.previousVersion);
});

let targetTabId = null;
let videoTimeWindow = null;
let hostWS = null;
let clientWSs = {};
let obs = null;
let autoStreamOffset = true;

const streamOffset = {
    offset: 0.0,
    counter: 0,
    interval: null
};

function platformStart(tabId) {
    if (tabId) {
        if (targetTabId !== null) { // if there's monitoring tab
            if (targetTabId !== tabId) {
                platformStop(targetTabId);
            }
        }
        targetTabId = tabId;
        browser.tabs.sendMessage(tabId, {
            event: "platformStart"
        });
        browser.runtime.sendMessage({
            event: "updateTargetTabId",
            tabId: targetTabId
        });
        browser.runtime.sendMessage({
            event: "refreshPopoutStatus"
        });
    } else {
        browser.tabs.query({
            currentWindow: true,
            active: true
        }).then(([tab]) => {
            const tabUrl = new URL(tab.url);
            if (supportedHostnames.includes(tabUrl.hostname)) {
                platformStart(tab.id);
            }
        });
    }
}

function platformStop(tabId) {
    tabId = tabId || targetTabId;
    if (tabId) {
        browser.tabs.sendMessage(tabId, {
            event: "platformStop"
        });
        if (tabId === targetTabId) targetTabId = null;
    }
}

function startCountingOffset() {
    if (streamOffset.interval !== null) return;

    streamOffset.counter = performance.now();
    streamOffset.interval = setInterval(() => {
        const counter = performance.now();
        const timePassed = counter - streamOffset.counter;
        streamOffset.counter = counter;
        streamOffset.offset += timePassed / 1000;

        if (hostWS) hostWS.send(`stream_sync,${streamOffset.offset}`);

        browser.runtime.sendMessage({
            event: "renderStreamOffset",
            offset: streamOffset.offset
        });
    }, 123);
}

function stopCountingOffset() {
    if (streamOffset.interval === null) return;

    clearInterval(streamOffset.interval);
    streamOffset.interval = null;
}

function ensureOBS() {
    if (obs) {
        obs.send('GetStreamingStatus').then(({streamTimecode: timecode}) => {
            streamOffset.offset = parseTimeString(timecode);
            startCountingOffset();
        });
    } else {
        browser.storage.local.get(["obsWebsocketUrl", "obsWebsocketPass"]).then(({obsWebsocketUrl, obsWebsocketPass}) => {
            const address = obsWebsocketUrl || "localhost:4444";
            const password = obsWebsocketPass || "";
            obs = new OBSWebSocket();
            obs.connect({address, password}).then(() => {
                obs.send('GetStreamingStatus').then(({streamTimecode: timecode}) => {
                    streamOffset.offset = parseTimeString(timecode);
                    startCountingOffset();
                });
            });
            obs.on("StreamStatus", ({totalStreamTime: sec, streamTimecode: timecode}) => {
                if (autoStreamOffset) {
                    const ms = timecode.slice(timecode.lastIndexOf("."));
                    streamOffset.offset = sec + parseFloat(ms);
                }
            });
        });
    }
}



browser.runtime.onMessage.addListener((request, sender) => {
    // block any non-target tab messages
    const verifyTab = () => sender.tab && sender.tab.id === targetTabId;
    switch (request.event) {
        case "retrieveMonitoringTab":
            return new Promise((resolve, reject) => resolve(targetTabId));
            break;
        case "refreshPopoutStatus": // dummy
            break;
        case "hostTab":
            platformStart();
            break;
        case "jumpToTab":
            browser.tabs.update(targetTabId, {
                active: true
            });
            browser.tabs.get(targetTabId).then((tab) => {
                browser.windows.update(tab.windowId, {
                    focused: true
                });
            });
            break;
        case "popoutVideoTime":
            // if there's no monitoring tab => monitor current tab
            if (!targetTabId) platformStart();
            // !!! must monitor before create window, or it's catch new window as target tab !!!

            if (!videoTimeWindow) {
                browser.windows.create({
                    //allowScriptsToClose: true,
                    type: "popup",
                    url: "pages/video_time.html",
                    width: 640,
                    height: 240
                }).then(newWin => {
                    videoTimeWindow = newWin;
                });
            }
            break;
        case "videoInfo":
            if (hostWS && verifyTab()) {
                const sendVideoInfo = () => {
                    const {platform, id, offset} = request.video;
                    hostWS.send(`video,${platform},${id},${offset}`);
                };
                if (hostWS.ready) {
                    sendVideoInfo();
                } else {
                    hostWS.addEventListener("open", sendVideoInfo, { once: true });
                }
            }
            break;
        case "videoPlayingStatus":
            if (hostWS && hostWS.ready && verifyTab()) {
                if (request.paused === null) { // detect by time
                    if (typeof hostWS.lastTime === "undefined") {
                        hostWS.lastTime = request.time;
                    } else {
                        if (hostWS.lastTime === request.time) {
                            if (!hostWS.hasOwnProperty("paused") || !hostWS.paused) {
                                hostWS.send("pause,");
                                hostWS.paused = true;
                            }
                        } else {
                            if (!hostWS.hasOwnProperty("paused") || hostWS.paused) {
                                hostWS.send("play,");
                                hostWS.paused = false;
                            }
                            hostWS.send(`sync,${request.time}`);
                        }
                    }
                } else { // pausing is reported by platform
                    if (hostWS.paused !== request.paused) {
                        hostWS.paused = request.paused;
                        if (request.paused) {
                            hostWS.send("pause,");
                        } else {
                            hostWS.send("play,");
                        }
                    }
                    if (!request.paused) {
                        hostWS.send(`sync,${request.time}`);
                    }
                }
            }
            break;
        case "retrieveHostingStatus":
            const wsUrl = hostWS ? hostWS.url : "";
            return new Promise((resolve, reject) => resolve([!!hostWS, wsUrl]));
            break;
        case "hostVideo":
            const room = request.room;
            hostWS = new WebSocket(room.url);
            hostWS.addEventListener("open", (evt) => {
                hostWS.send(`auth,${room.key}`);
                hostWS.ready = true;
                hostWS.heartbeat = setInterval(() => {
                    hostWS.send("heartbeat");
                }, 45000);

                // stream offset video set => enable stream offset fix
                if (request.streamOffsetVideo.id) {
                    const {platform, id} = request.streamOffsetVideo;
                    hostWS.send(`stream,${platform},${id.replace(/[^a-zA-Z0-9_-]/g, "")},0.0`);

                    autoStreamOffset = request.autoStreamOffset;
                    if (autoStreamOffset) {
                        ensureOBS();
                    } else {
                        startCountingOffset();
                    }
                }
            });
            hostWS.addEventListener("close", (evt) => {
                clearInterval(hostWS.heartbeat);
                console.log(evt);
                hostWS = null;
            });
            hostWS.addEventListener("message", (evt) => {
                console.log(evt.data)
            });

            // if there's monitoring tab => platformStart to send video info (already prevent re-initing)
            // if there's no monitoring tab => monitor current tab
            if (targetTabId) platformStart(targetTabId);
            else platformStart();

            break;
        case "endHostVideo":
            stopCountingOffset();
            hostWS.send("close");
            break;
        case "updateManualStreamOffset":
            streamOffset.offset = request.offset;
            break;
        case "renderStreamOffset": // dummy
            break;
        case "forceRenderStreamOffset":
            browser.runtime.sendMessage({
                event: "renderStreamOffset",
                offset: streamOffset.offset
            });
            break;
        case "roomDetected":
            try {
                fetch(ws2room(request.wsUrl)).then((res) => {
                    if (res.status === 302) {
                        const tabId = sender.tab.id;
                        browser.tabs.insertCSS(tabId, {
                            file: "/styles/join_room_prompt.css"
                        });
                        browser.tabs.executeScript(tabId, {
                            file: "/scripts/join_room_prompt.js"
                        }).then(() => {
                            browser.tabs.sendMessage(tabId, {
                                event: "videoPartyWSUrl",
                                wsUrl: request.wsUrl
                            });
                        });
                    }
                });
            } catch (ex) {
            }
            break;
    }
});

browser.windows.onRemoved.addListener((windowId) => {
    if (videoTimeWindow && videoTimeWindow.id == windowId) {
        videoTimeWindow = null;
    }
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tabId === targetTabId) {
        switch (tab.status) {
            case "complete":
                platformStart(tabId);
                break;
            case "loading":
                if (hostWS) {
                    hostWS.send("pause,");
                    hostWS.paused = true;
                }
        }
    }
    if (videoTimeWindow && tab.windowId === videoTimeWindow.id && tab.status === "complete") {
        browser.runtime.sendMessage({
            event: "updateTargetTabId",
            tabId: targetTabId
        });
    };
});
browser.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
    if (removedTabId === targetTabId) {
        targetTabId = addedTabId;
        platformStart(addedTabId);
    }
});
browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
    if (tabId === targetTabId) {
        targetTabId = null;
        if (hostWS) {
            hostWS.send("pause,");
            hostWS.paused = true;
        }
    }
});

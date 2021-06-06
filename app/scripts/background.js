import { supportedHostnames } from "./lib/supported_hostnames.js";

browser.runtime.onInstalled.addListener((details) => {
  console.log('previousVersion', details.previousVersion);
});

let videoTimeWindow = null;
let hostWS = null;
let clientWSs = {};

function platformStop() {
    if (videoTimeWindow.targetTabId) {
        browser.tabs.sendMessage(videoTimeWindow.targetTabId, {
            event: "platformStop"
        });
        videoTimeWindow.targetTabId = null;
    }
}

browser.runtime.onMessage.addListener((request, sender) => {
    switch (request.event) {
        case "popoutVideoTime":
            browser.tabs.query({
                currentWindow: true,
                active: true
            }).then(async ([tab]) => {
                const tabUrl = new URL(tab.url);
                if (supportedHostnames.includes(tabUrl.hostname)) {
                    if (videoTimeWindow) {
                        if (videoTimeWindow.targetTabId) platformStop();
                    } else {
                        videoTimeWindow = await browser.windows.create({
                            //allowScriptsToClose: true,
                            type: "popup",
                            url: "pages/video_time.html",
                            width: 640,
                            height: 240
                        });
                    }

                    videoTimeWindow.targetTabId = tab.id;

                    browser.tabs.sendMessage(videoTimeWindow.targetTabId, {
                        event: "platformStart"
                    });
                }
            });
            break;
        case "videoInfo":
            if (hostWS) {
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
            if (hostWS && hostWS.ready) {
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
            });
            hostWS.addEventListener("close", (evt) => {
                clearInterval(hostWS.heartbeat);
                console.log(evt);
                hostWS = null;
            });
            hostWS.addEventListener("message", (evt) => {
                console.log(evt.data)
            });
            browser.tabs.query({
                currentWindow: true,
                active: true
            }).then(([tab]) => {
                browser.tabs.sendMessage(tab.id, {
                    event: "platformStart"
                });
            });
            break;
        case "endHostVideo":
            hostWS.send("close");
            break;
        case "roomDetected":
            try {
                const roomUrl = new URL(request.wsUrl);
                roomUrl.protocol = roomUrl.protocol === "wss:" ? "https" : "http";
                const urlWsOffset = roomUrl.pathname.lastIndexOf("ws/room/");
                const apiPrefix = roomUrl.pathname.slice(0, urlWsOffset);
                const roomId = roomUrl.pathname.slice(urlWsOffset + 8);
                roomUrl.pathname = `${apiPrefix}room/${roomId}`;
                fetch(roomUrl.href).then((res) => {
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
        platformStop();
        videoTimeWindow = null;
    }
});

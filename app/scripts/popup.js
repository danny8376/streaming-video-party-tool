import { localizeHtmlPage } from "./lib/localize_html_page";
import { validateWSURL } from "./lib/validate_ws_url";
import { roomKey2Id } from "./lib/room_key2id";
import { parseTimeString, formatTimeMS, formatTimeString } from "./lib/time_util";
import { supportedHostnames } from "./lib/supported_hostnames.js";
import { encode as b58encode, decode as b58decode } from "base58-universal";

localizeHtmlPage();

let supportedPage = false;
let blockTimeUpdate = false;
let lastStreamOffsetValue = "";

const doms = {};
["popoutVideoTime", "roomServer", "roomKey", "roomId", "genRoomKey", "hostVideo", "autoStreamOffset", "manualStreamOffset", "manualStreamOffsetMS"].forEach(id => doms[id] = document.querySelector(`#${id}`));

browser.storage.local.get(["roomKey", "autoStreamOffset", "streamOffset"]).then(({roomKey, autoStreamOffset, streamOffset}) => {
    doms.roomKey.value = roomKey;
    doms.roomId.value = roomKey2Id(roomKey);

    if (typeof autoStreamOffset === "undefined") autoStreamOffset = true;
    doms.autoStreamOffset.checked = autoStreamOffset;
    updateStreamOffsetEditable(autoStreamOffset);
});

doms.popoutVideoTime.addEventListener("click", () => {
    browser.runtime.sendMessage({event: "popoutVideoTime"});
});

function updateHostVideoButton(hosting, supported) {
    if (typeof supported === "undefined") supported = supportedPage;
    const btn = doms.hostVideo;
    btn.setAttribute("data-hosting", hosting);
    if (hosting) { // hosting => always show stop button
        btn.disabled = false;
        btn.value = browser.i18n.getMessage("popoutHostVideoButtonStop")
        doms.roomServer.readOnly = true;
        doms.genRoomKey.disabled = true;
        doms.roomKey.readOnly = true;
        doms.autoStreamOffset.disabled = true;
    } else { // not hosting => start button => disable when non-supported page
        btn.disabled = !supported;
        btn.value = browser.i18n.getMessage("popoutHostVideoButtonHost")
        doms.roomServer.readOnly = false;
        doms.genRoomKey.disabled = false;
        doms.roomKey.readOnly = false;
        doms.autoStreamOffset.disabled = false;
    }
}

browser.tabs.query({
    currentWindow: true,
    active: true
}).then((tabs) => {
    let supported = false;

    try {
        const url = new URL(tabs[0].url);
        supported = supportedHostnames.includes(url.hostname);
    } catch (ex) {
    }
    supportedPage = supported;

    doms.popoutVideoTime.disabled = !supported;

    browser.runtime.sendMessage({event: "retrieveHostingStatus"})
        .then(([hosting, wsUrl]) => {
            updateHostVideoButton(hosting, supported);

            const domRoomServer = doms.roomServer;
            if (hosting) {
                domRoomServer.readOnly = true;
                domRoomServer.value = wsUrl.slice(0, wsUrl.lastIndexOf("ws/party-host/"));
            } else {
                domRoomServer.readOnly = false;
                browser.storage.local.get("roomServer").then(({roomServer}) => {
                    if (validateWSURL(roomServer)) {
                        domRoomServer.value = roomServer;
                    } else if (process.env.NODE_ENV === "development") {
                        domRoomServer.value = "wss://video-party.test-endpoint.lan/";
                    } else {
                        domRoomServer.value = "wss://main.ws.video-party.saru.moe/";
                    }
                });
            }
        });
});

function genRoomKey() {
    const keyBuffer = new Uint8Array(16);
    crypto.getRandomValues(keyBuffer);
    const roomKey = b58encode(keyBuffer);
    browser.storage.local.set({roomKey});
    doms.roomKey.value = roomKey;
    doms.roomId.value = roomKey2Id(roomKey);
}

doms.genRoomKey.addEventListener("click", genRoomKey);

doms.roomKey.addEventListener("change", (evt) => {
    const roomKey = evt.target.value;
    browser.storage.local.set({roomKey});
    doms.roomId.value = roomKey2Id(roomKey);
});

doms.autoStreamOffset.addEventListener("change", (evt) => {
    const autoStreamOffset = evt.target.checked;
    updateStreamOffsetEditable(autoStreamOffset);
    browser.storage.local.set({autoStreamOffset});
});

const { manualStreamOffset, manualStreamOffsetMS } = doms;
const manualStreamOffsetMSControl = ".manual-stream-offset-container input[type=button]";
const manualStreamOffsetControl = "#manualStreamOffset + div button";

function updateStreamOffsetEditable(autoStreamOffset) {
    manualStreamOffset.disabled = autoStreamOffset;
    // query here is required (dynamic generated doms)
    document.querySelectorAll(`${manualStreamOffsetMSControl}, ${manualStreamOffsetControl}`).forEach(ele => {
        ele.disabled = autoStreamOffset;
    });
}

document.querySelectorAll(manualStreamOffsetMSControl).forEach(ele => {
    const val = parseFloat(ele.value);
    ele.addEventListener("click", evt => {
        let newMS = parseFloat(manualStreamOffsetMS.firstChild.nodeValue) + val;
        let newSecs = parseTimeString(manualStreamOffset.value);
        if (newMS >= 1 || newMS < 0) {
            newSecs += Math.floor(newMS);
            if (newSecs < 0) {
                newSecs = 0;
                newMS = .0;
            }
            manualStreamOffset.value = formatTimeString(Math.max(newSecs, 0));
            newMS = (newMS + 1) % 1;
        }
        manualStreamOffsetMS.firstChild.replaceWith(formatTimeMS(newMS));
        browser.runtime.sendMessage({
            event: "updateManualStreamOffset",
            offset: newSecs + newMS
        });
    });
});
manualStreamOffset.addEventListener("input", evt => {
    const val = evt.target.value;
    if (lastStreamOffsetValue !== val) {
        lastStreamOffsetValue = val;
        const secs = parseTimeString(val);
        const ms = parseFloat(manualStreamOffsetMS.firstChild.nodeValue);
        browser.runtime.sendMessage({
            event: "updateManualStreamOffset",
            offset: secs + ms
        });
    }
});
manualStreamOffset.addEventListener("focus", evt => {
    blockTimeUpdate = true;
    lastStreamOffsetValue = evt.target.value;
});
manualStreamOffset.addEventListener("blur", evt => {
    blockTimeUpdate = false;
});
browser.runtime.sendMessage({event: "forceRenderStreamOffset"});

doms.hostVideo.addEventListener("click", async (evt) => {
    evt.target.disabled = true;
    if (evt.target.getAttribute("data-hosting") === "true") { // hosting => stop
        browser.runtime.sendMessage({event: "endHostVideo"});
        updateHostVideoButton(false);
    } else { // not hosting => host
        const wsUrl = new URL(doms.roomServer.value);
        const apiUrl = new URL(wsUrl);
        apiUrl.protocol = wsUrl.protocol === "wss:" ? "https" : "http";
        const roomId = doms.roomId.value;
        const roomKey = doms.roomKey.value;
        const checkRes = await fetch(`${apiUrl}room/${roomId}`, {
            headers: {
                "X-Room-Key": roomKey
            }
        });
        switch (checkRes.status) {
            case 403: // key fail => regen then recreate
                genRoomKey();
            case 404:
                const newRoomRes = await fetch(`${apiUrl}room/${roomId}`, {
                    method: 'POST',
                    headers: {
                        "X-Room-Key": roomKey
                    }
                });
                if (newRoomRes.status !== 201)
                    throw "fail to create room"; // fail, error
            case 302: // room exist
                browser.runtime.sendMessage({
                    event: "hostVideo",
                    room: {
                        url: `${wsUrl}ws/party-host/${roomId}`,
                        key: roomKey
                    },
                    autoStreamOffset: doms.autoStreamOffset.checked
                });
                updateHostVideoButton(true);
        }
    }
});

browser.runtime.onMessage.addListener((request, sender) => {
    switch (request.event) {
        case "renderStreamOffset":
            if (!blockTimeUpdate) {
                const secs = Math.floor(request.offset);
                const ms = request.offset % 1;
                manualStreamOffset.value = formatTimeString(secs);
                manualStreamOffsetMS.firstChild.replaceWith(formatTimeMS(ms));
            }
            break;
    }
});

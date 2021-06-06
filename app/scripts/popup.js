import { localizeHtmlPage } from "./lib/localize_html_page";
import { validateWSURL } from "./lib/validate_ws_url";
import { roomKey2Id } from "./lib/room_key2id";
import { supportedHostnames } from "./lib/supported_hostnames.js";
import { encode as b58encode, decode as b58decode } from "base58-universal";

localizeHtmlPage();

let supportedPage = false;

browser.storage.local.get("roomKey").then(({roomKey}) => {
    document.querySelector("#roomKey").value = roomKey;
    document.querySelector("#roomId").value = roomKey2Id(roomKey);
});

document.querySelector("#popoutVideoTime").addEventListener("click", () => {
    browser.runtime.sendMessage({event: "popoutVideoTime"});
});

function updateHostVideoButton(hosting, supported) {
    if (typeof supported === "undefined") supported = supportedPage;
    const btn = document.querySelector("#hostVideo");
    btn.setAttribute("data-hosting", hosting);
    if (hosting) { // hosting => always show stop button
        btn.disabled = false;
        btn.value = browser.i18n.getMessage("popoutHostVideoButtonStop")
    } else { // not hosting => start button => disable when non-supported page
        btn.disabled = !supported;
        btn.value = browser.i18n.getMessage("popoutHostVideoButtonHost")
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

    document.querySelector("#popoutVideoTime").disabled = !supported;

    browser.runtime.sendMessage({event: "retrieveHostingStatus"})
        .then(([hosting, wsUrl]) => {
            updateHostVideoButton(hosting, supported);

            const domRoomServer = document.querySelector("#roomServer")
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
    document.querySelector("#roomKey").value = roomKey;
    document.querySelector("#roomId").value = roomKey2Id(roomKey);
}

document.querySelector("#genRoomKey").addEventListener("click", genRoomKey);

document.querySelector("#roomKey").addEventListener("change", (evt) => {
    const roomKey = evt.target.value;
    browser.storage.local.set({roomKey});
    document.querySelector("#roomId").value = roomKey2Id(roomKey);
});

document.querySelector("#hostVideo").addEventListener("click", async (evt) => {
    evt.target.disabled = true;
    if (evt.target.getAttribute("data-hosting") === "true") { // hosting => stop
        browser.runtime.sendMessage({event: "endHostVideo"});
        updateHostVideoButton(false);
    } else { // not hosting => host
        const wsUrl = new URL(document.querySelector("#roomServer").value);
        const apiUrl = new URL(wsUrl);
        apiUrl.protocol = wsUrl.protocol === "wss:" ? "https" : "http";
        const roomId = document.querySelector("#roomId").value;
        const roomKey = document.querySelector("#roomKey").value;
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
                    }
                });
                updateHostVideoButton(true);
        }
    }
});

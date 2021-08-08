function setupPrompt(wsUrl) {
    const mainContainer = document.createElement("div");
    mainContainer.className = "streaming-video-party-tool-prompt";

    const promptBox = document.createElement("div");
    promptBox.className = "prompt-box";

    const text = document.createTextNode(browser.i18n.getMessage("joinRoomPromptDescription"));
    const br = document.createElement("br");
    const btnOk = document.createElement("input");
    btnOk.type = "button";
    btnOk.value = browser.i18n.getMessage("joinRoomPromptOk");
    const btnCancel = document.createElement("input");
    btnCancel.type = "button";
    btnCancel.value = browser.i18n.getMessage("joinRoomPromptCancel");
    promptBox.append(text, br, btnOk, btnCancel);

    mainContainer.appendChild(promptBox);

    document.body.appendChild(mainContainer);

    btnCancel.addEventListener("click", () => {
        document.body.removeChild(mainContainer);
    });

    btnOk.addEventListener("click", () => {
        playVideoParty(wsUrl);
        document.body.removeChild(mainContainer);
    });
}

let userOffset = 0.0;
let forceSeek = false;

function injectControl() {
    const platform = window.streamingVideoPartyToolPlatform;

    const mainContainer = document.createElement("div");
    mainContainer.className = "streaming-video-party-tool-controls";

    const offsetLabel = document.createElement("label");
    offsetLabel.for = "streaming-video-party-tool-controls-offset";
    offsetLabel.appendChild(document.createTextNode(browser.i18n.getMessage("joinRoomPromptControlOffset")));
    const offsetSub1s = document.createElement("input");
    offsetSub1s.type = "button";
    offsetSub1s.value = "-1";
    const offsetSub100ms = document.createElement("input");
    offsetSub100ms.type = "button";
    offsetSub100ms.value = "-0.1";
    const offsetSub10ms = document.createElement("input");
    offsetSub10ms.type = "button";
    offsetSub10ms.value = "-0.01";
    const offset = document.createElement("input");
    offset.type = "number";
    offset.name = "streaming-video-party-tool-controls-offset";
    offset.min = -10.0;
    offset.max = 10.0;
    offset.step = 0.01;
    offset.value = 0;
    const offsetAdd10ms = document.createElement("input");
    offsetAdd10ms.type = "button";
    offsetAdd10ms.value = "+0.01";
    const offsetAdd100ms = document.createElement("input");
    offsetAdd100ms.type = "button";
    offsetAdd100ms.value = "+0.1";
    const offsetAdd1s = document.createElement("input");
    offsetAdd1s.type = "button";
    offsetAdd1s.value = "+1";

    const offsetChanged = () => {
        userOffset = offset.valueAsNumber;
        forceSeek = true;
    };

    [offsetSub1s, offsetSub100ms, offsetSub10ms, offsetAdd10ms, offsetAdd100ms, offsetAdd1s].forEach(ele => {
        const val = parseFloat(ele.value) / offset.step;
        ele.addEventListener("click", evt => {
            if (val > 0)
                offset.stepUp(val);
            else
                offset.stepDown(-val);
            offsetChanged();
        });
    });

    offset.addEventListener("change", evt => {
        offsetChanged();
    });

    mainContainer.append(offsetLabel, offsetSub1s, offsetSub100ms, offsetSub10ms, offset, offsetAdd10ms, offsetAdd100ms, offsetAdd1s);

    platform.injectControl(mainContainer);
}

function parseWsMessage(msg) {
    let offset = null;
    if (msg.startsWith("stream_fix#")) {
        [_, offset, msg] = msg.split("#");
    }
    const [cmd, ...args] = msg.split(",");
    return [offset, cmd, args];
}

function goNextVideo(videoPlatform, videoId, wsUrl) {
    let videoUrl = "";
    switch (videoPlatform) {
        case "anigamer":
            videoUrl = `https://ani.gamer.com.tw/animeVideo.php?sn=${videoId}`;
            break;
        case "youtube":
            videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            break;
    }
    location.href = `${videoUrl}#videopartyroomautoconfirm&videopartyroom=${encodeURIComponent(wsUrl)}`;
}

async function playVideoParty(wsUrl) {
    const platform = window.streamingVideoPartyToolPlatform;
    let videoInfo = await platform.getVideoInfo();
    platform.init();
    injectControl();
    platform.whenPlayerReady().then(() => {
        const ws = new WebSocket(wsUrl);
        ws.addEventListener("close", (evt) => {
            platform.pause(); // pause when disconnected
            // TODO: check if pause is required
        });
        ws.addEventListener("message", (evt) => {
            const [offset, cmd, args] = parseWsMessage(evt.data);
            if (offset !== null) {
                // TODO: stream fix mode
            } else {
                switch (cmd) {
                    case "video":
                        const [videoPlatform, videoId, starttime] = args;
                        const newVideoInfo = `${videoPlatform},${videoId}`;
                        if (videoInfo.platform !== videoPlatform || videoInfo.id !== videoId) { // switch video
                            goNextVideo(videoPlatform, videoId, wsUrl);
                        }
                    case "sync":
                        platform.getCurrentTime().then(time => {
                            const [targetTimeStr] = args;
                            let targetTime = parseFloat(targetTimeStr);
                            targetTime += userOffset; 
                            // we don't seek if offset is within 0.5s
                            // TODO: configurable offset limit
                            if (forceSeek || Math.abs(targetTime - time) > 0.5) {
                                forceSeek = false;
                                platform.seek(targetTime);
                            }
                        });
                        break;
                    case "play":
                        platform.whenPlayerReady().then(() => {
                            platform.play();
                        });
                        break;
                    case "pause":
                        platform.pause();
                        break;
                }
            }
        });
    });
}

browser.runtime.onMessage.addListener(request => {
    switch (request.event) {
        case "videoPartyWSUrl":
            const params = new URLSearchParams(location.hash.slice(1));
            if (params.has("videopartyroomautoconfirm")) {
                playVideoParty(request.wsUrl);
            } else {
                setupPrompt(request.wsUrl);
            }
            break;
    }
});

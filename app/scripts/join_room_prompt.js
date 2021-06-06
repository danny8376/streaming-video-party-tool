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

function parseWsMessage(msg) {
    let offset = null;
    if (msg.startsWith("stream_fix#")) {
        [_, offset, msg] = msg.split("#");
    }
    const [cmd, ...args] = msg.split(",");
    return [offset, cmd, args];
}

function playVideoParty(wsUrl) {
    const platform = window.streamingVideoPartyToolPlatform;
    platform.init();
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
                    case "sync":
                        platform.getCurrentTime().then(time => {
                            const [targetTime] = args;
                            // we don't seek if offset is within 0.5s
                            // TODO: configurable offset limit
                            if (Math.abs(targetTime - time) > 0.5) {
                                platform.seek(targetTime);
                            }
                        });
                        break;
                    case "play":
                        platform.play();
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
            setupPrompt(request.wsUrl);
            break;
    }
});

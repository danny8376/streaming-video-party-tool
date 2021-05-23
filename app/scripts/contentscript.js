let platform = null;

function videoTimeUpdate(e) {
    browser.runtime.sendMessage({
        event: "videoTimeUpdate",
        timeString: e.detail.timeString
    });
}

browser.runtime.onMessage.addListener(request => {
    switch (request.event) {
        case "platformStart":
            if (!platform) {
                platform = window.streamingVideoPartyToolPlatform;
                // last is wantsUntrusted, required for firefox to work
                platform.addEventListener("videoTimeUpdate", videoTimeUpdate, true, true);
                platform.start();
            }
            break;

        case "platformStop":
            if (platform) {
                platform.removeEventListener("videoTimeUpdate", videoTimeUpdate);
                platform.stop();
                platform = null;
            }
            break;
    }
});

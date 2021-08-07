function videoPlayingStatus(e) {
    browser.runtime.sendMessage(Object.assign({
        event: "videoPlayingStatus"
    }, e.detail));
}

browser.runtime.onMessage.addListener(request => {
    const platform = window.streamingVideoPartyToolPlatform;
    switch (request.event) {
        case "platformStart":
            platform.init();
            if (!platform.running()) {
                // last is wantsUntrusted, required for firefox to work
                platform.addEventListener("videoPlayingStatus", videoPlayingStatus, true, true);
                //platform.whenPlayerReady().then(() => {
                    platform.start();
                //});
            }
            platform.getVideoInfo().then((video) => {
                browser.runtime.sendMessage({
                    event: "videoInfo",
                    video
                });
            });
            break;

        case "platformStop":
            if (platform.running()) {
                platform.removeEventListener("videoPlayingStatus", videoTimeUpdate);
                platform.stop();
            }
            break;
    }
});

try {
    const params = new URLSearchParams(location.hash.slice(1));
    const wsUrl = params.get("videopartyroom");
    if (wsUrl !== null) {
        browser.runtime.sendMessage({
            event: "roomDetected",
            wsUrl
        });
    }
} catch (ex) {
}

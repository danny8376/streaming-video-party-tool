browser.runtime.onInstalled.addListener((details) => {
  console.log('previousVersion', details.previousVersion);
});

let videoTimeWindow = null;

function platformStop() {
    if (videoTimeWindow.targetTabId) {
        browser.tabs.sendMessage(videoTimeWindow.targetTabId, {
            event: "platformStop"
        });
        videoTimeWindow.targetTabId = null;
    }
}

browser.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    switch (request.event) {
        case "popoutVideoTime":
            // must query before create window, or we'll get new windows here
            const tabs = await browser.tabs.query({
                currentWindow: true,
                active: true
            });
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

            videoTimeWindow.targetTabId = tabs[0].id;

            browser.tabs.sendMessage(videoTimeWindow.targetTabId, {
                event: "platformStart"
            });
            break;
        case "videoTimeUpdate": // no need to process here
            break;
    }
});

browser.windows.onRemoved.addListener((windowId) => {
    if (videoTimeWindow && videoTimeWindow.id == windowId) {
        platformStop();
        videoTimeWindow = null;
    }
});

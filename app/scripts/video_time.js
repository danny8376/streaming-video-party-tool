const timer = document.querySelector("#timer");

let lastTime = "";

function formatTimeString(secs) {
    const hours = Math.floor(secs / 60 / 60);
    const minutes = Math.floor(secs / 60) - (hours * 60);
    const seconds = secs % 60;

    const formatted = hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
    return formatted;
}

async function applyCSS(val) {
    val = val || (await browser.storage.local.get("videoTimeCSS")).videoTimeCSS
    const styleNode = document.querySelector("#customCSS");
    if (styleNode.childNodes.length === 0)
        styleNode.append(val);
    else
        styleNode.childNodes[0].replaceWith(val);
}

browser.runtime.onMessage.addListener(request => {
    switch (request.event) {
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

const timer = document.querySelector("#timer");

async function applyCSS(val) {
    val = val || (await browser.storage.local.get("videoTimeCSS")).videoTimeCSS
    const styleNode = document.querySelector("#customCSS");
    if (styleNode.childNodes.length === 0)
        styleNode.append(val);
    else
        styleNode.childNodes[0].replaceWith(val);
}

browser.runtime.onMessage.addListener(request => {
    timer.childNodes[0].replaceWith(request.timeString);
});

browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.videoTimeCSS) {
        applyCSS(changes.videoTimeCSS.newValue);
    }
});

applyCSS();

const timer = document.querySelector("#timer");

async function applyCSS(val) {
    val = val || (await browser.storage.local.get("videoTimeCSS")).videoTimeCSS
    document.querySelector("#customCSS").innerHTML = val;
}

browser.runtime.onMessage.addListener(request => {
    timer.innerText = request.timeString;
});

browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.videoTimeCSS) {
        applyCSS(changes.videoTimeCSS.newValue);
    }
});

applyCSS();

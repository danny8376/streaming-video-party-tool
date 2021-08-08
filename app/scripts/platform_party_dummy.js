class PartyDummy {
    init() {
        const scriptNode = document.createElement("script");
        scriptNode.append(`
            if (window.streamingVideoPartyToolPlatform_dummy_web_inited) {
                window.streamingVideoPartyToolPlatform_mark_ext_exist();
            } else {
                window.streamingVideoPartyToolPlatform_ext_exist = true;
            }
        `);
        document.body.appendChild(scriptNode);
    }
    running() { return true; }
    start() {}
    stop() {}
    async getVideoInfo() {
        return {
            platform: this.constructor.name.toLowerCase(),
            id: "dummy",
            offset: 0.0
        };
    }
    injectControl(dom) { // per platform
    }
    whenPlayerReady() {
        return new Promise((resolve, reject) => resolve());
    }
}

window.streamingVideoPartyToolPlatform = new PartyDummy();

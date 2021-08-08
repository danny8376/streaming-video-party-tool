class PartyDummy {
    init() {}
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

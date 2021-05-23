import { CommonBase } from "./lib/platform_common_base";

class AniGamer extends CommonBase {
    constructor() {
        super();
        this.adCheckSelector = "#adSkipButton";
        this.timeSelector = ".vjs-current-time-display";
    }
}

window.streamingVideoPartyToolPlatform = new AniGamer();

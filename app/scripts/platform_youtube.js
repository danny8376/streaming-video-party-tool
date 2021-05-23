import { CommonBase } from "./lib/platform_common_base";

class YouTube extends CommonBase {
    constructor() {
        super();
        this.sandboxEscapeOrigins = ["https://www.youtube.com"];
        this.adCheckSelector = ".ytp-ad-skip-button";
        //this.timeSelector = ".ytp-time-current";
    }

    start() {
        this.patchForSandboxEscape(`
            switch (cmd) {
                case "getCurrentTime":
                    const secs = document.querySelector("#movie_player").getCurrentTime();
                    response(cmd, secs);
                    break;
            }
        `);

        super.start();
    }

    async loop() {
        let timeString = "";
        if (document.querySelector(this.adCheckSelector)) {
            // in ad
            timeString = "00:00:00"
        } else {
            const [secs] = await this.sandboxEscapeCmd("getCurrentTime");
            timeString = this.formatTimeString(Math.floor(secs));
        }
        if (this.lastTimeString != timeString) {
            this.lastTimeString = timeString;
            this.dispatchVideoTimeUpdate(timeString);
        }
    }
}

window.streamingVideoPartyToolPlatform = new YouTube();

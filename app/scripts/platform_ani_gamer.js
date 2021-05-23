import { CommonBase } from "./lib/platform_common_base";

class AniGamer extends CommonBase {
    constructor() {
        super();
        this.sandboxEscapeOrigins = ["https://ani.gamer.com.tw"];
        this.adCheckSelector = "#adSkipButton";
        //this.timeSelector = ".vjs-current-time-display";
    }

    start() {
        this.patchForSandboxEscape(`
            switch (cmd) {
                case "getCurrentTime":
                    const secs = player.currentTime();
                    response(cmd, secs);
                    break;
            }
        `,`
            const player = videojs("ani_video");
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
        this.checkTimeUpdate(timeString);
    }
}

window.streamingVideoPartyToolPlatform = new AniGamer();

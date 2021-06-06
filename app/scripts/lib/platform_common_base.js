class CommonBase extends EventTarget {
    constructor() {
        super();
        this.interval = null;
        this.sandboxEscapeOrigins = [];
        this.callbacks = {};
        this.adCheckSelector = "";
        this.timeSelector = "";
        this.defaultTimeResult = [null, 0.0];
        this.inited = false;
    }

    init() {
        if (this.inited) return;
        this._init();
        this.inited = true;
    }

    _init() { // nothing really need to do here
    }

    dispatchVideoPlayingStatus(paused, time) {
        this.dispatchEvent(new CustomEvent("videoPlayingStatus", {
            detail: {
                paused,
                time
            }
        }));
    }

    // ==== following funcs are async for injected js support ====
    async getCurrentTime() {
            const timeString = document.querySelector(this.timeSelector).textContent;
            return parseTimeString(timeString);
    }

    async seek() {
    }

    async play() {
    }

    async pause() {
    }

    async getVideoId() {
        return encodeURIComponent(location.href);
    }

    async getVideoInfo() {
        return {
            platform: this.constructor.name.toLowerCase(),
            id: await this.getVideoId(),
            offset: 0.0
        };
    }

    async checkAd() {
        return !!document.querySelector(this.adCheckSelector);
    }

    async checkPlayerReady() {
        return await this.checkAd(); // only ad check by default
    }

    // function to access normal web scope functions using postMessage
    sandboxEscapeCmd(cmd, ...args) {
        const promise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(), 1000);
            this.callbacks[`result_${cmd}`] = (vals) => {
                clearTimeout(timeout);
                resolve(vals);
            }
        });
        window.postMessage(["streamingVideoPartyToolPlatform_sandboxEscape", cmd, ...args].join(","));
        return promise;
    }

    patchForSandboxEscape(case_statement, init_statement, {jsVideoId, jsFunctions, jsPlayingStatus}) {
        const jsFuncs = [];

        if (jsVideoId) {
            jsFuncs.push("getVideoId");
        }

        if (jsFunctions) {
            jsFuncs.push(
                "getCurrentTime",
                "seek",
                "play",
                "pause"
            );
        }

        jsFuncs.forEach(funcName => {
            this[funcName] = async (...args) => {
                const res = await this.sandboxEscapeCmd(funcName, args);
                switch (res.length) {
                    case 0:
                        return;
                    case 1:
                        return res[0];
                    default:
                        return res;
                }
            }
        });

        if (jsPlayingStatus) {
            this.defaultTimeResult = [true, 0.0];
            this._loopGetPlayingStatus = async () => {
                const [paused, time] = await this.sandboxEscapeCmd("getPlayingStatus");
                return [paused === "true", parseFloat(time)];
            }
        }

        window.addEventListener("message", (e) => {
            if (this.sandboxEscapeOrigins.includes(e.origin)) {
                const [prefix, cmd, ...vals] = e.data.split(",");
                if (prefix === "streamingVideoPartyToolPlatform_sandboxEscape") {
                    if (this.callbacks[cmd]) {
                        this.callbacks[cmd](vals);
                    }
                }
            }
        });

        // inject script to escape content sandbox for calling youtube page api
        const scriptNode = document.createElement("script");
        scriptNode.append(`
            (() => {
                const origins = ["${this.sandboxEscapeOrigins.join('", "')}"];

                ${init_statement}

                window.addEventListener("message", (e) => {
                    let responsed = false;
                    const response = (cmd, ...vals) => {
                        window.postMessage(["streamingVideoPartyToolPlatform_sandboxEscape", "result_" + cmd, ...vals].join(","));
                        responsed = true;
                    }
                    if (origins.includes(e.origin)) {
                        const [prefix, cmd, ...args] = e.data.split(",");
                        if (prefix === "streamingVideoPartyToolPlatform_sandboxEscape") {
                            ${case_statement}
                            if (!responsed) response(cmd);
                        }
                    }
                });
            })();
        `);
        document.body.appendChild(scriptNode);
    }

    whenPlayerReady() {
        return new Promise((resolve, reject) => {
            const check = async () => {
                if (await this.checkPlayerReady()) {
                    resolve();
                } else {
                    setTimeout(check, 250);
                }
            }
            check();
        });
    }

    start() {
        this.interval = setInterval(() => {
            this.loop();
        }, 100);
    }

    async _loopGetPlayingStatus() {
        return [null, await this.getCurrentTime()];
    }

    async loop() {
        if (await this.checkPlayerReady()) {
            this.dispatchVideoPlayingStatus(...await this._loopGetPlayingStatus());
        } else {
            this.dispatchVideoPlayingStatus(...this.defaultTimeResult);
        }
    }

    stop() {
        clearInterval(this.interval);
        this.interval = null;
    }

    running() {
        return this.interval !== null;
    }

    parseTimeString(str) {
        const timeParts = str.split(":");
        const secPart = timeParts.pop();
        let secs = parseFloat(secPart);
        const minPart = timeParts.pop();
        if (minPart) secs += parseInt(minPart) * 60;
        const hourPart = timeParts.pop();
        if (hourPart) secs += parseInt(hourPart) * 60 * 60;
        return secs;
    }
}

export { CommonBase };

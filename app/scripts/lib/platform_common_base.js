class CommonBase extends EventTarget {
    constructor() {
        super();
        this.interval = null;
        this.lastTimeString = "";
        this.sandboxEscapeOrigins = [];
        this.callbacks = {};
        this.adCheckSelector = "";
        this.timeSelector = "";
    }

    dispatchVideoTimeUpdate(timeString) {
        this.dispatchEvent(new CustomEvent("videoTimeUpdate", {
            detail: {
                timeString
            }
        }));
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

    patchForSandboxEscape(case_statement, init_statement) {
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

                function response(cmd, ...vals) {
                    window.postMessage(["streamingVideoPartyToolPlatform_sandboxEscape", "result_" + cmd, ...vals].join(","));
                }

                window.addEventListener("message", (e) => {
                    if (origins.includes(e.origin)) {
                        const [prefix, cmd, ...args] = e.data.split(",");
                        if (prefix === "streamingVideoPartyToolPlatform_sandboxEscape") {
                            ${case_statement}
                        }
                    }
                });
            })();
        `);
        document.body.appendChild(scriptNode);
    }

    start() {
        this.interval = setInterval(() => {
            this.loop();
        }, 100);
    }

    checkTimeUpdate(timeString) {
        if (this.lastTimeString != timeString) {
            this.lastTimeString = timeString;
            this.dispatchVideoTimeUpdate(timeString);
        }
    }

    loop() {
        let timeString = "";
        if (document.querySelector(this.adCheckSelector)) {
            // in ad
            timeString = "0:00"
        } else {
            timeString = document.querySelector(this.timeSelector).textContent;
        }
        this.checkTimeUpdate(timeString);
    }

    stop() {
        clearInterval(this.interval);
    }

    formatTimeString(secs) {
        const hours = Math.floor(secs / 60 / 60);
        const minutes = Math.floor(secs / 60) - (hours * 60);
        const seconds = secs % 60;

        const formatted = hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
        return formatted;
    }
}

export { CommonBase };

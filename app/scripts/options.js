import { localizeHtmlPage } from "./lib/localize_html_page";
import { validateWSURL } from "./lib/validate_ws_url";

localizeHtmlPage();

const keys = ["videoTimeCSS", "roomServer", "obsWebsocketUrl", "obsWebsocketPass"];
const validators = {
    roomServer(value) {
        if (validateWSURL(value)) {
            return [true, value];
        } else {
            return [false, ""];
        }
    }
};

keys.forEach((key) => {
    document.querySelector(`#${key}`).addEventListener("change", (e) => {
        const validator = validators[key];
        let value = e.target.value;
        const save = (value) => {
            const val = {};
            val[key] = e.target.value
            browser.storage.local.set(val);
        }
        if (validator) {
            const [valid, newValue] = validator(value);
            if (!valid) {
                e.target.value = newValue;
            }
            save(newValue);
        } else {
            save(value);
        }
    });
});

(async () => {
    const vals = await browser.storage.local.get(keys);
    keys.forEach((key) => {
        if (typeof vals[key] !== "undefined")
            document.querySelector(`#${key}`).value = vals[key];
    });
})();


import { localizeHtmlPage } from "./lib/localize_html_page";

localizeHtmlPage();



const keys = ["videoTimeCSS"];

keys.forEach((key) => {
    document.querySelector(`#${key}`).addEventListener("change", (e) => {
        const val = {};
        val[key] = e.target.value
        browser.storage.local.set(val);
    });
});

(async () => {
    const vals = await browser.storage.local.get(keys);
    keys.forEach((key) => {
        if (typeof vals[key] !== "undefined")
            document.querySelector(`#${key}`).value = vals[key];
    });
})();


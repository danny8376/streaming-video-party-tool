function tryReplace(str) {
    const newStr = str.replace(/__MSG_(\w+)__/g, (match, v1) => {
        return v1 ? browser.i18n.getMessage(v1) : "";
    });

    return [str !== newStr, newStr];
}

function localizeHtmlPage()
{
    //Localize by replacing __MSG_***__ meta tags
    document.querySelectorAll("*").forEach((ele) => {
        if (typeof ele.value !== "undefined") {
            const [replaced, newVal] = tryReplace(ele.value);
            if (replaced) ele.value = newVal;
        }

        if ((ele.childNodes.length === 0 && ele.innerHTML !== "") ||
           (ele.childNodes.length === 1 && ele.childNodes[0].childNodes.length === 0)) { // text node
            const [replaced, newVal] = tryReplace(ele.innerHTML);
            if (replaced) ele.innerHTML = newVal;
        }
    });
}

export { localizeHtmlPage };

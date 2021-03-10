const getScores = require('./readabilityScorer.js');
const getTextContent = require('./pageParser.js');

function css(el) {
    var sheets = document.styleSheets, ret = [];
    el.matches = el.matches || el.webkitMatchesSelector || el.mozMatchesSelector
        || el.msMatchesSelector || el.oMatchesSelector;
    for (var i in sheets) {
        try {
            var rules = sheets[i].rules || sheets[i].cssRules;
        } catch (e) {
            //could not check this stylesheet
            console.log(`Could not read stylesheet ${sheets[i].href}`);
            continue;
        }
        for (var r in rules) {
            if (el.matches(rules[r].selectorText)) {
                ret.push(rules[r].cssText);
            }
        }
    }
    return ret;
}

// function getWeightedFontSize() {
//     paragraphs = document.getElementsByTagName('p');
//     for (let p of paragraphs) {
//         console.log(css(p));
//     }
// }

// function getWeightedFontStyle() {
//     paragraphs = document.getElementsByTagName('p');
//     for (let p of paragraphs) {
//         console.log(css(p));
//     }
// }

function getFontSize() {
    var style = window.getComputedStyle(document.body, null).getPropertyValue('font-size');
    var fontSize = parseFloat(style);
}

function getFontStyle() {
    var style = window.getComputedStyle(document.body, null).getPropertyValue('font');
    return style;
}

function getFontColor() {
    var style = window.getComputedStyle(document.body, null).getPropertyValue('color');
    return style;
}

function getBackgroundColor() {
    var style = window.getComputedStyle(document.body, null).getPropertyValue('background-color');
    return style;
}

function sRGBtoLin(colorChannel) {
    // Linearizes a 0-1 color value, according to IEC standards
    // https://webstore.iec.ch/publication/6169
    // https://en.wikipedia.org/wiki/SRGB
    if (colorChannel <= 0.04045) {
        return colorChannel / 12.92;
    } else {
        return Math.pow(((colorChannel + 0.055) / 1.055), 2.4);
    }
}

function calculateLuminance(rgbStr) {
    const rgbArr = rgbStr.match(/\d+/g);

    const r = sRGBtoLin(Number(rgbArr[0]) / 255);
    const g = sRGBtoLin(Number(rgbArr[1]) / 255);
    const b = sRGBtoLin(Number(rgbArr[2]) / 255);

    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return l;
    // Normalized, 0-1
}

function calculateContrastRatio(luma1, luma2) {
    if (luma1 > luma2) {
        return (luma1 + 0.05) / (luma2 + 0.05);
    } else {
        return (luma2 + 0.05) / (luma1 + 0.05);
    }
}

function getContrastRatio() {
    const fc = getFontColor();
    const bgc = getBackgroundColor();
    const fcY = calculateLuminance(fc);
    const bgcY = calculateLuminance(bgc);
    return calculateContrastRatio(fcY, bgcY);
}

chrome.runtime.onConnect.addListener((port) => {
    port.onMessage.addListener((msg) => {
        if (msg.function == 'features') {

            const fontSize = getFontSize();

            const fontStyle = getFontStyle();

            const contrastRatio = getContrastRatio();

            const bodyText = new XMLSerializer().serializeToString(document.body);

            const parsedText = getTextContent(bodyText);

            const readabilityScore = getScores(parsedText)

            const searchinScore = readabilityScore.medianGrade;

            port.postMessage({
                'searchinScore': searchinScore,
                'fontSize': fontSize,
                'fontStyle': fontStyle,
                'contrastRatio': contrastRatio
            });
        }
    });
});

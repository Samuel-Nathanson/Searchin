const getScores = require('./readabilityScorer.js');
const getTextContent = require('./pageParser.js');
var JSSoup = require('jssoup').default;

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

function get_tag_counts(html) {
    // Enumerate these because we want 0's in final output
    tags = {
        'u': 0,
        'i': 0,
        'b': 0,
        'em': 0,
        'mark': 0,
        'strong': 0,
        'small': 0,
        'del': 0,
        'ins': 0,
        'sub': 0,
        'sup': 0,
        'audio': 0,
        'video': 0,
        'cite': 0,
        'code': 0,
        'figure': 0,
        'img': 0
    }

    let total = 1

    const soup = new JSSoup(html);
    const elements = soup.findAll();
    console.log(elements);
    elements.forEach((e) => {
        if (e.name in tags) {
            tags[e.name] += 1;
        }
    });

    // Consolidate like tags
    tags['b'] = tags['b'] + tags['strong']
    delete tags['strong']

    tags['i'] = tags['i'] + tags['em']
    delete tags['em']

    tags['img'] = tags['img'] + tags['figure']
    delete tags['figure']

    for (const [key, value] of Object.entries(tags)) {
        tags[key] = value / total;
    }

    return tags
}

function count_punctuation(excerpt) {
    let punctuation = 0

    // Assuming that excerpt does not contain tags

    const rawString = String.raw`!"#$%&'()*+,-./:;<=>?@[\]^_\`{|}~`;

    console.log(rawString);
    excerpt.split('').forEach(i => {
        if (rawString.includes(i)) {
            console.log(i)
            punctuation += 1
        }
    });

    return punctuation / excerpt.length
}

chrome.runtime.onConnect.addListener((port) => {
    port.onMessage.addListener((msg) => {
        if (msg.function == 'features') {

            const fontSize = getFontSize();

            const fontStyle = getFontStyle();

            const contrastRatio = getContrastRatio();

            const bodyText = new XMLSerializer().serializeToString(document.body);

            const parsedText = getTextContent(bodyText);

            const readabilityScore = getScores(parsedText);

            const searchinScore = readabilityScore.medianGrade ? readabilityScore.medianGrade : -1;

            port.postMessage({
                'searchinScore': searchinScore,
                'fontSize': fontSize,
                'fontStyle': fontStyle,
                'contrastRatio': contrastRatio
            });
        }
    });
});

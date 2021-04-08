var JSSoup = require('jssoup').default;

const minimumUsefulParagraphLength = 20;

/**
 * Convert a template string into HTML DOM nodes
 * @param  {String} str The template string
 * @return {Node}       The template HTML
 */
var stringToHTML = function (str) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(str, 'text/html');
    return doc.body;
};

function getTextContent(html) {
    const SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
    const STYLE_REGEX = /<style\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/style>/gi;
    while (SCRIPT_REGEX.test(html)) {
        html = html.replace(SCRIPT_REGEX, "");
    }
    while (STYLE_REGEX.test(html)) {
        html = html.replace(STYLE_REGEX, "");
    }

    let textContent = stringToHTML(html).innerText;

    // Clean Text Content
    textContent = textContent.replace(/(\r\n|\n|\r)/gm, ". ");
    textContent = textContent.replace('\t', '');
    textContent = textContent.replace('\r', '');

    var textVal = '';
    textContent.split(' ').forEach(word => {
        if (word.length < 14) {
            textVal += `${word} `;
        }
    });

    // Low number of characters
    if (textVal.length < 100) {
        return "";
    }

    return textContent;
}

function getParagraphContent(htmlContent) {

    const soup = new JSSoup(htmlContent);

    const paragraphs = soup.findAll('p');

    let textContent = "";

    for (let i = 0; i < paragraphs.length; i++) {
        let trimmedParagraph = paragraphs[i].text.trim();
        if (trimmedParagraph.length > minimumUsefulParagraphLength) {
            textContent += trimmedParagraph + (trimmedParagraph[trimmedParagraph.length - 1] === "." ? " " : ". ");
        }
    }

    return textContent;
}

module.exports = { getTextContent, getParagraphContent };
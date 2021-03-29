var JSSoup = require('jssoup').default;

const minimumUsefulParagraphLength = 20;

// Wrote this while trying to work with innerText
// function shouldInclude(sentence) {
//     words = sentence.split(' ');
//     if (words.length < 4) {
//         return false;
//     }

//     specialCharPct = 0.0;
//     var count = (sentence.match(/[-!$%^&*()_+|~=`{}\[\]:";'<>?,.\/]/g) || []).length;

//     if (count / sentence.length > 0.1) {
//         return false;
//     }

//     return true;
// }

function getTextContent(rawText) {


    let textContent = rawText.trim();

    // Clean Text Content
    textContent = textContent.replace('\n', '. ');
    textContent = textContent.replace('\t', '');
    textContent = textContent.replace('\r', '');

    // Low number of characters
    if (textContent.length < 100) {
        return "";
    }

    return textContent;
}

module.exports = getTextContent;
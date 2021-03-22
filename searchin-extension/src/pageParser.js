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

function getTextContent(htmlContent) {

    const soup = new JSSoup(htmlContent);

    const paragraphs = soup.findAll(['h1', 'p', 'h2', 'h3', 'h4']);
    let textContent = "";

    for (let i = 0; i < paragraphs.length; i++) {
        let trimmedParagraph = paragraphs[i].text.trim();
        if (trimmedParagraph.length > minimumUsefulParagraphLength) {
            textContent += trimmedParagraph + (trimmedParagraph[trimmedParagraph.length - 1] === "." ? " " : ". ");
        }
    }
    // Low number of characters
    if (textContent.length < 100) {
        return "";
    }

    return textContent;
}

module.exports = getTextContent;
var JSSoup = require('jssoup').default;

const minimumUsefulParagraphLength = 20;

function getTextContent(htmlContent) {

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

module.exports = getTextContent;
const getScores = require('./readabilityScorer.js');
const getTextContent = require('./pageParser.js');
console.log('onConnect');

chrome.runtime.onConnect.addListener((port) => {
    port.onMessage.addListener((msg) => {
        if (msg.function == 'features') {

            const bodyText = new XMLSerializer().serializeToString(document.body);

            const parsedText = getTextContent(bodyText);

            const readabilityScore = getScores(parsedText)

            const searchinScore = readabilityScore.medianGrade;

            port.postMessage({
                'searchinScore': searchinScore,
                'feature2': 'f2',
                'feature3': 'f3'
            });
        }
    });
});


const getScores = require('./readabilityScorer.js');
const getHTML = require('./URLReader.js');
const getTextContent = require('./pageParser.js');

const searchResults = document.getElementsByClassName('g');

function isSearchResult(gElement) {
    // Check is/is not a search result
    if (gElement.querySelectorAll('h3').length > 0) {
        if (gElement.querySelectorAll('h3')[0].innerText === "") {
            // This is not a search result
            return false;
        }
    } else {
        return false;
    }
    return true;
}

function modifyTooltip(gElement) {
    gElement.querySelectorAll('h3')[0].title = 'Searchin\' Tooltip'
}

function getURL(gElement) {
    var webInfo = gElement.querySelectorAll(':scope > div')[0].querySelectorAll(':scope > div')[0];
    var anchors = webInfo.querySelectorAll(':scope > a');
    let link = '';
    if (anchors.length > 0) {
        link = anchors[0].href;
        return link
    }
    return '';
}

function updateSearchResults(gElement, searchinScore) {
    try {
        var webInfo = gElement.querySelectorAll(':scope > div')[0].querySelectorAll(':scope > div')[0];
    } catch (e) {
        console.error(`Couldn't get webInfo for ${gElement}`);
        return;
    }

    console.log(webInfo.innerHTML)
    webInfo.innerHTML = `<span id="searchinScore" style="right: 0;position: absolute; color:#5F6368; padding-top:3px"><i> Grade Level: ${searchinScore}</i></span>` + webInfo.innerHTML;

    // var summary = searchResults[i].querySelectorAll('div')[0].querySelectorAll(':scope > div')[1].querySelectorAll('span')[0];
    // summary.innerHTML = summary.innerHTML + `<span><i> Grade Level: ${readabilityScore}</i></span>`;

    // var summary2 = searchResults[i + 1].querySelectorAll('div')[0].querySelectorAll(':scope > div')[1].querySelectorAll('span')[0];
    // summary2.innerHTML = summary2.innerHTML + `<p><i> Grade Level: ${readabilityScore}</i></p>`;

    // break;
}

for (var i = 0, l = searchResults.length; i < l; i++) {

    if (!isSearchResult(searchResults[i])) {
        continue;
    }

    modifyTooltip(searchResults[i]);

    const searchResultURL = getURL(searchResults[i]);

    // Feature detection
    if (!window.XMLHttpRequest) return;

    // Create new request
    var xhr = new XMLHttpRequest();

    // Setup callback
    xhr.onload = function () {

        const bodyText = new XMLSerializer().serializeToString(this.responseXML.body);

        const parsedText = getTextContent(bodyText);

        const readabilityScore = getScores(parsedText)

        const searchinScore = readabilityScore.medianGrade;

        updateSearchResults(searchResults[this.gElementIdx], searchinScore);
    }

    // Get the HTML
    xhr.open('GET', searchResultURL);
    xhr.gElementIdx = i;
    xhr.responseType = 'document';
    xhr.send();

    // Set up loading spinner
    // Async getReadabilityScore
    // then, call to innerHTML
}
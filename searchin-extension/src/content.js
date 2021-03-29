const getScores = require('./readabilityScorer.js');
const getHTML = require('./URLReader.js');
const leafLogo = require('./LeafLogo');
const getTextContent = require('./pageParser.js');

const searchResults = document.getElementsByClassName('g');

function isSearchResult(gElement) {
    // Check is/is not a search result
    if (gElement.querySelectorAll('h3').length > 0) {
        try {
            if (gElement.querySelectorAll('h3')[0].innerText === "") {
                // This is not a search result
                return false;
            }
        } catch (e) {
            console.log(e);
        }
    } else {
        return false;
    }
    return true;
}

function modifyTooltip(gElement) {
    try {
        gElement.querySelectorAll('h3')[0].title = 'Searchin\' Tooltip'
    } catch (e) {
        console.log(e);
    }
}

function getURL(gElement) {
    var webInfo;
    var anchors;
    var link;
    try {
        if (gElement.querySelectorAll(':scope > div').length > 0) {
            if (gElement.querySelectorAll(':scope > div')[0].querySelectorAll(':scope > div').length > 0) {
                webInfo = gElement.querySelectorAll(':scope > div')[0].querySelectorAll(':scope > div')[0];
                anchors = webInfo.querySelectorAll(':scope > a');
                if (anchors.length > 0) {
                    link = anchors[0].href;
                    return link
                }
            }
        }

        if (gElement.querySelectorAll('g-link').length > 0) {
            if (gElement.querySelectorAll('g-link')[0].querySelectorAll(':scope > a').length > 0) {
                link = gElement.querySelectorAll('g-link')[0].querySelectorAll(':scope > a')[0].href;
                return link
            }
        }

    } catch (e) {
        console.error(e);
        return '';
    }
    return '';
}

function updateSearchResults(gElement, searchinScore) {
    var webInfo;
    var isCarosel = false;
    try {
        if (gElement.querySelectorAll(':scope > div').length > 0) {
            if (gElement.querySelectorAll(':scope > div')[0].querySelectorAll(':scope > div').length > 0) {
                webInfo = gElement.querySelectorAll(':scope > div')[0].querySelectorAll(':scope > div')[0];
            }
        } else {
            if (gElement.querySelectorAll('g-link').length > 0) {
                if (gElement.querySelectorAll('g-link')[0].querySelectorAll(':scope > a').length > 0) {
                    webInfo = gElement.querySelectorAll('g-link')[0];
                    isCarosel = true;
                }
            }
        }

    } catch (e) {
        console.error(`Couldn't get webInfo for ${gElement}`);
        return;
    }
    var lineHeight = window.getComputedStyle(gElement, null).getPropertyValue('line-height').replace("px", "");

    if (searchinScore === -1) {
        const img = `<img src="data:image/png;base64,${leafLogo}" height="${lineHeight}" width="${lineHeight}" alt="Searchin' logo" title="Searchin' could not provide a readability score for this page." />`
        webInfo.innerHTML = `<span id="searchinScore" style="right: ${isCarosel ? "50px" : "0px"};position: absolute; color:#5F6368; padding-top:3px; font-size: small">Grade Level: N/A</span>` + webInfo.innerHTML;
    } else {
        webInfo.innerHTML = `<span id="searchinScore" style="right: ${isCarosel ? "50px" : "0px"};position: absolute; color:#5F6368; font-size: small; padding-top:3px"><i> Grade Level: ${searchinScore}</i></span>` + webInfo.innerHTML;
    }
}

for (var i = 0, l = searchResults.length; i < l; i++) {

    if (!isSearchResult(searchResults[i])) {
        continue;
    }

    modifyTooltip(searchResults[i]);

    let searchResultURL = '';
    try {
        searchResultURL = getURL(searchResults[i]);
    }
    catch (e) {
        console.error(e);
    }

    // Feature detection
    if (!window.XMLHttpRequest) return;

    // Create new request
    var xhr = new XMLHttpRequest();

    // Setup callback
    xhr.onload = function () {
        const parsedText = getTextContent(this.responseXML.body.textContent);

        // Currently, this won't work! We need to extract the innerText from the HTML, but it's currently providing unknown results.
        const readabilityScore = getScores(parsedText)

        const searchinScore = readabilityScore.medianGrade ? readabilityScore.medianGrade : -1;

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
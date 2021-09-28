const getScores = require('./readabilityScorer.js');
const getHTML = require('./URLReader.js');
const leafLogo = require('./LeafLogo');
const { getTextContent, getParagraphContent } = require('./pageParser.js');

// Gets top and left offset of element, used for positioning tooltips
function getOffset(el) {
    const rect = el.getBoundingClientRect();
    return {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY
    };
}

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

function shouldDisplayTooltip(gElement) {
    isResult = isSearchResult(gElement)
    isSubresult = (gElement.classList.length !== 1)

    return isResult && !isSubresult;
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
                anchors = webInfo.querySelectorAll('a');
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

    parentWidth = gElement.parentElement.offsetWidth
    childWidth = gElement.offsetWidth

    // rightOffset = childWidth - parentWidth
    rightOffset = `0px`

    try {
        if (gElement.querySelectorAll(':scope > div').length > 0) {
            if (gElement.querySelectorAll(':scope > div')[0].querySelectorAll(':scope > div').length > 0) {
                webInfo = gElement.querySelectorAll(':scope > div')[0].querySelectorAll(':scope > div')[0];
            }
        } else {
            if (gElement.querySelectorAll('g-link').length > 0) {
                if (gElement.querySelectorAll('g-link')[0].querySelectorAll(':scope > a').length > 0) {
                    webInfo = gElement.querySelectorAll('g-link')[0];
                }
            }
        }

    } catch (e) {
        console.error(`Couldn't get webInfo for ${gElement}`);
        return;
    }

    if (searchinScore === -1) {
        // const img = `<img src="data:image/png;base64,${leafLogo}" height="${lineHeight}" width="${lineHeight}" alt="Searchin' logo" title="Searchin' could not provide a readability score for this page." />`
        webInfo.innerHTML = `<span id="searchinScore" style="right: ${rightOffset};position: absolute; color:#5F6368; padding-top:3px; font-size: small">Grade Level: N/A</span>` + webInfo.innerHTML;
    } else {
        webInfo.innerHTML = `<span id="searchinScore" style="right: ${rightOffset};position: absolute; color:#5F6368; font-size: small; padding-top:3px"><i> Grade Level: ${searchinScore}</i></span>` + webInfo.innerHTML;
    }

    searchinElement = webInfo.querySelector('span')

    if (typeof updateSearchResults.firstOffset == 'undefined') {
        updateSearchResults.firstOffset = getOffset(searchinElement);
    } else {
        gElementLeftOffset = getOffset(searchinElement).left
        if (gElementLeftOffset !== updateSearchResults.firstOffset.left) {
            searchinElement.style.right = `${gElementLeftOffset - updateSearchResults.firstOffset.left}px`
        }
    }

    // If offset does not match, then set offset to first offset

}

const searchResults = document.getElementsByClassName('g');
skipThese = []; // Elements can not be removed from an HTMLCollection returned by searchResults without removing the elements from the DOM

for (var i = 0; i < searchResults.length; i++) {

    if (skipThese.includes(i)) {
        continue;
    }

    // Remove child elements
    for (j = i + 1; j < searchResults.length; j++) {
        if (searchResults[i].contains(searchResults[j])) {
            skipThese.push(j)
        }
    }

    if (!shouldDisplayTooltip(searchResults[i])) {
        continue;
    } else {
        modifyTooltip(searchResults[i]);
    }


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
        const paragraphText = new XMLSerializer().serializeToString(this.responseXML.body);

        // const textContent = getTextContent(this.responseXML.body.outerHTML);
        const paragraphContent = getParagraphContent(paragraphText);

        const searchinScore = getScores(paragraphContent);

        updateSearchResults(searchResults[this.gElementIdx], searchinScore.medianGrade);
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
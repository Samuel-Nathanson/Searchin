document.addEventListener("DOMContentLoaded", function (event) {
    setOnClickActions();
});

function setOnClickActions() {
    document.getElementById('graduateButton').onclick = function (e) {
        downloadFeatures(4);
    };
    document.getElementById('collegeButton').onclick = function (e) {
        downloadFeatures(3);
    };
    document.getElementById('highButton').onclick = function (e) {
        downloadFeatures(2);
    };
    document.getElementById('middleButton').onclick = function (e) {
        downloadFeatures(1);
    };
    document.getElementById('elementaryButton').onclick = function (e) {
        downloadFeatures(0);
    };
}

function downloadFeatures(level) {
    let success = false;
    let url = '';
    let features = {};
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
            // Something went wrong
            alert('Searchin Error (0). Contact snatha11@jh.edu')
        }
        try {
            url = tabs[0].url;
            const port = chrome.tabs.connect(tabs[0].id);
            port.postMessage({ function: 'features' });

            port.onMessage.addListener((response) => {
                if (chrome.runtime.lastError) {
                    // Something went wrong
                    alert('Searchin Issue - #0')
                    // Maybe explain that to the user too?
                } else {
                    features = JSON.parse(JSON.stringify(response));
                    features.url = url;
                    features.level = level;
                    const fileName = `searchin_features_${url.replace(/\W/g, '')}.json`;
                    // Create a blob of the data
                    var fileToSave = new Blob([JSON.stringify(features, null, 2)], {
                        type: 'application/json',
                        name: fileName
                    });

                    // Save the file
                    saveAs(fileToSave, fileName);
                    success = true;
                }
            });
        } catch (e) {
            console.log(e);
            success = false;
        }

    });

    setTimeout(function () {
        if (!success) {
            alert('Sorry, could not extract features. Try reloading this webpage.')
        } else {
            prompt(`Successfully Extracted Webpage Features\n\n${JSON.stringify(features, null, 2)}\n\nNext Webpage:`, "Next Webpage");

            if (localStorage.numLabeled) {
                localStorage.numLabeled = Number(localStorage.numLabeled) + 1
            } else {
                localStorage.numLabeled = Number(1);
            }
        }
    }, 1500);
}
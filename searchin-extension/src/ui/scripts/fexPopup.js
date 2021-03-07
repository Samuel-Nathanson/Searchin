document.addEventListener("DOMContentLoaded", function (event) {
    setOnClickActions();
});

function setOnClickActions() {
    document.getElementById('professionalButton').onclick = function (e) {
        downloadFeatures(5);
    };
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
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
            // Something went wrong
            alert('Searchin Issue - #0')
            // Maybe explain that to the user too?
        }
        try {

            let url = tabs[0].url;
            const port = chrome.tabs.connect(tabs[0].id);
            port.postMessage({ function: 'features' });

            port.onMessage.addListener((response) => {
                if (chrome.runtime.lastError) {
                    // Something went wrong
                    alert('Searchin Issue - #0')
                    // Maybe explain that to the user too?
                } else {
                    var features = JSON.parse(JSON.stringify(response, null, 2));
                    features.url = url;
                    const fileName = `searchin_features_${url.replace(/\W/g, '')}.json`;
                    // Create a blob of the data
                    var fileToSave = new Blob([JSON.stringify(features)], {
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
            if (localStorage.numLabeled) {
                localStorage.numLabeled = Number(localStorage.numLabeled) + 1
            } else {
                localStorage.numLabeled = Number(1);
            }
            if (Number(localStorage.numLabeled) % 5 === 0) {
                document.getElementById('numLabeled').innerHTML = `Congratulations! You've extracted features from ${localStorage.numLabeled} webpages!`;
                document.getElementById('numLabeled').style.visibility = 'visible'

                setTimeout(function () {
                    document.getElementById('numLabeled').innerHTML = '';
                    document.getElementById('numLabeled').style.visibility = 'hidden'
                }, 15000);
            }
        }
    }, 1000);
}
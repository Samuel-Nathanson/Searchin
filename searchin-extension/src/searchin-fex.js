(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const getScores = require('./readabilityScorer.js');
const getTextContent = require('./pageParser.js');

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

},{"./pageParser.js":2,"./readabilityScorer.js":3}],2:[function(require,module,exports){
// nodejs
var JSSoup = require('jssoup').default;

const minimumUsefulParagraphLength = 20;

function getTextContent(htmlContent) {

    //     var data = `
    // <div>
    //   <div class="h1"></div>
    //   <a>hello</a>
    // </div>
    // `

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
},{"jssoup":6}],3:[function(require,module,exports){
var getScores = function (text) {

    /* 
     * To speed the script up, you can set a sampling rate in words. For example, if you set
     * sampleLimit to 1000, only the first 1000 words will be parsed from the input text.
     * Set to 0 to never sample.
     */
    var sampleLimit = 0;

    // Manual rewrite of the textstat Python library (https://github.com/shivam5992/textstat/)

    /* 
     * Regular expression to identify a sentence. No, it's not perfect. 
     * Fails e.g. with abbreviations and similar constructs mid-sentence.
     */
    var sentenceRegex = new RegExp('[.?!]\\s[^a-z]', 'g');

    /*
     * Regular expression to identify a syllable. No, it's not perfect either.
     * It's based on English, so other languages with different vowel / consonant distributions
     * and syllable definitions need a rewrite.
     * Inspired by https://bit.ly/2VK9dz1
     */
    var syllableRegex = new RegExp('[aiouy]+e*|e(?!d$|ly).|[td]ed|le$', 'g');

    // Baseline for FRE - English only
    var freBase = {
        base: 206.835,
        sentenceLength: 1.015,
        syllablesPerWord: 84.6,
        syllableThreshold: 3
    };

    var cache = {};

    var punctuation = ['!', '"', '#', '$', '%', '&', '\'', '(', ')', '*', '+', ',', '-', '.', '/', ':', ';', '<', '=', '>', '?', '@', '[', ']', '^', '_', '`', '{', '|', '}', '~'];

    var legacyRound = function (number, precision) {
        var k = Math.pow(10, (precision || 0));
        return Math.floor((number * k) + 0.5 * Math.sign(number)) / k;
    };

    var charCount = function (text) {
        if (cache.charCount) return cache.charCount;
        if (sampleLimit > 0) text = text.split(' ').slice(0, sampleLimit).join(' ');
        text = text.replace(/\s/g, '');
        return cache.charCount = text.length;
    };

    var removePunctuation = function (text) {
        return text.split('').filter(function (c) {
            return punctuation.indexOf(c) === -1;
        }).join('');
    };

    var letterCount = function (text) {
        if (sampleLimit > 0) text = text.split(' ').slice(0, sampleLimit).join(' ');
        text = text.replace(/\s/g, '');
        return removePunctuation(text).length;
    };

    var lexiconCount = function (text, useCache, ignoreSample) {
        if (useCache && cache.lexiconCount) return cache.lexiconCount;
        if (ignoreSample !== true && sampleLimit > 0) text = text.split(' ').slice(0, sampleLimit).join(' ');
        text = removePunctuation(text);
        var lexicon = text.split(' ').length;
        return useCache ? cache.lexiconCount = lexicon : lexicon;
    };

    var getWords = function (text, useCache) {
        if (useCache && cache.getWords) return cache.getWords;
        if (sampleLimit > 0) text = text.split(' ').slice(0, sampleLimit).join(' ');
        text = text.toLowerCase();
        text = removePunctuation(text);
        var words = text.split(' ');
        return useCache ? cache.getWords = words : words;
    }

    var syllableCount = function (text, useCache) {
        if (useCache && cache.syllableCount) return cache.syllableCount;
        var count = 0;
        var syllables = getWords(text, useCache).reduce(function (a, c) {
            return a + (c.match(syllableRegex) || [1]).length;
        }, 0);
        return useCache ? cache.syllableCount = syllables : syllables;
    };

    var polySyllableCount = function (text, useCache) {
        var count = 0;
        getWords(text, useCache).forEach(function (word) {
            var syllables = syllableCount(word);
            if (syllables >= 3) {
                count += 1;
            }
        });
        return count;
    };

    var sentenceCount = function (text, useCache) {
        if (useCache && cache.sentenceCount) return cache.sentenceCount;
        if (sampleLimit > 0) text = text.split(' ').slice(0, sampleLimit).join(' ');
        var ignoreCount = 0;
        var sentences = text.split(sentenceRegex);
        sentences.forEach(function (s) {
            if (lexiconCount(s, true, false) <= 2) { ignoreCount += 1; }
        });
        var count = Math.max(1, sentences.length - ignoreCount);
        return useCache ? cache.sentenceCount = count : count;
    };

    var avgSentenceLength = function (text) {
        var avg = lexiconCount(text, true) / sentenceCount(text, true);
        return legacyRound(avg, 2);
    };

    var avgSyllablesPerWord = function (text) {
        var avg = syllableCount(text, true) / lexiconCount(text, true);
        return legacyRound(avg, 2);
    };

    var avgCharactersPerWord = function (text) {
        var avg = charCount(text) / lexiconCount(text, true);
        return legacyRound(avg, 2);
    };

    var avgLettersPerWord = function (text) {
        var avg = letterCount(text, true) / lexiconCount(text, true);
        return legacyRound(avg, 2);
    };

    var avgSentencesPerWord = function (text) {
        var avg = sentenceCount(text, true) / lexiconCount(text, true);
        return legacyRound(avg, 2);
    };

    var fleschReadingEase = function (text) {
        var sentenceLength = avgSentenceLength(text);
        var syllablesPerWord = avgSyllablesPerWord(text);
        return legacyRound(
            freBase.base -
            freBase.sentenceLength * sentenceLength -
            freBase.syllablesPerWord * syllablesPerWord,
            2
        );
    };

    var fleschKincaidGrade = function (text) {
        var sentenceLength = avgSentenceLength(text);
        var syllablesPerWord = avgSyllablesPerWord(text);
        return legacyRound(
            0.39 * sentenceLength +
            11.8 * syllablesPerWord -
            15.59,
            2
        );
    };

    var smogIndex = function (text) {
        var sentences = sentenceCount(text, true);
        if (sentences >= 3) {
            var polySyllables = polySyllableCount(text, true);
            var smog = 1.043 * (Math.pow(polySyllables * (30 / sentences), 0.5)) + 3.1291;
            return legacyRound(smog, 2);
        }
        return 0.0;
    };

    var colemanLiauIndex = function (text) {
        var letters = legacyRound(avgLettersPerWord(text) * 100, 2);
        var sentences = legacyRound(avgSentencesPerWord(text) * 100, 2);
        var coleman = 0.0588 * letters - 0.296 * sentences - 15.8;
        return legacyRound(coleman, 2);
    };

    var automatedReadabilityIndex = function (text) {
        var chars = charCount(text);
        var words = lexiconCount(text, true);
        var sentences = sentenceCount(text, true);
        var a = chars / words;
        var b = words / sentences;
        var readability = (
            4.71 * legacyRound(a, 2) +
            0.5 * legacyRound(b, 2) -
            21.43
        );
        return legacyRound(readability, 2);
    };

    var linsearWriteFormula = function (text) {
        var easyWord = 0;
        var difficultWord = 0;
        var roughTextFirst100 = text.split(' ').slice(0, 100).join(' ');
        var plainTextListFirst100 = getWords(text, true).slice(0, 100);
        plainTextListFirst100.forEach(function (word) {
            if (syllableCount(word) < 3) {
                easyWord += 1;
            } else {
                difficultWord += 1;
            }
        });
        var number = (easyWord + difficultWord * 3) / sentenceCount(roughTextFirst100);
        if (number <= 20) {
            number -= 2;
        }
        return legacyRound(number / 2, 2);
    };

    var rix = function (text) {
        var words = getWords(text, true);
        var longCount = words.filter(function (word) {
            return word.length > 6;
        }).length;
        var sentencesCount = sentenceCount(text, true);
        return legacyRound(longCount / sentencesCount, 2);
    };

    var readingTime = function (text) {
        var wordsPerSecond = 4.17;
        // To get full reading time, ignore cache and sample
        return legacyRound(lexiconCount(text, false, true) / wordsPerSecond, 2);
    };

    // Build textStandard
    var grade = [];
    var obj = {};
    (function () {

        // FRE
        var fre = obj.fleschReadingEase = fleschReadingEase(text);
        if (fre < 100 && fre >= 90) {
            grade.push(5);
        } else if (fre < 90 && fre >= 80) {
            grade.push(6);
        } else if (fre < 80 && fre >= 70) {
            grade.push(7);
        } else if (fre < 70 && fre >= 60) {
            grade.push(8);
            grade.push(9);
        } else if (fre < 60 && fre >= 50) {
            grade.push(10);
        } else if (fre < 50 && fre >= 40) {
            grade.push(11);
        } else if (fre < 40 && fre >= 30) {
            grade.push(12);
        } else {
            grade.push(13);
        }

        // FK
        var fk = obj.fleschKincaidGrade = fleschKincaidGrade(text);
        grade.push(Math.floor(fk));
        grade.push(Math.ceil(fk));

        // SMOG
        var smog = obj.smogIndex = smogIndex(text);
        grade.push(Math.floor(smog));
        grade.push(Math.ceil(smog));

        // CL
        var cl = obj.colemanLiauIndex = colemanLiauIndex(text);
        grade.push(Math.floor(cl));
        grade.push(Math.ceil(cl));

        // ARI
        var ari = obj.automatedReadabilityIndex = automatedReadabilityIndex(text);
        grade.push(Math.floor(ari));
        grade.push(Math.ceil(ari));

        // LWF
        var lwf = obj.linsearWriteFormula = linsearWriteFormula(text);
        grade.push(Math.floor(lwf));
        grade.push(Math.ceil(lwf));

        // RIX
        var rixScore = obj.rix = rix(text);
        if (rixScore >= 7.2) {
            grade.push(13);
        } else if (rixScore < 7.2 && rixScore >= 6.2) {
            grade.push(12);
        } else if (rixScore < 6.2 && rixScore >= 5.3) {
            grade.push(11);
        } else if (rixScore < 5.3 && rixScore >= 4.5) {
            grade.push(10);
        } else if (rixScore < 4.5 && rixScore >= 3.7) {
            grade.push(9);
        } else if (rixScore < 3.7 && rixScore >= 3.0) {
            grade.push(8);
        } else if (rixScore < 3.0 && rixScore >= 2.4) {
            grade.push(7);
        } else if (rixScore < 2.4 && rixScore >= 1.8) {
            grade.push(6);
        } else if (rixScore < 1.8 && rixScore >= 1.3) {
            grade.push(5);
        } else if (rixScore < 1.3 && rixScore >= 0.8) {
            grade.push(4);
        } else if (rixScore < 0.8 && rixScore >= 0.5) {
            grade.push(3);
        } else if (rixScore < 0.5 && rixScore >= 0.2) {
            grade.push(2);
        } else {
            grade.push(1);
        }

        // Find median grade
        grade = grade.sort(function (a, b) { return a - b; });
        var midPoint = Math.floor(grade.length / 2);
        var medianGrade = legacyRound(
            grade.length % 2 ?
                grade[midPoint] :
                (grade[midPoint - 1] + grade[midPoint]) / 2.0
        );
        obj.medianGrade = medianGrade;

    })();

    obj.readingTime = readingTime(text);

    return obj;
};

module.exports = getScores;
},{}],4:[function(require,module,exports){
(function (__filename,__dirname){(function (){
/***********************************************
Copyright 2010, 2011, Chris Winberry <chris@winberry.net>. All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
***********************************************/
/* v1.7.6 */

(function () {

function runningInNode () {
	return(
		(typeof require) == "function"
		&&
		(typeof exports) == "object"
		&&
		(typeof module) == "object"
		&&
		(typeof __filename) == "string"
		&&
		(typeof __dirname) == "string"
		);
}

if (!runningInNode()) {
	if (!this.Tautologistics)
		this.Tautologistics = {};
	else if (this.Tautologistics.NodeHtmlParser)
		return; //NodeHtmlParser already defined!
	this.Tautologistics.NodeHtmlParser = {};
	exports = this.Tautologistics.NodeHtmlParser;
}

//Types of elements found in the DOM
var ElementType = {
	  Text: "text" //Plain text
	, Directive: "directive" //Special tag <!...>
	, Comment: "comment" //Special tag <!--...-->
	, Script: "script" //Special tag <script>...</script>
	, Style: "style" //Special tag <style>...</style>
	, Tag: "tag" //Any tag that isn't special
}

function Parser (handler, options) {
	this._options = options ? options : { };
	if (this._options.includeLocation == undefined) {
		this._options.includeLocation = false; //Do not track element position in document by default
	}

	this.validateHandler(handler);
	this._handler = handler;
	this.reset();
}

	//**"Static"**//
	//Regular expressions used for cleaning up and parsing (stateless)
	Parser._reTrim = /(^\s+|\s+$)/g; //Trim leading/trailing whitespace
	Parser._reTrimComment = /(^\!--|--$)/g; //Remove comment tag markup from comment contents
	Parser._reWhitespace = /\s/g; //Used to find any whitespace to split on
	Parser._reTagName = /^\s*(\/?)\s*([^\s\/]+)/; //Used to find the tag name for an element

	//Regular expressions used for parsing (stateful)
	Parser._reAttrib = //Find attributes in a tag
		/([^=<>\"\'\s]+)\s*=\s*"([^"]*)"|([^=<>\"\'\s]+)\s*=\s*'([^']*)'|([^=<>\"\'\s]+)\s*=\s*([^'"\s]+)|([^=<>\"\'\s\/]+)/g;
	Parser._reTags = /[\<\>]/g; //Find tag markers

	//**Public**//
	//Methods//
	//Parses a complete HTML and pushes it to the handler
	Parser.prototype.parseComplete = function Parser$parseComplete (data) {
		this.reset();
		this.parseChunk(data);
		this.done();
	}

	//Parses a piece of an HTML document
	Parser.prototype.parseChunk = function Parser$parseChunk (data) {
		if (this._done)
			this.handleError(new Error("Attempted to parse chunk after parsing already done"));
		this._buffer += data; //FIXME: this can be a bottleneck
		this.parseTags();
	}

	//Tells the parser that the HTML being parsed is complete
	Parser.prototype.done = function Parser$done () {
		if (this._done)
			return;
		this._done = true;
	
		//Push any unparsed text into a final element in the element list
		if (this._buffer.length) {
			var rawData = this._buffer;
			this._buffer = "";
			var element = {
				  raw: rawData
				, data: (this._parseState == ElementType.Text) ? rawData : rawData.replace(Parser._reTrim, "")
				, type: this._parseState
				};
			if (this._parseState == ElementType.Tag || this._parseState == ElementType.Script || this._parseState == ElementType.Style)
				element.name = this.parseTagName(element.data);
			this.parseAttribs(element);
			this._elements.push(element);
		}
	
		this.writeHandler();
		this._handler.done();
	}

	//Resets the parser to a blank state, ready to parse a new HTML document
	Parser.prototype.reset = function Parser$reset () {
		this._buffer = "";
		this._done = false;
		this._elements = [];
		this._elementsCurrent = 0;
		this._current = 0;
		this._next = 0;
		this._location = {
			  row: 0
			, col: 0
			, charOffset: 0
			, inBuffer: 0
		};
		this._parseState = ElementType.Text;
		this._prevTagSep = '';
		this._tagStack = [];
		this._handler.reset();
	}
	
	//**Private**//
	//Properties//
	Parser.prototype._options = null; //Parser options for how to behave
	Parser.prototype._handler = null; //Handler for parsed elements
	Parser.prototype._buffer = null; //Buffer of unparsed data
	Parser.prototype._done = false; //Flag indicating whether parsing is done
	Parser.prototype._elements =  null; //Array of parsed elements
	Parser.prototype._elementsCurrent = 0; //Pointer to last element in _elements that has been processed
	Parser.prototype._current = 0; //Position in data that has already been parsed
	Parser.prototype._next = 0; //Position in data of the next tag marker (<>)
	Parser.prototype._location = null; //Position tracking for elements in a stream
	Parser.prototype._parseState = ElementType.Text; //Current type of element being parsed
	Parser.prototype._prevTagSep = ''; //Previous tag marker found
	//Stack of element types previously encountered; keeps track of when
	//parsing occurs inside a script/comment/style tag
	Parser.prototype._tagStack = null;

	//Methods//
	//Takes an array of elements and parses any found attributes
	Parser.prototype.parseTagAttribs = function Parser$parseTagAttribs (elements) {
		var idxEnd = elements.length;
		var idx = 0;
	
		while (idx < idxEnd) {
			var element = elements[idx++];
			if (element.type == ElementType.Tag || element.type == ElementType.Script || element.type == ElementType.style)
				this.parseAttribs(element);
		}
	
		return(elements);
	}

	//Takes an element and adds an "attribs" property for any element attributes found 
	Parser.prototype.parseAttribs = function Parser$parseAttribs (element) {
		//Only parse attributes for tags
		if (element.type != ElementType.Script && element.type != ElementType.Style && element.type != ElementType.Tag)
			return;
	
		var tagName = element.data.split(Parser._reWhitespace, 1)[0];
		var attribRaw = element.data.substring(tagName.length);
		if (attribRaw.length < 1)
			return;
	
		var match;
		Parser._reAttrib.lastIndex = 0;
		while (match = Parser._reAttrib.exec(attribRaw)) {
			if (element.attribs == undefined)
				element.attribs = {};
	
			if (typeof match[1] == "string" && match[1].length) {
				element.attribs[match[1]] = match[2];
			} else if (typeof match[3] == "string" && match[3].length) {
				element.attribs[match[3].toString()] = match[4].toString();
			} else if (typeof match[5] == "string" && match[5].length) {
				element.attribs[match[5]] = match[6];
			} else if (typeof match[7] == "string" && match[7].length) {
				element.attribs[match[7]] = match[7];
			}
		}
	}

	//Extracts the base tag name from the data value of an element
	Parser.prototype.parseTagName = function Parser$parseTagName (data) {
		if (data == null || data == "")
			return("");
		var match = Parser._reTagName.exec(data);
		if (!match)
			return("");
		return((match[1] ? "/" : "") + match[2]);
	}

	//Parses through HTML text and returns an array of found elements
	//I admit, this function is rather large but splitting up had an noticeable impact on speed
	Parser.prototype.parseTags = function Parser$parseTags () {
		var bufferEnd = this._buffer.length - 1;
		while (Parser._reTags.test(this._buffer)) {
			this._next = Parser._reTags.lastIndex - 1;
			var tagSep = this._buffer.charAt(this._next); //The currently found tag marker
			var rawData = this._buffer.substring(this._current, this._next); //The next chunk of data to parse
	
			//A new element to eventually be appended to the element list
			var element = {
				  raw: rawData
				, data: (this._parseState == ElementType.Text) ? rawData : rawData.replace(Parser._reTrim, "")
				, type: this._parseState
			};
	
			var elementName = this.parseTagName(element.data);
	
			//This section inspects the current tag stack and modifies the current
			//element if we're actually parsing a special area (script/comment/style tag)
			if (this._tagStack.length) { //We're parsing inside a script/comment/style tag
				if (this._tagStack[this._tagStack.length - 1] == ElementType.Script) { //We're currently in a script tag
					if (elementName.toLowerCase() == "/script") //Actually, we're no longer in a script tag, so pop it off the stack
						this._tagStack.pop();
					else { //Not a closing script tag
						if (element.raw.indexOf("!--") != 0) { //Make sure we're not in a comment
							//All data from here to script close is now a text element
							element.type = ElementType.Text;
							//If the previous element is text, append the current text to it
							if (this._elements.length && this._elements[this._elements.length - 1].type == ElementType.Text) {
								var prevElement = this._elements[this._elements.length - 1];
								prevElement.raw = prevElement.data = prevElement.raw + this._prevTagSep + element.raw;
								element.raw = element.data = ""; //This causes the current element to not be added to the element list
							}
						}
					}
				}
				else if (this._tagStack[this._tagStack.length - 1] == ElementType.Style) { //We're currently in a style tag
					if (elementName.toLowerCase() == "/style") //Actually, we're no longer in a style tag, so pop it off the stack
						this._tagStack.pop();
					else {
						if (element.raw.indexOf("!--") != 0) { //Make sure we're not in a comment
							//All data from here to style close is now a text element
							element.type = ElementType.Text;
							//If the previous element is text, append the current text to it
							if (this._elements.length && this._elements[this._elements.length - 1].type == ElementType.Text) {
								var prevElement = this._elements[this._elements.length - 1];
								if (element.raw != "") {
									prevElement.raw = prevElement.data = prevElement.raw + this._prevTagSep + element.raw;
									element.raw = element.data = ""; //This causes the current element to not be added to the element list
								} else { //Element is empty, so just append the last tag marker found
									prevElement.raw = prevElement.data = prevElement.raw + this._prevTagSep;
								}
							} else { //The previous element was not text
								if (element.raw != "") {
									element.raw = element.data = element.raw;
								}
							}
						}
					}
				}
				else if (this._tagStack[this._tagStack.length - 1] == ElementType.Comment) { //We're currently in a comment tag
					var rawLen = element.raw.length;
					if (element.raw.charAt(rawLen - 2) == "-" && element.raw.charAt(rawLen - 1) == "-" && tagSep == ">") {
						//Actually, we're no longer in a style tag, so pop it off the stack
						this._tagStack.pop();
						//If the previous element is a comment, append the current text to it
						if (this._elements.length && this._elements[this._elements.length - 1].type == ElementType.Comment) {
							var prevElement = this._elements[this._elements.length - 1];
							prevElement.raw = prevElement.data = (prevElement.raw + element.raw).replace(Parser._reTrimComment, "");
							element.raw = element.data = ""; //This causes the current element to not be added to the element list
							element.type = ElementType.Text;
						}
						else //Previous element not a comment
							element.type = ElementType.Comment; //Change the current element's type to a comment
					}
					else { //Still in a comment tag
						element.type = ElementType.Comment;
						//If the previous element is a comment, append the current text to it
						if (this._elements.length && this._elements[this._elements.length - 1].type == ElementType.Comment) {
							var prevElement = this._elements[this._elements.length - 1];
							prevElement.raw = prevElement.data = prevElement.raw + element.raw + tagSep;
							element.raw = element.data = ""; //This causes the current element to not be added to the element list
							element.type = ElementType.Text;
						}
						else
							element.raw = element.data = element.raw + tagSep;
					}
				}
			}
	
			//Processing of non-special tags
			if (element.type == ElementType.Tag) {
				element.name = elementName;
				var elementNameCI = elementName.toLowerCase();
				
				if (element.raw.indexOf("!--") == 0) { //This tag is really comment
					element.type = ElementType.Comment;
					delete element["name"];
					var rawLen = element.raw.length;
					//Check if the comment is terminated in the current element
					if (element.raw.charAt(rawLen - 1) == "-" && element.raw.charAt(rawLen - 2) == "-" && tagSep == ">")
						element.raw = element.data = element.raw.replace(Parser._reTrimComment, "");
					else { //It's not so push the comment onto the tag stack
						element.raw += tagSep;
						this._tagStack.push(ElementType.Comment);
					}
				}
				else if (element.raw.indexOf("!") == 0 || element.raw.indexOf("?") == 0) {
					element.type = ElementType.Directive;
					//TODO: what about CDATA?
				}
				else if (elementNameCI == "script") {
					element.type = ElementType.Script;
					//Special tag, push onto the tag stack if not terminated
					if (element.data.charAt(element.data.length - 1) != "/")
						this._tagStack.push(ElementType.Script);
				}
				else if (elementNameCI == "/script")
					element.type = ElementType.Script;
				else if (elementNameCI == "style") {
					element.type = ElementType.Style;
					//Special tag, push onto the tag stack if not terminated
					if (element.data.charAt(element.data.length - 1) != "/")
						this._tagStack.push(ElementType.Style);
				}
				else if (elementNameCI == "/style")
					element.type = ElementType.Style;
				if (element.name && element.name.charAt(0) == "/")
					element.data = element.name;
			}
	
			//Add all tags and non-empty text elements to the element list
			if (element.raw != "" || element.type != ElementType.Text) {
				if (this._options.includeLocation && !element.location) {
					element.location = this.getLocation(element.type == ElementType.Tag);
				}
				this.parseAttribs(element);
				this._elements.push(element);
				//If tag self-terminates, add an explicit, separate closing tag
				if (
					element.type != ElementType.Text
					&&
					element.type != ElementType.Comment
					&&
					element.type != ElementType.Directive
					&&
					element.data.charAt(element.data.length - 1) == "/"
					)
					this._elements.push({
						  raw: "/" + element.name
						, data: "/" + element.name
						, name: "/" + element.name
						, type: element.type
					});
			}
			this._parseState = (tagSep == "<") ? ElementType.Tag : ElementType.Text;
			this._current = this._next + 1;
			this._prevTagSep = tagSep;
		}

		if (this._options.includeLocation) {
			this.getLocation();
			this._location.row += this._location.inBuffer;
			this._location.inBuffer = 0;
			this._location.charOffset = 0;
		}
		this._buffer = (this._current <= bufferEnd) ? this._buffer.substring(this._current) : "";
		this._current = 0;
	
		this.writeHandler();
	}

	Parser.prototype.getLocation = function Parser$getLocation (startTag) {
		var c,
			l = this._location,
			end = this._current - (startTag ? 1 : 0),
			chunk = startTag && l.charOffset == 0 && this._current == 0;
		
		for (; l.charOffset < end; l.charOffset++) {
			c = this._buffer.charAt(l.charOffset);
			if (c == '\n') {
				l.inBuffer++;
				l.col = 0;
			} else if (c != '\r') {
				l.col++;
			}
		}
		return {
			  line: l.row + l.inBuffer + 1
			, col: l.col + (chunk ? 0: 1)
		};
	}

	//Checks the handler to make it is an object with the right "interface"
	Parser.prototype.validateHandler = function Parser$validateHandler (handler) {
		if ((typeof handler) != "object")
			throw new Error("Handler is not an object");
		if ((typeof handler.reset) != "function")
			throw new Error("Handler method 'reset' is invalid");
		if ((typeof handler.done) != "function")
			throw new Error("Handler method 'done' is invalid");
		if ((typeof handler.writeTag) != "function")
			throw new Error("Handler method 'writeTag' is invalid");
		if ((typeof handler.writeText) != "function")
			throw new Error("Handler method 'writeText' is invalid");
		if ((typeof handler.writeComment) != "function")
			throw new Error("Handler method 'writeComment' is invalid");
		if ((typeof handler.writeDirective) != "function")
			throw new Error("Handler method 'writeDirective' is invalid");
	}

	//Writes parsed elements out to the handler
	Parser.prototype.writeHandler = function Parser$writeHandler (forceFlush) {
		forceFlush = !!forceFlush;
		if (this._tagStack.length && !forceFlush)
			return;
		while (this._elements.length) {
			var element = this._elements.shift();
			switch (element.type) {
				case ElementType.Comment:
					this._handler.writeComment(element);
					break;
				case ElementType.Directive:
					this._handler.writeDirective(element);
					break;
				case ElementType.Text:
					this._handler.writeText(element);
					break;
				default:
					this._handler.writeTag(element);
					break;
			}
		}
	}

	Parser.prototype.handleError = function Parser$handleError (error) {
		if ((typeof this._handler.error) == "function")
			this._handler.error(error);
		else
			throw error;
	}

//TODO: make this a trully streamable handler
function RssHandler (callback) {
	RssHandler.super_.call(this, callback, { ignoreWhitespace: true, verbose: false, enforceEmptyTags: false });
}
inherits(RssHandler, DefaultHandler);

	RssHandler.prototype.done = function RssHandler$done () {
		var feed = { };
		var feedRoot;

		var found = DomUtils.getElementsByTagName(function (value) { return(value == "rss" || value == "feed"); }, this.dom, false);
		if (found.length) {
			feedRoot = found[0];
		}
		if (feedRoot) {
			if (feedRoot.name == "rss") {
				feed.type = "rss";
				feedRoot = feedRoot.children[0]; //<channel/>
				feed.id = "";
				try {
					feed.title = DomUtils.getElementsByTagName("title", feedRoot.children, false)[0].children[0].data;
				} catch (ex) { }
				try {
					feed.link = DomUtils.getElementsByTagName("link", feedRoot.children, false)[0].children[0].data;
				} catch (ex) { }
				try {
					feed.description = DomUtils.getElementsByTagName("description", feedRoot.children, false)[0].children[0].data;
				} catch (ex) { }
				try {
					feed.updated = new Date(DomUtils.getElementsByTagName("lastBuildDate", feedRoot.children, false)[0].children[0].data);
				} catch (ex) { }
				try {
					feed.author = DomUtils.getElementsByTagName("managingEditor", feedRoot.children, false)[0].children[0].data;
				} catch (ex) { }
				feed.items = [];
				DomUtils.getElementsByTagName("item", feedRoot.children).forEach(function (item, index, list) {
					var entry = {};
					try {
						entry.id = DomUtils.getElementsByTagName("guid", item.children, false)[0].children[0].data;
					} catch (ex) { }
					try {
						entry.title = DomUtils.getElementsByTagName("title", item.children, false)[0].children[0].data;
					} catch (ex) { }
					try {
						entry.link = DomUtils.getElementsByTagName("link", item.children, false)[0].children[0].data;
					} catch (ex) { }
					try {
						entry.description = DomUtils.getElementsByTagName("description", item.children, false)[0].children[0].data;
					} catch (ex) { }
					try {
						entry.pubDate = new Date(DomUtils.getElementsByTagName("pubDate", item.children, false)[0].children[0].data);
					} catch (ex) { }
					feed.items.push(entry);
				});
			} else {
				feed.type = "atom";
				try {
					feed.id = DomUtils.getElementsByTagName("id", feedRoot.children, false)[0].children[0].data;
				} catch (ex) { }
				try {
					feed.title = DomUtils.getElementsByTagName("title", feedRoot.children, false)[0].children[0].data;
				} catch (ex) { }
				try {
					feed.link = DomUtils.getElementsByTagName("link", feedRoot.children, false)[0].attribs.href;
				} catch (ex) { }
				try {
					feed.description = DomUtils.getElementsByTagName("subtitle", feedRoot.children, false)[0].children[0].data;
				} catch (ex) { }
				try {
					feed.updated = new Date(DomUtils.getElementsByTagName("updated", feedRoot.children, false)[0].children[0].data);
				} catch (ex) { }
				try {
					feed.author = DomUtils.getElementsByTagName("email", feedRoot.children, true)[0].children[0].data;
				} catch (ex) { }
				feed.items = [];
				DomUtils.getElementsByTagName("entry", feedRoot.children).forEach(function (item, index, list) {
					var entry = {};
					try {
						entry.id = DomUtils.getElementsByTagName("id", item.children, false)[0].children[0].data;
					} catch (ex) { }
					try {
						entry.title = DomUtils.getElementsByTagName("title", item.children, false)[0].children[0].data;
					} catch (ex) { }
					try {
						entry.link = DomUtils.getElementsByTagName("link", item.children, false)[0].attribs.href;
					} catch (ex) { }
					try {
						entry.description = DomUtils.getElementsByTagName("summary", item.children, false)[0].children[0].data;
					} catch (ex) { }
					try {
						entry.pubDate = new Date(DomUtils.getElementsByTagName("updated", item.children, false)[0].children[0].data);
					} catch (ex) { }
					feed.items.push(entry);
				});
			}

			this.dom = feed;
		}
		RssHandler.super_.prototype.done.call(this);
	}

///////////////////////////////////////////////////

function DefaultHandler (callback, options) {
	this.reset();
	this._options = options ? options : { };
	if (this._options.ignoreWhitespace == undefined)
		this._options.ignoreWhitespace = false; //Keep whitespace-only text nodes
	if (this._options.verbose == undefined)
		this._options.verbose = true; //Keep data property for tags and raw property for all
	if (this._options.enforceEmptyTags == undefined)
		this._options.enforceEmptyTags = true; //Don't allow children for HTML tags defined as empty in spec
	if ((typeof callback) == "function")
		this._callback = callback;
}

	//**"Static"**//
	//HTML Tags that shouldn't contain child nodes
	DefaultHandler._emptyTags = {
		  area: 1
		, base: 1
		, basefont: 1
		, br: 1
		, col: 1
		, frame: 1
		, hr: 1
		, img: 1
		, input: 1
		, isindex: 1
		, link: 1
		, meta: 1
		, param: 1
		, embed: 1
	}
	//Regex to detect whitespace only text nodes
	DefaultHandler.reWhitespace = /^\s*$/;

	//**Public**//
	//Properties//
	DefaultHandler.prototype.dom = null; //The hierarchical object containing the parsed HTML
	//Methods//
	//Resets the handler back to starting state
	DefaultHandler.prototype.reset = function DefaultHandler$reset() {
		this.dom = [];
		this._done = false;
		this._tagStack = [];
		this._tagStack.last = function DefaultHandler$_tagStack$last () {
			return(this.length ? this[this.length - 1] : null);
		}
	}
	//Signals the handler that parsing is done
	DefaultHandler.prototype.done = function DefaultHandler$done () {
		this._done = true;
		this.handleCallback(null);
	}
	DefaultHandler.prototype.writeTag = function DefaultHandler$writeTag (element) {
		this.handleElement(element);
	} 
	DefaultHandler.prototype.writeText = function DefaultHandler$writeText (element) {
		if (this._options.ignoreWhitespace)
			if (DefaultHandler.reWhitespace.test(element.data))
				return;
		this.handleElement(element);
	} 
	DefaultHandler.prototype.writeComment = function DefaultHandler$writeComment (element) {
		this.handleElement(element);
	} 
	DefaultHandler.prototype.writeDirective = function DefaultHandler$writeDirective (element) {
		this.handleElement(element);
	}
	DefaultHandler.prototype.error = function DefaultHandler$error (error) {
		this.handleCallback(error);
	}

	//**Private**//
	//Properties//
	DefaultHandler.prototype._options = null; //Handler options for how to behave
	DefaultHandler.prototype._callback = null; //Callback to respond to when parsing done
	DefaultHandler.prototype._done = false; //Flag indicating whether handler has been notified of parsing completed
	DefaultHandler.prototype._tagStack = null; //List of parents to the currently element being processed
	//Methods//
	DefaultHandler.prototype.handleCallback = function DefaultHandler$handleCallback (error) {
			if ((typeof this._callback) != "function")
				if (error)
					throw error;
				else
					return;
			this._callback(error, this.dom);
	}
	
	DefaultHandler.prototype.isEmptyTag = function(element) {
		var name = element.name.toLowerCase();
		if (name.charAt(0) == '/') {
			name = name.substring(1);
		}
		return this._options.enforceEmptyTags && !!DefaultHandler._emptyTags[name];
	};
	
	DefaultHandler.prototype.handleElement = function DefaultHandler$handleElement (element) {
		if (this._done)
			this.handleCallback(new Error("Writing to the handler after done() called is not allowed without a reset()"));
		if (!this._options.verbose) {
//			element.raw = null; //FIXME: Not clean
			//FIXME: Serious performance problem using delete
			delete element.raw;
			if (element.type == "tag" || element.type == "script" || element.type == "style")
				delete element.data;
		}
		if (!this._tagStack.last()) { //There are no parent elements
			//If the element can be a container, add it to the tag stack and the top level list
			if (element.type != ElementType.Text && element.type != ElementType.Comment && element.type != ElementType.Directive) {
				if (element.name.charAt(0) != "/") { //Ignore closing tags that obviously don't have an opening tag
					this.dom.push(element);
					if (!this.isEmptyTag(element)) { //Don't add tags to the tag stack that can't have children
						this._tagStack.push(element);
					}
				}
			}
			else //Otherwise just add to the top level list
				this.dom.push(element);
		}
		else { //There are parent elements
			//If the element can be a container, add it as a child of the element
			//on top of the tag stack and then add it to the tag stack
			if (element.type != ElementType.Text && element.type != ElementType.Comment && element.type != ElementType.Directive) {
				if (element.name.charAt(0) == "/") {
					//This is a closing tag, scan the tagStack to find the matching opening tag
					//and pop the stack up to the opening tag's parent
					var baseName = element.name.substring(1);
					if (!this.isEmptyTag(element)) {
						var pos = this._tagStack.length - 1;
						while (pos > -1 && this._tagStack[pos--].name != baseName) { }
						if (pos > -1 || this._tagStack[0].name == baseName)
							while (pos < this._tagStack.length - 1)
								this._tagStack.pop();
					}
				}
				else { //This is not a closing tag
					if (!this._tagStack.last().children)
						this._tagStack.last().children = [];
					this._tagStack.last().children.push(element);
					if (!this.isEmptyTag(element)) //Don't add tags to the tag stack that can't have children
						this._tagStack.push(element);
				}
			}
			else { //This is not a container element
				if (!this._tagStack.last().children)
					this._tagStack.last().children = [];
				this._tagStack.last().children.push(element);
			}
		}
	}

	var DomUtils = {
		  testElement: function DomUtils$testElement (options, element) {
			if (!element) {
				return false;
			}
	
			for (var key in options) {
				if (key == "tag_name") {
					if (element.type != "tag" && element.type != "script" && element.type != "style") {
						return false;
					}
					if (!options["tag_name"](element.name)) {
						return false;
					}
				} else if (key == "tag_type") {
					if (!options["tag_type"](element.type)) {
						return false;
					}
				} else if (key == "tag_contains") {
					if (element.type != "text" && element.type != "comment" && element.type != "directive") {
						return false;
					}
					if (!options["tag_contains"](element.data)) {
						return false;
					}
				} else {
					if (!element.attribs || !options[key](element.attribs[key])) {
						return false;
					}
				}
			}
		
			return true;
		}
	
		, getElements: function DomUtils$getElements (options, currentElement, recurse, limit) {
			recurse = (recurse === undefined || recurse === null) || !!recurse;
			limit = isNaN(parseInt(limit)) ? -1 : parseInt(limit);

			if (!currentElement) {
				return([]);
			}
	
			var found = [];
			var elementList;

			function getTest (checkVal) {
				return(function (value) { return(value == checkVal); });
			}
			for (var key in options) {
				if ((typeof options[key]) != "function") {
					options[key] = getTest(options[key]);
				}
			}
	
			if (DomUtils.testElement(options, currentElement)) {
				found.push(currentElement);
			}

			if (limit >= 0 && found.length >= limit) {
				return(found);
			}

			if (recurse && currentElement.children) {
				elementList = currentElement.children;
			} else if (currentElement instanceof Array) {
				elementList = currentElement;
			} else {
				return(found);
			}
	
			for (var i = 0; i < elementList.length; i++) {
				found = found.concat(DomUtils.getElements(options, elementList[i], recurse, limit));
				if (limit >= 0 && found.length >= limit) {
					break;
				}
			}
	
			return(found);
		}
		
		, getElementById: function DomUtils$getElementById (id, currentElement, recurse) {
			var result = DomUtils.getElements({ id: id }, currentElement, recurse, 1);
			return(result.length ? result[0] : null);
		}
		
		, getElementsByTagName: function DomUtils$getElementsByTagName (name, currentElement, recurse, limit) {
			return(DomUtils.getElements({ tag_name: name }, currentElement, recurse, limit));
		}
		
		, getElementsByTagType: function DomUtils$getElementsByTagType (type, currentElement, recurse, limit) {
			return(DomUtils.getElements({ tag_type: type }, currentElement, recurse, limit));
		}
	}

	function inherits (ctor, superCtor) {
		var tempCtor = function(){};
		tempCtor.prototype = superCtor.prototype;
		ctor.super_ = superCtor;
		ctor.prototype = new tempCtor();
		ctor.prototype.constructor = ctor;
	}

exports.Parser = Parser;

exports.DefaultHandler = DefaultHandler;

exports.RssHandler = RssHandler;

exports.ElementType = ElementType;

exports.DomUtils = DomUtils;

})();

}).call(this)}).call(this,"/node_modules/htmlparser/lib/htmlparser.js","/node_modules/htmlparser/lib")
},{}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * HTMLTreeBuilder
 */

var TreeBuilder = function () {
  function TreeBuilder() {
    _classCallCheck(this, TreeBuilder);

    this.EMPTY_ELEMENT_TAGS = new Set([
    // These are from HTML5.
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'menuitem', 'meta', 'param', 'source', 'track', 'wbr',

    // These are from earlier versions of HTML and are removed in HTML5.
    'basefont', 'bgsound', 'command', 'frame', 'image', 'isindex', 'nextid', 'spacer']);
  }

  _createClass(TreeBuilder, [{
    key: 'canBeEmptyElement',
    value: function canBeEmptyElement(name) {
      return this.EMPTY_ELEMENT_TAGS.has(name);
    }
  }]);

  return TreeBuilder;
}();

exports.default = TreeBuilder;
},{}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _builder = require('./builder.js');

var _builder2 = _interopRequireDefault(_builder);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var htmlparser = require('htmlparser');


if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  try {
    htmlparser = Tautologistics.NodeHtmlParser;
  } catch (e) {}
} else {
  htmlparser = Tautologistics.NodeHtmlParser;
}

var SoupElement = function () {
  function SoupElement() {
    var parent = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    var previousElement = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var nextElement = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

    _classCallCheck(this, SoupElement);

    this.parent = parent;
    this.previousElement = previousElement;
    this.nextElement = nextElement;
  }

  _createClass(SoupElement, [{
    key: 'extract',


    // remove item from dom tree
    value: function extract() {
      var extractFirst = this;
      var extractLast = this;
      var descendants = this.descendants;
      if (descendants && descendants.length) {
        extractLast = descendants[descendants.length - 1];
      }
      // these two maybe null
      var before = this.previousElement;
      var after = extractLast.nextElement;
      // modify extract subtree
      extractFirst.previousElement = null;
      extractLast.nextElement = null;
      if (before) {
        before.nextElement = after;
      }
      if (after) {
        after.previousElement = before;
      }
      //remove node from contents array
      if (this.parent) {
        var index = this.parent.contents.indexOf(this);
        if (index >= 0) {
          this.parent.contents.splice(index, 1);
        }
      }
      this.parent = null;
    }
  }, {
    key: 'insert',
    value: function insert(index, newElement) {
      var _this = this;

      if (newElement == null) {
        throw "Cannot insert null element!";
      }

      if (newElement === this) {
        throw "Cannot add one itself!";
      }

      if (!(this instanceof SoupTag)) {
        throw "insert is not support in " + this.constructor.name;
      }

      if (index < 0) {
        throw "index cannot be negative!";
      }

      if (newElement instanceof JSSoup) {
        newElement.contents.forEach(function (element) {
          _this.insert(index, element);
          ++index;
        });
        return;
      }

      index = Math.min(index, this.contents.length);

      if (typeof newElement == 'string') {
        newElement = new SoupString(newElement);
      }

      if (newElement.parent) {
        if (newElement.parent === this) {
          var curIndex = this.contents.indexOf(newElement);
          if (index == curIndex) return;
          if (index > curIndex) {
            --index;
          }
        }
        newElement.extract();
      }

      var count = this.contents.length;

      var descendantsOfNewElement = newElement.descendants;
      var lastElementOfNewElement = descendantsOfNewElement && descendantsOfNewElement.length > 0 ? descendantsOfNewElement[descendantsOfNewElement.length - 1] : newElement;
      // handle previous element of newElement
      if (index == 0) {
        newElement.previousElement = this;
      } else {
        var previousChild = this.contents[index - 1];
        var previousDescendants = previousChild.descendants;
        newElement.previousElement = previousDescendants && previousDescendants.length > 0 ? previousDescendants[previousDescendants.length - 1] : previousChild;
      }
      if (newElement.previousElement) {
        newElement.previousElement.nextElement = newElement;
      }
      // handle next element of newElement
      if (index < count) {
        lastElementOfNewElement.nextElement = this.contents[index];
      } else {
        var parent = this;
        var parentNextSibling = null;
        while (!parentNextSibling && parent) {
          parentNextSibling = parent.nextSibling;
          parent = parent.parent;
        }

        if (parentNextSibling) {
          lastElementOfNewElement.nextElement = parentNextSibling;
        } else {
          lastElementOfNewElement.nextElement = null;
        }
      }
      if (lastElementOfNewElement.nextElement) {
        lastElementOfNewElement.nextElement.previousElement = lastElementOfNewElement;
      }

      newElement.parent = this;
      this.contents.splice(index, 0, newElement);
    }
  }, {
    key: 'replaceWith',
    value: function replaceWith(newElement) {
      if (this.parent == null) {
        throw "Cannot replace element without parent!";
      }

      if (newElement === this) {
        return;
      }

      if (newElement === this.parent) {
        throw "Cannot replace element with its parent!";
      }

      var parent = this.parent;
      var index = this.parent.contents.indexOf(this);
      this.extract();
      try {
        parent.insert(index, newElement);
      } catch (err) {
        throw 'Cannot replace this element!';
      }
      return this;
    }
  }, {
    key: 'nextSibling',
    get: function get() {
      if (!this.parent) return undefined;
      var index = this.parent.contents.indexOf(this);
      if (index == this.parent.contents.length - 1) return undefined;
      return this.parent.contents[index + 1];
    }
  }, {
    key: 'previousSibling',
    get: function get() {
      if (!this.parent) return undefined;
      var index = this.parent.contents.indexOf(this);
      if (index == 0) return undefined;
      return this.parent.contents[index - 1];
    }
  }]);

  return SoupElement;
}();

var SoupComment = function (_SoupElement) {
  _inherits(SoupComment, _SoupElement);

  function SoupComment(text) {
    var parent = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var previousElement = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
    var nextElement = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

    _classCallCheck(this, SoupComment);

    var _this2 = _possibleConstructorReturn(this, (SoupComment.__proto__ || Object.getPrototypeOf(SoupComment)).call(this, parent, previousElement, nextElement));

    _this2._text = text;
    return _this2;
  }

  return SoupComment;
}(SoupElement);

var SoupString = function (_SoupElement2) {
  _inherits(SoupString, _SoupElement2);

  function SoupString(text) {
    var parent = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var previousElement = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
    var nextElement = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

    _classCallCheck(this, SoupString);

    var _this3 = _possibleConstructorReturn(this, (SoupString.__proto__ || Object.getPrototypeOf(SoupString)).call(this, parent, previousElement, nextElement));

    _this3._text = text;
    return _this3;
  }

  return SoupString;
}(SoupElement);

SoupString.prototype.toString = function () {
  return this._text;
};

var SoupDoctypeString = function (_SoupString) {
  _inherits(SoupDoctypeString, _SoupString);

  function SoupDoctypeString(text) {
    var parent = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var previousElement = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
    var nextElement = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

    _classCallCheck(this, SoupDoctypeString);

    var _this4 = _possibleConstructorReturn(this, (SoupDoctypeString.__proto__ || Object.getPrototypeOf(SoupDoctypeString)).call(this, text, parent, previousElement, nextElement));

    _this4._text = text;
    return _this4;
  }

  return SoupDoctypeString;
}(SoupString);

SoupDoctypeString.prototype.toString = function () {
  return "<" + this._text + ">";
};

var SoupTag = function (_SoupElement3) {
  _inherits(SoupTag, _SoupElement3);

  function SoupTag(name, builder) {
    var attrs = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
    var parent = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
    var previousElement = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;
    var nextElement = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : null;

    _classCallCheck(this, SoupTag);

    var _this5 = _possibleConstructorReturn(this, (SoupTag.__proto__ || Object.getPrototypeOf(SoupTag)).call(this, parent, previousElement, nextElement));

    _this5.name = name;
    _this5.contents = [];
    _this5.attrs = attrs || {};
    _this5.hidden = false;
    _this5.builder = builder;
    return _this5;
  }

  _createClass(SoupTag, [{
    key: '_append',
    value: function _append(child) {
      if (child) this.contents.push(child);
    }

    /*
     * Build a soup object tree
     */

  }, {
    key: '_build',
    value: function _build(children) {
      if (!children || children.length < 1) return this;
      var last = this;
      for (var i = 0; i < children.length; ++i) {
        var ele = this._transform(children[i]);
        last.nextElement = ele;
        ele.previousElement = last;
        if (ele instanceof SoupTag) {
          last = ele._build(children[i].children);
        } else {
          last = ele;
        }
        this._append(ele);
      }
      return last;
    }

    /*
     * It's a soup object factory
     * It consturcts a soup object from dom.
     */

  }, {
    key: '_transform',
    value: function _transform(dom) {
      if (!dom) return null;
      if (dom.type === 'text') {
        return new SoupString(dom.data, this);
      } else if (dom.type === 'comment') {
        return new SoupComment(dom.data, this);
      } else if (dom.type === 'directive') {
        //<!**
        if (dom.name === '!DOCTYPE') {
          return new SoupDoctypeString(dom.data, this);
        }
      }
      return new SoupTag(dom.name, this.builder, dom.attribs, this);
    }
  }, {
    key: 'find',
    value: function find() {
      var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : undefined;
      var attrs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;
      var string = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : undefined;

      var r = this.findAll(name, attrs, string);
      if (r.length > 0) return r[0];
      return undefined;
    }

    /*
     * like find_all in BeautifulSoup
     */

  }, {
    key: 'findAll',
    value: function findAll() {
      var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : undefined;
      var attrs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;
      var string = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : undefined;

      var results = [];
      var strainer = new SoupStrainer(name, attrs, string);

      var descendants = this.descendants;
      for (var i = 0; i < descendants.length; ++i) {
        if (descendants[i] instanceof SoupTag) {
          var tag = strainer.match(descendants[i]);
          if (tag) {
            results.push(tag);
          }
        }
      }

      return results;
    }
  }, {
    key: 'findPreviousSibling',
    value: function findPreviousSibling() {
      var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : undefined;
      var attrs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;
      var string = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : undefined;

      var results = this.findPreviousSiblings(name, attrs, string);
      if (results.length > 0) {
        return results[0];
      }
      return undefined;
    }
  }, {
    key: 'findPreviousSiblings',
    value: function findPreviousSiblings() {
      var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : undefined;
      var attrs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;
      var string = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : undefined;

      var results = [];
      var cur = this.previousSibling;
      var strainer = new SoupStrainer(name, attrs, string);
      while (cur) {
        if (cur instanceof SoupTag) {
          var tag = strainer.match(cur);
          if (tag) {
            results.push(tag);
          }
        }
        cur = cur.previousSibling;
      }
      return results;
    }
  }, {
    key: 'findNextSibling',
    value: function findNextSibling() {
      var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : undefined;
      var attrs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;
      var string = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : undefined;

      var results = this.findNextSiblings(name, attrs, string);
      if (results.length > 0) {
        return results[0];
      }
      return undefined;
    }
  }, {
    key: 'findNextSiblings',
    value: function findNextSiblings() {
      var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : undefined;
      var attrs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;
      var string = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : undefined;

      var results = [];
      var cur = this.nextSibling;
      var strainer = new SoupStrainer(name, attrs, string);
      while (cur) {
        if (cur instanceof SoupTag) {
          var tag = strainer.match(cur);
          if (tag) {
            results.push(tag);
          }
        }
        cur = cur.nextSibling;
      }
      return results;
    }
  }, {
    key: 'getText',
    value: function getText() {
      var separator = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

      var text = [];
      var descendants = this.descendants;
      for (var i = 0; i < descendants.length; ++i) {
        if (descendants[i] instanceof SoupString) {
          text.push(descendants[i]._text);
        }
      }
      return text.join(separator);
    }
  }, {
    key: '_convertAttrsToString',
    value: function _convertAttrsToString() {
      var text = '';
      if (!this.attrs) return text;
      for (var key in this.attrs) {
        if (Array.isArray(this.attrs[key])) {
          text += key + '="' + this.attrs[key].join(' ') + '" ';
        } else {
          text += key + '="' + this.attrs[key] + '" ';
        }
      }
      text = text.trim();
      return text;
    }
  }, {
    key: '_prettify',
    value: function _prettify(indent, breakline) {
      var level = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

      var text = '';
      if (this.hidden && level == 0) {
        --level;
      }
      if (!this.hidden) {
        var attrs = this._convertAttrsToString();
        if (attrs) {
          text += indent.repeat(level) + '<' + this.name + ' ' + attrs;
        } else {
          text += indent.repeat(level) + '<' + this.name;
        }
      }

      // is an element doesn't have any contents, it's a self closing element
      if (!this.hidden) {
        if (this._isEmptyElement() && this.builder.canBeEmptyElement(this.name)) {
          text += ' />' + breakline;
          return text;
        } else {
          text += '>' + breakline;
        }
      }

      for (var i = 0; i < this.contents.length; ++i) {
        if (this.contents[i] instanceof SoupString) {
          var curText = this.contents[i].toString();
          curText = curText.trim();
          if (curText.length != 0) {
            if (curText.substring(curText.length - 1) == "\n") {
              text += indent.repeat(level + 1) + curText;
            } else {
              text += indent.repeat(level + 1) + curText + breakline;
            }
          }
        } else {
          if (this.contents[i] instanceof SoupComment) {
            text += indent.repeat(level + 1) + "<!--" + this.contents[i]._text + "-->" + breakline;
          } else {
            text += this.contents[i]._prettify(indent, breakline, level + 1);
          }
        }
      }

      if (!this.hidden) {
        text += indent.repeat(level) + '</' + this.name + '>' + breakline;
      }

      return text;
    }
  }, {
    key: 'prettify',
    value: function prettify() {
      var indent = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : ' ';
      var breakline = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '\n';

      return this._prettify(indent, breakline).trim();
    }

    /*
     * Append item in contents
     */

  }, {
    key: 'append',
    value: function append(item) {
      var pre = this;
      var next = this.nextElement;
      var appendFirst = item;
      var appendLast = item;
      var itemDescendants = item.descendants;
      if (itemDescendants && itemDescendants.length > 0) {
        appendLast = itemDescendants[itemDescendants.length - 1];
      }
      var descendants = this.descendants;
      if (descendants && descendants.length > 0) {
        pre = descendants[descendants.length - 1];
        next = pre.nextElement;
      }

      //merge two SoupString
      if (item instanceof SoupString && pre instanceof SoupString) {
        pre._text += item._text;
        return;
      }

      appendFirst.previousElement = pre;
      appendLast.nextElement = next;
      if (pre) pre.nextElement = appendFirst;
      if (next) next.previousElement = appendLast;

      this.contents.push(item);
      item.parent = this;
    }
  }, {
    key: '_isEmptyElement',
    value: function _isEmptyElement() {
      return this.contents.length == 0;
    }
  }, {
    key: 'string',
    get: function get() {
      var cur = this;
      while (cur && cur.contents && cur.contents.length == 1) {
        cur = cur.contents[0];
      }
      if (!cur || cur instanceof SoupTag) return undefined;
      return cur;
    }
  }, {
    key: 'text',
    get: function get() {
      return this.getText();
    }
  }, {
    key: 'descendants',
    get: function get() {
      var ret = [];
      var cur = this.nextElement;
      while (cur) {
        var parent = cur.parent;
        while (parent && parent != this) {
          parent = parent.parent;
        }
        if (!parent) break;
        ret.push(cur);
        cur = cur.nextElement;
      }
      return ret;
    }
  }]);

  return SoupTag;
}(SoupElement);

SoupTag.prototype.toString = function () {
  return this.prettify('', '');
};

var ROOT_TAG_NAME = '[document]';

var JSSoup = function (_SoupTag) {
  _inherits(JSSoup, _SoupTag);

  function JSSoup(text) {
    var ignoreWhitespace = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

    _classCallCheck(this, JSSoup);

    var _this6 = _possibleConstructorReturn(this, (JSSoup.__proto__ || Object.getPrototypeOf(JSSoup)).call(this, ROOT_TAG_NAME, new _builder2.default(), null));

    var handler = new htmlparser.DefaultHandler(function (error, dom) {
      if (error) {
        console.log(error);
      } else {}
    }, { verbose: false, ignoreWhitespace: ignoreWhitespace });

    var parser = new htmlparser.Parser(handler);
    parser.parseComplete(text);

    if (Array.isArray(handler.dom)) {
      _this6._build(handler.dom);
    } else {
      _this6._build([handler.dom]);
    }

    _this6.hidden = true;
    return _this6;
  }

  return JSSoup;
}(SoupTag);

exports.default = JSSoup;

var SoupStrainer = function () {
  function SoupStrainer(name, attrs, string) {
    _classCallCheck(this, SoupStrainer);

    if (typeof attrs == 'string') {
      attrs = { class: [attrs] };
    } else if (Array.isArray(attrs)) {
      attrs = { class: attrs };
    } else if (attrs && attrs.class && typeof attrs.class == 'string') {
      attrs.class = [attrs.class];
    }
    if (attrs && attrs.class) {
      for (var i = 0; i < attrs.class.length; ++i) {
        attrs.class[i] = attrs.class[i].trim();
      }
    }
    this.name = name;
    this.attrs = attrs;
    this.string = string;
  }

  _createClass(SoupStrainer, [{
    key: 'match',
    value: function match(tag) {
      // match string
      if (this.name == undefined && this.attrs == undefined) {
        if (this.string) {
          if (this._matchName(tag.string, this.string)) return tag.string;else return null;
        }
        return tag;
      }
      // match tag name
      var match = this._matchName(tag.name, this.name);
      if (!match) return null;
      // match string
      match = this._matchName(tag.string, this.string);
      if (!match) return null;
      // match attributes
      if (_typeof(this.attrs) == 'object') {
        if (!this._isEmptyObject(this.attrs)) {
          var props = Object.getOwnPropertyNames(this.attrs);
          var found = false;
          for (var i = 0; i < props.length; ++i) {
            if (props[i] in tag.attrs && this._matchAttrs(props[i], tag.attrs[props[i]], this.attrs[props[i]])) {
              found = true;
              break;
            }
          }
          if (!found) return null;
        }
      }
      return tag;
    }
  }, {
    key: '_matchName',
    value: function _matchName(tagItem, name) {
      if (name == undefined || name == null) return true;
      // if name is an array, then tag match any item in this array is a match.
      if (Array.isArray(name)) {
        for (var i = 0; i < name.length; ++i) {
          var match = this._matchName(tagItem, name[i]);
          if (match) return true;
        }
        return false;
      }
      return tagItem == name;
    }
  }, {
    key: '_matchAttrs',
    value: function _matchAttrs(name, candidateAttrs, attrs) {
      if (typeof candidateAttrs == 'string') {
        if (name == 'class') {
          candidateAttrs = candidateAttrs.replace(/\s\s+/g, ' ').trim().split(' ');
        } else {
          candidateAttrs = [candidateAttrs];
        }
      }
      if (typeof attrs == 'string') {
        attrs = [attrs];
      }
      for (var i = 0; i < attrs.length; ++i) {
        if (candidateAttrs.indexOf(attrs[i]) < 0) return false;
      }
      return true;
    }
  }, {
    key: '_isEmptyObject',
    value: function _isEmptyObject(obj) {
      return Object.keys(obj).length == 0;
    }
  }]);

  return SoupStrainer;
}();
},{"./builder.js":5,"htmlparser":4}]},{},[1]);

import requests
import json
from bs4 import BeautifulSoup

"""
getReadability()
Parameters:
    URL
    - URL of site to get readability of
    - Required
    minimum_element_length
    - Minimum length of elements to include. This parameter exists to ensure english-like sentences are added to excerpt, while other html text is ignored.
    - Default: 15
    - Optional
    maximum_excerpt_length
    - Maximum length of excerpt to analyze readability of. Increasing this parameter should generally increase accuracy but runs the risk of causing 414-Request Too Large responses
    - Default: 2000
    - Optional
Outputs:
    - Readability Score
"""
def getReadability(url, minimum_element_length = 20, maximum_excerpt_length = 2500, minimum_excerpt_length = 100):

    excerpt = getExcerpt(url, minimum_element_length = minimum_element_length, maximum_excerpt_length = maximum_excerpt_length)

    # Page does not have enough content to pass into readability algorithms
    if len(excerpt) < minimum_excerpt_length:
        return None

    query_string = { "text" : excerpt}

    # Make request to rapid api for readability metrics
    endpoint = "https://ipeirotis-readability-metrics.p.rapidapi.com/getReadabilityMetrics"
    payload = ""
    headers = {
        'x-rapidapi-host': "ipeirotis-readability-metrics.p.rapidapi.com",
        'x-rapidapi-key': "",
        'content-type': "application/x-www-form-urlencoded"
    }

    try:
        response = requests.request("POST", endpoint, data=payload, headers=headers, params=query_string)
    except requests.exceptions.RequestException as e:
        raise e

    if response.status_code == 200:
        try:
            readability_json = json.loads(response.text)
            return create_composite(readability_json)
        except Exception as e:
            raise e
    else:
        response.raise_for_status()

"""
getExcerpt()
Parameters:
    URL
    - URL of site to get readability of
    - Required
    minimum_element_length
    - Minimum length of elements to include. This parameter exists to ensure english-like sentences are added to excerpt, while other html text is ignored.
    - Default: 15
    - Optional
    maximum_excerpt_length
    - Maximum length of excerpt to analyze readability of. Increasing this parameter should generally increase accuracy but runs the risk of causing 414-Request Too Large responses
    - Default: 2000
    - Optional
"""
def getExcerpt(url, minimum_element_length = 20, maximum_excerpt_length = 2000):

    # Get html from url
    try:
        response = requests.get(url, headers={'User-Agent' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:80.0) Gecko/20100101 Firefox/80.0'})
    except requests.exceptions.RequestException as e:
        raise e

    if response.status_code == 200:
        soup = BeautifulSoup(response.text, 'html.parser')
    else:
        response.raise_for_status()

    # Parse html and collect words for request
    excerpt = ""
    for element in soup.find_all(["p"]):
        clean_text = element.text.strip()
        if len(clean_text) > minimum_element_length: # Omit paragraphs that do not have useful info
            excerpt += clean_text + (" " if clean_text[-1] == "." else ". ")
        if len(excerpt) > maximum_excerpt_length: # Cutoff to avoid sending requests that are too large
            excerpt = excerpt[:maximum_excerpt_length]
            break

    return excerpt

def create_composite(readability_json):

    composite_readability = 90 - readability_json["FLESCH_READING"] # Bias scale toward harder
    composite_readability = composite_readability if composite_readability <= 100 else 100
    composite_readability = composite_readability if composite_readability >= 0 else 0

    return composite_readability

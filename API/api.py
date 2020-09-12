import requests
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
def getReadability(url, minimum_element_length = 15, maximum_excerpt_length = 2000):

    query_string = { "text" : getExcerpt(url, minimum_element_length = 15, maximum_excerpt_length = 2000)}

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
        return { "Error" : e, "Origin" : "Request to rapid API readability"}

    if response.status_code == 200:
        return response.text
    else:
        return { "Error" : response.status_code, "Origin" : "Request to rapid API readability"}

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
def getExcerpt(url, minimum_element_length = 15, maximum_excerpt_length = 2000):

    # Get html from url
    try:
        response = requests.get(url, headers={'User-Agent' : 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.76 Safari/537.36'})
    except requests.exceptions.RequestException as e:
        return { "Error" : e, "Origin" : "Request to site url"}

    if response.status_code == 200:
        soup = BeautifulSoup(response.text, 'html.parser')
    else:
        return { "Error" : response.status_code, "Origin" : "Request to site url"}

    # Parse html and collect words for request
    excerpt = ""
    for element in soup.find_all():
        clean_text = element.text.strip()
        if len(clean_text) > minimum_element_length: # Omit paragraphs that do not have useful info
            excerpt += clean_text
        if len(excerpt) > maximum_excerpt_length: # Cutoff to avoid sending requests that are too large
            excerpt = excerpt[:maximum_excerpt_length]
            break

    return excerpt
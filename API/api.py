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
"""
def getReadability(url, minimum_element_length = 15, maximum_excerpt_length = 2000):

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
    query_string = ""
    for p in soup.find_all():
        if len(p.text) > minimum_element_length: # Omit paragraphs that do not have useful info
            query_string += p.text
        if len(query_string) > maximum_excerpt_length: # Cutoff to avoid sending requests that are too large
            query_string = query_string[:maximum_excerpt_length]
            break
    query_string = {"text" : query_string}

    # Make request to rapid api for readability metrics
    endpoint = "https://ipeirotis-readability-metrics.p.rapidapi.com/getReadabilityMetrics"
    payload = ""
    headers = {
        'x-rapidapi-host': "ipeirotis-readability-metrics.p.rapidapi.com",
        'x-rapidapi-key': "3b73c947b6mshb12b8f982cd5a3cp173e06jsn1cc986e42ebf",
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
import requests
import aiohttp
import asyncio
from bs4 import BeautifulSoup
import textstat

def syllable_count(word):
    word = word.lower()
    count = 0
    vowels = "aeiouy"
    if word[0] in vowels:
        count += 1
    for index in range(1, len(word)):
        if word[index] in vowels and word[index - 1] not in vowels:
            count += 1
    if word.endswith("e"):
        count -= 1
    if count == 0:
        count += 1
    return count

def get_most_complex_word(excerpt):
    import re

    most_complex_word = ""
    most_complex_word_len = 0
    excerpt = re.sub('[^a-zA-Z]+', ' ', excerpt)
    for word in re.split('\s+', excerpt):
        sc = syllable_count(word)
        if s > most_complex_word_len:
            most_complex_word = word
    return word


async def fetch_excerpt(session, url, minimum_element_length = 20, minimum_excerpt_length = 100, maximum_excerpt_length = 2500):
    complex_word = ""
    try:
        async with session.get(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:80.0) Gecko/20100101 Firefox/80.0'}, raise_for_status=True) as response:
            res = await response.read()
            # if res.status_code == 200:
            soup = BeautifulSoup(res, 'lxml')
            # return soup
            # # else:
            # #     res.raise_for_status()
            # Parse html and collect words for request

            excerpt = ""
            for element in soup.find_all(["p"]):
                clean_text = element.text.strip()
                if len(clean_text) > minimum_element_length:  # Omit paragraphs that do not have useful info
                    excerpt += clean_text + (" " if clean_text[-1] == "." else ". ")

                if len(excerpt) > maximum_excerpt_length:  # Cutoff to avoid sending requests that are too large
                    excerpt = excerpt[:maximum_excerpt_length]
                    break
            return excerpt
    except Exception as e:
        print(e)
        return ""

def getReadabilityScore_local(excerpt, minimum_element_length = 20, minimum_excerpt_length = 100, maximum_excerpt_length = 2500 ):
    # Page does not have enough content to pass into readability algorithms
    if len(excerpt) < minimum_excerpt_length:
        return None

    return textstat.text_standard(excerpt, float_output=True)


# Partner function for get_readability_scores()
# Think of this like a wrapper
def get_readability_scores_concurrent(urls_arr):
    return asyncio.run(get_readability_scores(urls_arr))


# Don't call this directly!!! Use get_readability_scores_concurrent(urls_arr)
# returns dictionary { url : readability }
async def get_readability_scores(urls_arr):
    readability_scores = {}
    excerpts = []
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_excerpt(session, url) for url in urls_arr]
        excerpts = await asyncio.gather(*tasks)
    for i in range(0, len(urls_arr)):
        readability_scores[urls_arr[i]] = getReadabilityScore_local(excerpts[i])
    for i in range(0, len(urls_arr)):
        print("{}:{}".format(urls_arr[i], get_most_complex_word(excerpts[i])))

    return readability_scores


# if __name__ == "__main__":
#     import matplotlib.pyplot as plt
#     import time
#     x_vals = []
#     y_vals = []
#     for i in range(1,100,10):
#         t0 = time.time()
#         a = ["https://en.wikipedia.org/wiki/Hypertext"] * i
#         print(get_readability_scores_concurrent(a))
#         t1 = time.time()
#         x_vals.append(i)
#         y_vals.append(t1-t0)
#     plt.plot(x_vals, y_vals)
#     plt.show(block=True)
#     plt.waitforbuttonpress()

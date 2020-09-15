import requests
import aiohttp
import asyncio
from bs4 import BeautifulSoup
import textstat

#optimization
from searchin.optimization import timeit
import uuid

async def fetch_excerpt(session, url, minimum_element_length = 20, minimum_excerpt_length = 100, maximum_excerpt_length = 2500, coroutine_uuid=-1):
    import time
    t0 = time.time()
    try:
        async with session.get(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:80.0) Gecko/20100101 Firefox/80.0'}, raise_for_status=True) as resp:

            text = await resp.read()
            t_resp = time.time()

            nchars = len(text)

            soup = BeautifulSoup(text, 'html.parser')

            excerpt = ""
            for element in soup.find_all(["p"]):
                clean_text = element.text.strip()
                if len(clean_text) > minimum_element_length:  # Omit paragraphs that do not have useful info
                    excerpt += clean_text + (" " if clean_text[-1] == "." else ". ")
                if len(excerpt) > maximum_excerpt_length:  # Cutoff to avoid sending requests that are too large
                    excerpt = excerpt[:maximum_excerpt_length]
                    break
            t_parse = time.time()
            # print("(fetch_excerpt:{})\n\tcoroutine_start={}\n\tresponse {}\n\tparsed {}\n\tnchars {}".format(
            #     coroutine_uuid,
            #     t0,
            #     t_resp - t0,
            #     t_parse - t_resp,
            #     nchars))
            return (excerpt,
                    ([[t0, t_resp - t0],
                     [t_parse, t_parse - t_resp]],
                    url,
                    nchars))
    except Exception as e:
        raise Exception(e)

@timeit
def getReadabilityScore_local(excerpt, minimum_element_length = 20, minimum_excerpt_length = 100, maximum_excerpt_length = 2500 ):
    # Page does not have enough content to pass into readability algorithms
    if len(excerpt) < minimum_excerpt_length:
        return None

    return textstat.text_standard(excerpt, float_output=True)


# Partner function for get_readability_scores()
# Think of this like a wrapper
def get_readability_scores_concurrent(urls_arr, gtime):
    return asyncio.run(get_readability_scores(urls_arr, gtime))


# Don't call this directly!!! Use get_readability_scores_concurrent(urls_arr)
# returns dictionary { url : readability }
@timeit
async def get_readability_scores(urls_arr, g_time):
    import time
    readability_scores = {}
    excerpts = []
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_excerpt(session, url, coroutine_uuid=uuid.uuid1()) for url in urls_arr]
        excerpts = await asyncio.gather(*tasks)
    for i in range(0, len(urls_arr)):
        t0 = time.time()
        readability_scores[urls_arr[i]] = getReadabilityScore_local(excerpts[i][0])
        t1 = time.time()
        dur = t1-t0
        print(t1-t0)
        excerpts[i][1][0].append([t0, dur])
        excerpts[i][1][0].append(g_time)

    from searchin.viz import api_calls
    api_calls(list(map(lambda f: f[1], excerpts)))

    return readability_scores


if __name__ == "__main__":
    import time
    a = ["https://en.wikipedia.org/wiki/Hypertext"] * 10
    print(get_readability_scores_concurrent(a, [time.time()+3, 1.1]))
    # import matplotlib.pyplot as plt
    # import time
    # x_vals = []
    # y_vals = []
    # for i in range(1,10):
    #     t0 = time.time()
    #     a = ["https://en.wikipedia.org/wiki/Hypertext"] * i
    #     print(get_readability_scores_concurrent(a))
    #     t1 = time.time()
    #     x_vals.append(i)
    #     y_vals.append(t1-t0)
    # plt.plot(x_vals, y_vals)
    # plt.show(block=True)
    # plt.waitforbuttonpress()

import requests
import aiohttp
import asyncio
from bs4 import BeautifulSoup
import textstat

#optimization
from searchin.optimization import timeit
import uuid

async def fetch_excerpt(session, url, queue, minimum_element_length = 20, minimum_excerpt_length = 100, maximum_excerpt_length = 2500, coroutine_uuid=-1):
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
            queue.append((url, excerpt))
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


async def run_async_tasks(urls_arr, session):
    doneQueue = []

    async def consumer(queue):
        while True:
            # wait for an item from the producer
            item = await queue.get()

        import time

    async def producer(url, queue, session, minimum_element_length=20, minimum_excerpt_length=100,
                       maximum_excerpt_length=2500, coroutine_uuid=-1):
        # Get a "work item" out of the queue.
        t0 = time.time()
        try:
            async with session.get(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:80.0) Gecko/20100101 Firefox/80.0'},
                                   raise_for_status=True) as resp:
                text = await resp.read()
                t_resp = time.time()
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
                print("Done with task {}".format(coroutine_uuid))
                doneQueue.append((excerpt,
                                 ([[t0, t_resp - t0],
                                   [t_parse, t_parse - t_resp]],
                                  url,
                                  len(text))))

        except Exception as e:
            raise Exception(e)

    queue = asyncio.Queue()
    # fire up the both producers and consumers
    producers = [asyncio.create_task(producer(url, queue, session, coroutine_uuid=uuid.uuid1()))
                 for url in urls_arr]
    consumers = [asyncio.create_task(consumer(queue))
                 for _ in range(1)]

    # with both producers and consumers running, wait for
    # the producers to finish
    t0 = time.time()
    for fut in asyncio.as_completed(producers, timeout=2.0):
        try:
            await fut
        except Exception:
            print("Exception Occured")
            raise Exception("Exception in readability production")
    while(len(doneQueue) < len(urls_arr)):
        doneQueue.append("")

    # wait for the remaining tasks to be processed
    await queue.join()
    # cancel the consumers, which are now idle
    for c in consumers:
        c.cancel()

    return doneQueue

# Don't call this directly!!! Use get_readability_scores_concurrent(urls_arr)
# returns dictionary { url : readability }
@timeit
async def get_readability_scores(urls_arr, g_time):
    import time
    readability_scores = {}
    excerpts = []
    queue = []
    async with aiohttp.ClientSession() as session:
        # tasks = [fetch_excerpt(session, url, requests_queue, coroutine_uuid=uuid.uuid1()) for url in urls_arr]
        # excerpts = await asyncio.gather(*tasks)
        # excerpts = await asyncio.gather(*tasks)
        # while(len(requests_queue) < len(tasks)):
        #     time.sleep(1)
        #     print(requests_queue)
        # print("done processing {}".format(requests_queue))
        results = await run_async_tasks(urls_arr, session)

    for i in range(0, len(urls_arr)):
        t0 = time.time()
        readability_scores[urls_arr[i]] = getReadabilityScore_local(results[i][0])
        t1 = time.time()
        dur = t1-t0
        print(t1-t0)
        results[i][1][0].append([t0, dur])
        results[i][1][0].append(g_time)

    from searchin.viz import api_calls
    api_calls(list(map(lambda f: f[1], results)))

    return readability_scores


if __name__ == "__main__":
    import time
    a = ["https://en.wikipedia.org/wiki/Hypertext",
         "https://en.wikipedia.org/wiki/Hypertext_Transfer_Protocol",
         "https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview",
         "https://www.w3schools.com/whatis/whatis_http.asp",
         "https://www.epa.gov/",
         "https://en.wikipedia.org/wiki/Hypertext",
         "https://en.wikipedia.org/wiki/Hypertext_Transfer_Protocol",
         "https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview",
         "https://www.w3schools.com/whatis/whatis_http.asp",
         "https://www.epa.gov/"
         ]
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

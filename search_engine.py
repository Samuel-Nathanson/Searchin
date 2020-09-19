import ast, operator
import readability_sorter
from googleapiclient.discovery import build
my_api_key = ""
my_cse_id = "db4b674e75ef6e76a"

def google_search(search_term, api_key, cse_id, **kwargs):
    service = build("customsearch", "v1", developerKey=api_key)
    res = service.cse().list(q=search_term, cx=cse_id, **kwargs).execute()
    return res

def filter_search(query, reading_level):
    # result_a = google_search(query, my_api_key, my_cse_id)
    import time
    t0 = time.time()
    result_b = google_search(query, my_api_key, my_cse_id, num=10)
    t1 = time.time()
    #with open('test.json', 'r') as file:
#        result = ast.literal_eval(file.read())
    result_a_items = [(i,x) for i,x in enumerate(result_b['items'])]
    result_items = result_a_items
    api_items = [{result_item[0]:result_item[1]['link']} for result_item in result_items]
    weighted_results = readability_sorter.getRelevance(api_items, reading_level, [t0, t1-t0], dropoff_speed=100)
    #pdb.set_trace()
    weighted_results_reformat = [{'id':list(x)[0],'relevancy':x[list(x)[0]]} for x in weighted_results[1]]
    #pdb.set_trace()
    for j,y in enumerate(weighted_results[0]):
        weighted_results_reformat[j]['reading_level'] = y[list(y)[0]]
        #pdb.set_trace()
    '''weighted_results_temp = [x for x in weighted_results_reformat]
    for i,x in enumerate(weighted_results_temp):
        if x['relevancy'] == 0:
            weighted_results_temp.remove(x)
    weighted_results_reformat = weighted_results_temp'''
        #pdb.set_trace()
    #weighted_results_reformat = [{'id':list(x)[0],'relevancy':x[list(x)[0]],'reading_level':y[list(y)[0]]} for (x,y) in weighted_results if x[list(x)[0]] != None]

    sorted_weighted_results = sorted(weighted_results_reformat, key=operator.itemgetter('relevancy'))[::-1]
    result_items_temp = []
    for i,x in enumerate(sorted_weighted_results):
        for j,y in enumerate(result_items):
            #pdb.set_trace()
            if x['id'] == y[0]:
                result_items_temp.append((y[0],y[1],x['relevancy'],x['reading_level']))
    result_items = result_items_temp
    return result_items

testres2 = {'desc': 'this is a bad website', 'title': 'Bad Website', 'link': 'sketchy.company', 'score': 20 }

def search_result_formatter(result_items):
    results = []
    for x in result_items:
        formatted_result = {}
        formatted_result['desc'] = x[1]['snippet']
        formatted_result['title'] = x[1]['title']
        formatted_result['link'] = x[1]['link']
        formatted_result['relevancy'] = round(x[2], 2)
        formatted_result['score'] = x[3]
        results.append(formatted_result)
    return results
#if __name__ == '__main__':
    #search_result_formatter(filter_search('coffee'))

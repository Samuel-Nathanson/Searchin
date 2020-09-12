import json, ast
from googleapiclient.discovery import build
my_api_key = "AIzaSyAvWTcAb7TLCrk2bAkO1kRPEjEAUgaE2FM"
my_cse_id = "db4b674e75ef6e76a"

def google_search(search_term, api_key, cse_id, **kwargs):
    service = build("customsearch", "v1", developerKey=api_key)
    res = service.cse().list(q=search_term, cx=cse_id, **kwargs).execute()
    return res

def filter_search(query):
    result = google_search(query, my_api_key, my_cse_id)
    with open('test.json', 'r') as file:
        result = ast.literal_eval(file.read())
    result_items = [(i,x) for i,x in enumerate(result['items'])]
    api_items = [{result_item[0]:result_item[1]['link']} for result_item in result_items]
    print(api_items)

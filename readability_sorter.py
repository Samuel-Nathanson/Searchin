''' getReadability()
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
    Readability Score
    - Composite score of algorithms results
    - Allowed values 0.0 <= x <= 100.0 '''

# input: api items

import metrics
import pdb
import math
import requests


def getReadabilityDistance(user_reading_level, page_reading_level, dropoff_speed):
    x = page_reading_level - user_reading_level
    return 1*math.exp(-math.pow(x,2)/(2*dropoff_speed))

def originalIndexToRelevanceValue(index):
    return 1/(index+1)

def getWeightedRelevance(original_index, readability_distance, weight):
    weighted_relevance = 2 * (((1-weight)*originalIndexToRelevanceValue(original_index)) + (weight*readability_distance))
    return weighted_relevance

def getRelevance(api_items, user_reading_level, weight = 0.75, dropoff_speed=200):
    api_items_readability = []
    api_items_weighted_relevance = []

    # [{0: 'https://en.wikipedia.org/wiki/Coffee'}, {1: 'https://www.starbucks.com/'}, {2: 'https://www.amazon.com/coffee/s?k=coffee'}, {3: 'https://www.medicalnewstoday.com/articles/270202'}, {4: 'https://www.healthline.com/nutrition/top-13-evidence-based-health-benefits-of-coffee'}, {5: 'https://www.stumptowncoffee.com/'}, {6: 'https://www.eatthis.com/effects-of-coffee-on-body/'}, {7: 'https://www.peets.com/'}, {8: 'https://food52.com/blog/25513-putting-salt-in-coffee'}, {9: 'https://www.insider.com/former-starbucks-employee-shares-secrets-tips-and-menu-hacks'}]


    urldicts = [(x[i],i) for i,x in enumerate(api_items)]
    urllist = [x[0] for x in urldicts]
    item_readabilities = metrics.get_readability_scores_concurrent(urllist)
    #pdb.set_trace()
    for item_readability in item_readabilities:
        for element in urldicts:
            if element[0] == item_readability:
                id = element[1]
        #pdb.set_trace()
        if item_readabilities[item_readability] is not None:
            api_items_readability.append({id:item_readabilities[item_readability]})
            api_items_weighted_relevance.append({id:getWeightedRelevance(id,getReadabilityDistance(user_reading_level, item_readabilities[item_readability], dropoff_speed),weight)})
        else:
            print('The page ' + item_readability + ' did not have enough content to compute a readability score.')
            api_items_readability.append({id:None})
            api_items_weighted_relevance.append({id:0})

    '''for i,item in enumerate(api_items):
        try:
            item_readability = metrics.getReadability(item[i])
            if item_readability is None:
                #pdb.set_trace()
                print('The page ' + item[i] + ' did not have enough content to compute a readability score.')
                api_items_readability.append({i:None})
                api_items_weighted_relevance.append({i:0})
            else:
                api_items_readability.append({i:metrics.getReadability(item[i])})
                api_items_weighted_relevance.append({i:getWeightedRelevance(i,getReadabilityDistance(user_reading_level, api_items_readability[i][i], dropoff_speed),weight)})
        except requests.HTTPError as e:
            print(e)
            api_items_readability.append({i:None})
            api_items_weighted_relevance.append({i:0})
    print (api_items_readability)'''
    return (api_items_readability, api_items_weighted_relevance)

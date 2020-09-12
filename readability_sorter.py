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

#import file

def getReadability(item):
    return 50

def originalIndexToRelevanceValue(index):
    return 1/(index+1)

def getWeightedRelevance(original_index, readability, weight):
    weighted_relevance = 2 * (((1-weight)*originalIndexToRelevanceValue(original_index)) + (weight*readability))
    return weighted_relevance

weight = 0.5
api_items = [{0: 'https://en.wikipedia.org/wiki/Coffee'}, {1: 'https://www.starbucks.com/'}, {2: 'https://www.amazon.com/coffee/s?k=coffee'}, {3: 'https://www.medicalnewstoday.com/articles/270202'}, {4: 'https://www.healthline.com/nutrition/top-13-evidence-based-health-benefits-of-coffee'}, {5: 'https://www.stumptowncoffee.com/'}, {6: 'https://www.eatthis.com/effects-of-coffee-on-body/'}, {7: 'https://www.peets.com/'}, {8: 'https://food52.com/blog/25513-putting-salt-in-coffee'}, {9: 'https://www.insider.com/former-starbucks-employee-shares-secrets-tips-and-menu-hacks'}]
api_items_readability = []
api_items_weighted_relevance = []
for i,item in enumerate(api_items):
    api_items_readability.append({i:getReadability(item)})
    api_items_weighted_relevance.append({i:getWeightedRelevance(i,api_items_readability[i][i],weight)})
print(api_items_readability, api_items_weighted_relevance)

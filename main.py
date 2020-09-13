from flask import Flask, render_template, request, redirect
from forms import SearchPageForm
import search_engine

app = Flask(__name__)

@app.route('/about')
def about():
    return render_template('about.html')
    
@app.route('/', methods=['GET', 'POST'])
@app.route('/search', methods=['GET', 'POST'])
def searchpage():
    search = SearchPageForm(request.form)
    if request.method == 'POST':
        return resultpage(search)
    if not search.validate():
        pass
        #flash('Fill out all the required form fields.')
    else:
        pass
    return render_template('search.html', form=search)



@app.route('/results')
def resultpage(search):

    #resultform = ResultsPageForm(request.form)
    search_string = search.data['search']
    results = search_engine.search_result_formatter(search_engine.filter_search('coffee', float(search.data['reading_level'])))
    #pdb.set_trace()
    return render_template('results.html', results=results, page_number=str(int(search.data['page_number'])+1), reading_level=search.data['reading_level'], search=search.data['search'])
    #return 'test'

if __name__ == '__main__':
    # This is used when running locally only. When deploying to Google App
    # Engine, a webserver process such as Gunicorn will serve the app. This
    # can be configured by adding an `entrypoint` to app.yaml.
    # Flask's development server will automatically serve static files in
    # the "static" directory. See:
    # http://flask.pocoo.org/docs/1.0/quickstart/#static-files. Once deployed,
    # App Engine itself will serve those files as configured in app.yaml.
    app.run(host='127.0.0.1', port=8080, debug=True)

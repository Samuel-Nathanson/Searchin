from wtforms import Form, StringField, validators
from wtforms.fields.html5 import DecimalRangeField
from wtforms.fields import HiddenField

class SearchPageForm(Form):
    reading_level = DecimalRangeField(default=10, render_kw={"min": 0, "max": 20, "style":".control-label {display:none;}"})
    page_number = HiddenField("Page Number")
    search = StringField('', [validators.InputRequired()], render_kw={"placeholder":"Search for anything..."})

class ResultsPageForm(Form):
    reading_level = HiddenField("Reading Level")
    page_number = HiddenField("Page Number")
    search = HiddenField("Search")

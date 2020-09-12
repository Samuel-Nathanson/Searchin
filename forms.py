from wtforms import Form, StringField, validators
from wtforms.fields.html5 import DecimalRangeField

class SearchPageForm(Form):
    reading_level = DecimalRangeField(default=10, render_kw={"min": 0, "max": 20, "style":".control-label {display:none;}"})
    search = StringField('', [validators.InputRequired()], render_kw={"placeholder":"Search for anything..."})

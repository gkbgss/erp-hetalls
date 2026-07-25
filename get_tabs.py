import pandas as pd
import urllib.request
url = 'https://docs.google.com/spreadsheets/d/1pMyWyI6J2YM7DzlYJ9__M8bZNaGPyrgTVAItoSiYYNg/export?format=xlsx'
urllib.request.urlretrieve(url, 'temp.xlsx')
xls = pd.ExcelFile('temp.xlsx')
print(xls.sheet_names)

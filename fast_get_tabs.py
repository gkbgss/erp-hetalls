import urllib.request, zipfile, io
import xml.etree.ElementTree as ET

url = 'https://docs.google.com/spreadsheets/d/1pMyWyI6J2YM7DzlYJ9__M8bZNaGPyrgTVAItoSiYYNg/export?format=xlsx'
print("Downloading...")
data = urllib.request.urlopen(url).read()
print("Downloaded. Extracting...")
z = zipfile.ZipFile(io.BytesIO(data))
xml_data = z.read('xl/workbook.xml')
root = ET.fromstring(xml_data)
ns = {'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
sheets = root.find('main:sheets', ns)
for sheet in sheets.findall('main:sheet', ns):
    print("Sheet name:", sheet.get('name'), "Id:", sheet.get('sheetId'))

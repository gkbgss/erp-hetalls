import urllib.request
import csv

url = "https://docs.google.com/spreadsheets/d/1pMyWyI6J2YM7DzlYJ9__M8bZNaGPyrgTVAItoSiYYNg/export?format=csv&gid=2023338778&range=AI50:AO50"

try:
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as response:
        content = response.read().decode('utf-8')
        print("Success! Content:")
        print(content)
except Exception as e:
    print(f"Error: {e}")

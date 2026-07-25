import urllib.request, re
url = 'https://docs.google.com/spreadsheets/d/1SVvZnv8yphJNJp_qNKZdkB-WByslByjeRPM0_0oLQuE/edit'
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as response:
    html = response.read().decode('utf-8')
    matches = re.findall(r'\"([^\"]+)\",\"([0-9]{5,})\"', html)
    print("Potential sheet names and GIDs:")
    for m in set(matches):
        print(f"Sheet: {m[0]}, GID: {m[1]}")

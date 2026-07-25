import urllib.request

url = 'https://docs.google.com/spreadsheets/d/1SVvZnv8yphJNJp_qNKZdkB-WByslByjeRPM0_0oLQuE/gviz/tq?tqx=out:csv&sheet=MONTHLY%20BRANDS'
try:
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as response:
        content = response.read().decode('utf-8')
        print(content[:500])
except Exception as e:
    print(f"Error: {e}")

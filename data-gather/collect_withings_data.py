import requests
import http.server
import webbrowser
from datetime import datetime, timedelta
from urllib.parse import urlparse, parse_qs
import os
import sys

class AuthHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        self.wfile.write(b"Auth complete - you can close this window")
        
        query = urlparse(self.path).query
        params = parse_qs(query)
        if 'code' in params:
            self.server.auth_code = params['code'][0]

class WithingsAPI:
    AUTH_URL = "https://account.withings.com/oauth2_user/authorize2"
    TOKEN_URL = "https://wbsapi.withings.net/v2/oauth2"
    API_URL = "https://wbsapi.withings.net"

    def __init__(self, client_id, client_secret):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = "http://localhost:8080"
        self.access_token = None
        self.refresh_token = None

    def get_auth_code(self):
        server = http.server.HTTPServer(('localhost', 8080), AuthHandler)
        server.auth_code = None
        
        auth_url = f"{self.AUTH_URL}?response_type=code&client_id={self.client_id}&scope=user.metrics&redirect_uri={self.redirect_uri}&state=withings_auth"
        webbrowser.open(auth_url)
        
        print("Waiting for authorization...")
        server.handle_request()
        auth_code = server.auth_code
        server.server_close()
        return auth_code

    def authenticate(self):
        auth_code = self.get_auth_code()
        if not auth_code:
            return False

        data = {
            "action": "requesttoken",
            "grant_type": "authorization_code",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": auth_code,
            "redirect_uri": self.redirect_uri
        }
        
        response = requests.post(self.TOKEN_URL, data=data)
        if response.status_code == 200:
            auth_data = response.json()
            if auth_data["status"] == 0:
                self.access_token = auth_data["body"]["access_token"]
                self.refresh_token = auth_data["body"]["refresh_token"]
                return True
        return False

    def refresh_access_token(self, refresh_token):
        data = {
            "action": "requesttoken",
            "grant_type": "refresh_token",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": refresh_token
        }
        
        response = requests.post(self.TOKEN_URL, data=data)
        if response.status_code == 200:
            auth_data = response.json()
            if auth_data["status"] == 0:
                self.access_token = auth_data["body"]["access_token"]
                self.refresh_token = auth_data["body"]["refresh_token"]
                return True
        return False

    def get_measurements(self, start_date=None, end_date=None):
        if not self.access_token:
            return None
            
        endpoint = f"{self.API_URL}/measure"
        headers = {"Authorization": f"Bearer {self.access_token}"}
        data = {
            "action": "getmeas",
            "meastypes": "1,6,9,10"
        }
        
        if start_date:
            data["startdate"] = int(datetime.strptime(start_date, "%Y-%m-%d").timestamp())
        if end_date:
            data["enddate"] = int(datetime.strptime(end_date, "%Y-%m-%d").timestamp())
            
        response = requests.post(endpoint, headers=headers, data=data)
        if response.status_code == 200:
            return self._parse_measurements(response.json())
        return None
        
    def _parse_measurements(self, response_data):
        if response_data["status"] != 0:
            return None
            
        measurements_dict = {}
        for group in response_data["body"]["measuregrps"]:
            date = datetime.fromtimestamp(group["date"]).strftime("%Y-%m-%d")
            
            if date not in measurements_dict:
                measurements_dict[date] = {"date": date}
            
            for measure in group["measures"]:
                value = measure["value"] * (10 ** measure["unit"])
                if measure["type"] == 1:
                    measurements_dict[date]["weight"] = int(value * 2.20462)
                elif measure["type"] == 6:
                    measurements_dict[date]["fat_ratio"] = round(value, 1)
                elif measure["type"] == 9:
                    measurements_dict[date]["diastolic_bp"] = value
                elif measure["type"] == 10:
                    measurements_dict[date]["systolic_bp"] = value
                    
        measurements = list(measurements_dict.values())
        return measurements

def get_refresh_token():
    client_id = input("Enter your client ID: ")
    client_secret = input("Enter your client secret: ")
    
    api = WithingsAPI(client_id, client_secret)
    if api.authenticate():
        print("\nAuth successful! Use these tokens in your GitHub Actions:")
        print(f"\nRefresh Token: {api.refresh_token}")
    else:
        print("Authentication failed")

def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--get-token":
        get_refresh_token()
        return

    # GitHub Actions mode
    if os.environ.get("GITHUB_ACTIONS"):
        client_id = os.environ["WITHINGS_CLIENT_ID"]
        client_secret = os.environ["WITHINGS_CLIENT_SECRET"]
        refresh_token = os.environ["WITHINGS_REFRESH_TOKEN"]
        
        api = WithingsAPI(client_id, client_secret)
        if not api.refresh_access_token(refresh_token):
            print("Failed to refresh token")
            sys.exit(1)
            
        date = os.environ.get("date", datetime.now().strftime("%Y-%m-%d"))
        print(f"Fetching data for date: {date}")
        
        # Convert date to Unix timestamp
        start_ts = int(datetime.strptime(date, "%Y-%m-%d").timestamp())
        end_ts = start_ts + 86400  # Add 24 hours
        
        data = {
            "action": "getmeas",
            "meastypes": "1,6,9,10",
            "startdate": start_ts,
            "enddate": end_ts
        }
        print(f"Request data: {data}")
        
        measurements = api.get_measurements(date, date)
        
        if measurements:
            print(f"::set-output name=measurements::{measurements}")
            for m in measurements:
                print(m)
        else:
            print(f"No measurements found for {date}")
            
    # Local mode
    else:
        client_id = "YOUR_CLIENT_ID"
        client_secret = "YOUR_CLIENT_SECRET"
        
        api = WithingsAPI(client_id, client_secret)
        if api.authenticate():
            end_date = datetime.now().strftime("%Y-%m-%d")
            start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
            
            measurements = api.get_measurements(start_date, end_date)
            if measurements:
                print("\nMeasurements for last 30 days:")
                for m in measurements:
                    print(m)
        else:
            print("Authentication failed")

if __name__ == "__main__":
    main()
import requests
from datetime import datetime, timedelta
import os
import sys

class WithingsAPI:
    TOKEN_URL = "https://wbsapi.withings.net/v2/oauth2"
    API_URL = "https://wbsapi.withings.net"

    def __init__(self):
        self.client_id = os.environ["WITHINGS_CLIENT_ID"]
        self.client_secret = os.environ["WITHINGS_CLIENT_SECRET"]
        self.refresh_token = os.environ["WITHINGS_REFRESH_TOKEN"]
        self.access_token = None

    def refresh_access_token(self):
        data = {
            "action": "requesttoken",
            "grant_type": "refresh_token",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": self.refresh_token
        }
        
        response = requests.post(self.TOKEN_URL, data=data)
        if response.status_code == 200:
            auth_data = response.json()
            if auth_data["status"] == 0:
                self.access_token = auth_data["body"]["access_token"]
                return True
        return False

    def get_measurements(self, date):
        if not self.access_token:
            return None
            
        endpoint = f"{self.API_URL}/measure"
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        # Convert date to Unix timestamp
        start_ts = int(datetime.strptime(date, "%Y-%m-%d").timestamp())
        end_ts = start_ts + 86400  # Add 24 hours
        
        data = {
            "action": "getmeas",
            "meastypes": "1,6,9,10",
            "startdate": start_ts,
            "enddate": end_ts
        }
            
        response = requests.post(endpoint, headers=headers, data=data)
        if response.status_code == 200:
            return self._parse_measurements(response.json())
        return None
        
    def _parse_measurements(self, response_data):
        if response_data["status"] != 0:
            return None
            
        measurements = []
        for group in response_data["body"]["measuregrps"]:
            date = datetime.fromtimestamp(group["date"])
            measurement = {"date": date.strftime("%Y-%m-%d %H:%M:%S")}
            
            for measure in group["measures"]:
                value = measure["value"] * (10 ** measure["unit"])
                if measure["type"] == 1:
                    measurement["weight"] = value
                elif measure["type"] == 6:
                    measurement["fat_ratio"] = value
                elif measure["type"] == 9:
                    measurement["diastolic_bp"] = value
                elif measure["type"] == 10:
                    measurement["systolic_bp"] = value
                    
            measurements.append(measurement)
        return measurements

def main():
    # Get date from command line argument or use today
    if len(sys.argv) > 1:
        date = sys.argv[1]
    else:
        date = datetime.now().strftime("%Y-%m-%d")

    api = WithingsAPI()
    
    if api.refresh_access_token():
        measurements = api.get_measurements(date)
        if measurements:
            print(f"::set-output name=measurements::{measurements}")
            for m in measurements:
                print(m)
        else:
            print(f"No measurements found for {date}")
    else:
        print("Authentication failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
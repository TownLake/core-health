import os
import requests
from datetime import datetime
import json
import sys
from typing import Dict, Any

class CloudflareD1:
    def __init__(self, account_id: str, database_id: str, bearer_token: str):
        self.account_id = account_id
        self.database_id = database_id
        self.base_url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/d1/database/{database_id}/query"
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {bearer_token}"
        }

    def insert_withings_data(self, data: Dict[str, Any]) -> Dict:
        query = """
        INSERT INTO withings_data (
            date, collected_at, weight, fat_ratio,
            diastolic_bp, systolic_bp
        ) VALUES (?, ?, ?, ?, ?, ?);
        """
        
        params = [
            data["date"],
            data["collected_at"],
            data.get("weight"),
            data.get("fat_ratio"),
            data.get("diastolic_bp"),
            data.get("systolic_bp")
        ]

        payload = {
            "sql": query,
            "params": params
        }

        response = requests.post(self.base_url, headers=self.headers, json=payload)
        return response.json()

def fetch_withings_data(access_token: str, target_date: str) -> Dict[str, Any]:
    start_ts = int(datetime.strptime(target_date, "%Y-%m-%d").timestamp())
    end_ts = start_ts + 86400  # Add 24 hours

    headers = {"Authorization": f"Bearer {access_token}"}
    endpoint = "https://wbsapi.withings.net/measure"
    
    data = {
        "action": "getmeas",
        "meastypes": "1,6,9,10",
        "startdate": start_ts,
        "enddate": end_ts
    }

    response = requests.post(endpoint, headers=headers, data=data)
    if response.status_code != 200:
        return None

    result = response.json()
    if result["status"] != 0:
        return None

    measurements = {
        "date": target_date,
        "collected_at": datetime.now().isoformat()
    }

    for group in result["body"]["measuregrps"]:
        for measure in group["measures"]:
            value = measure["value"] * (10 ** measure["unit"])
            if measure["type"] == 1:
                measurements["weight"] = int(value * 2.20462)  # Convert to lbs
            elif measure["type"] == 6:
                measurements["fat_ratio"] = round(value, 1)
            elif measure["type"] == 9:
                measurements["diastolic_bp"] = value
            elif measure["type"] == 10:
                measurements["systolic_bp"] = value

    return measurements

def refresh_token(client_id: str, client_secret: str, refresh_token: str) -> str:
    data = {
        "action": "requesttoken",
        "grant_type": "refresh_token",
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token
    }
    
    response = requests.post("https://wbsapi.withings.net/v2/oauth2", data=data)
    if response.status_code == 200:
        result = response.json()
        if result["status"] == 0:
            return result["body"]["access_token"]
    return None

def main():
    account_id = os.getenv('CLOUDFLARE_ACCOUNT_ID')
    database_id = os.getenv('CLOUDFLARE_D1_DB')
    bearer_token = os.getenv('CLOUDFLARE_API_TOKEN')
    withings_client_id = os.getenv('WITHINGS_CLIENT_ID')
    withings_client_secret = os.getenv('WITHINGS_CLIENT_SECRET')
    withings_refresh_token = os.getenv('WITHINGS_REFRESH_TOKEN')
    
    if not all([withings_client_id, withings_client_secret, withings_refresh_token]):
        missing = [var for var, val in {
            'WITHINGS_CLIENT_ID': withings_client_id,
            'WITHINGS_CLIENT_SECRET': withings_client_secret,
            'WITHINGS_REFRESH_TOKEN': withings_refresh_token
        }.items() if not val]
        raise ValueError(f"Missing environment variables: {', '.join(missing)}")

    target_date = sys.argv[1] if len(sys.argv) > 1 else datetime.now().strftime('%Y-%m-%d')

    access_token = refresh_token(withings_client_id, withings_client_secret, withings_refresh_token)
    if not access_token:
        raise ValueError("Failed to refresh access token")

    withings_data = fetch_withings_data(access_token, target_date)
    print("Fetched Withings data:")
    print(json.dumps(withings_data, indent=2))

    if withings_data and all([account_id, database_id, bearer_token]):
        d1_client = CloudflareD1(account_id, database_id, bearer_token)
        result = d1_client.insert_withings_data(withings_data)
        print("D1 insert result:")
        print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
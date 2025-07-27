import os
import requests
from datetime import datetime, timedelta
import json
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

    def insert_oura_data(self, data: Dict[str, Any]) -> Dict:
        query = """
        INSERT INTO oura_data (
            date, collected_at, deep_sleep_minutes,
            sleep_score, bedtime_start_date, bedtime_start_time,
            resting_heart_rate, average_hrv, total_sleep, spo2_avg,
            efficiency, delay, total_calories
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """
        
        # Using .get() for safer dictionary access
        params = [
            data.get("date"),
            data.get("collected_at"),
            data.get("deep_sleep_minutes"),
            data.get("sleep_score"),
            data.get("bedtime_start_date"),
            data.get("bedtime_start_time"),
            data.get("resting_heart_rate"),
            data.get("average_hrv"),
            data.get("total_sleep"),
            data.get("spo2_avg"),
            data.get("efficiency"),
            data.get("delay"),
            data.get("total_calories") # New value
        ]

        payload = {"sql": query, "params": params}
        response = requests.post(self.base_url, headers=self.headers, json=payload)
        response.raise_for_status()
        return response.json()

def fetch_oura_data(token: str, target_date: str) -> Dict[str, Any]:
    headers = {'Authorization': f'Bearer {token}'}
    # This date represents the concluded day for which we want activity data.
    previous_date = (datetime.fromisoformat(target_date).date() - timedelta(days=1)).isoformat()
    
    # Pre-initialize all keys to ensure they exist for the database insert.
    data = {
        'date': target_date,
        'collected_at': datetime.now().isoformat(),
        'sleep_score': None,
        'deep_sleep_minutes': None,
        'bedtime_start_date': None,
        'bedtime_start_time': None,
        'resting_heart_rate': None,
        'average_hrv': None,
        'total_sleep': None,
        'efficiency': None,
        'delay': None,
        'spo2_avg': None,
        'total_calories': None # New field
    }
    
    try:
        response = requests.get(
            'https://api.ouraring.com/v2/usercollection/daily_sleep',
            headers=headers,
            params={'start_date': target_date, 'end_date': target_date}
        )
        response.raise_for_status()
        daily_data = response.json().get('data', [])
        if daily_data:
            data['sleep_score'] = daily_data[0].get('score')
    except Exception as e:
        print(f"Error fetching daily sleep score: {e}")
    
    try:
        response = requests.get(
            'https://api.ouraring.com/v2/usercollection/sleep',
            headers=headers,
            params={'start_date': previous_date, 'end_date': target_date}
        )
        response.raise_for_status()
        sleep_data = response.json().get('data', [])
        if sleep_data:
            target_sessions = [
                s for s in sleep_data 
                if s.get('bedtime_end', '').startswith(target_date)
            ]
            if target_sessions:
                session = target_sessions[0]
                data['deep_sleep_minutes'] = int(session.get('deep_sleep_duration', 0) / 60)
                if session.get('bedtime_start'):
                    dt = datetime.fromisoformat(session['bedtime_start'].replace('Z', '+00:00'))
                    data['bedtime_start_date'] = dt.date().isoformat()
                    data['bedtime_start_time'] = dt.time().isoformat()
                data['resting_heart_rate'] = session.get('lowest_heart_rate')
                data['average_hrv'] = session.get('average_hrv')
                data['total_sleep'] = session.get('total_sleep_duration', 0) / 3600
                data['efficiency'] = session.get('efficiency')
                data['delay'] = int(session.get('latency', 0) / 60)
    except Exception as e:
        print(f"Error fetching sleep data: {e}")
    
    # Fetch total calories from the PREVIOUS day's activity
    try:
        response = requests.get(
            'https://api.ouraring.com/v2/usercollection/daily_activity',
            headers=headers,
            params={'start_date': previous_date, 'end_date': previous_date}
        )
        response.raise_for_status()
        activity_data = response.json().get('data', [])
        if activity_data:
            data['total_calories'] = activity_data[0].get('total_calories')
    except Exception as e:
        print(f"Error fetching daily activity data: {e}")

    try:
        response = requests.get(
            'https://api.ouraring.com/v2/usercollection/daily_spo2',
            headers=headers,
            params={'start_date': target_date, 'end_date': target_date}
        )
        response.raise_for_status()
        spo2_data = response.json().get('data', [])
        if spo2_data:
            data['spo2_avg'] = spo2_data[0].get('spo2_percentage', {}).get('average')
    except Exception as e:
        print(f"Error fetching SPO2 data: {e}")
    
    return data

def main():
    account_id = os.getenv('CLOUDFLARE_ACCOUNT_ID')
    database_id = os.getenv('CLOUDFLARE_D1_DB')
    bearer_token = os.getenv('CLOUDFLARE_API_TOKEN')
    oura_token = os.getenv('OURA_TOKEN')
    
    if not all([account_id, database_id, bearer_token, oura_token]):
        missing = [var for var, val in {
            'CLOUDFLARE_ACCOUNT_ID': account_id,
            'CLOUDFLARE_D1_DB': database_id,
            'CLOUDFLARE_API_TOKEN': bearer_token,
            'OURA_TOKEN': oura_token
        }.items() if not val]
        raise ValueError(f"Missing environment variables: {', '.join(missing)}")

    target_date = os.getenv('TARGET_DATE') or datetime.now().strftime('%Y-%m-%d')

    oura_data = fetch_oura_data(oura_token, target_date)
    print("Fetched Oura data:")
    print(json.dumps(oura_data, indent=2))

    d1_client = CloudflareD1(account_id, database_id, bearer_token)
    try:
        result = d1_client.insert_oura_data(oura_data)
        print("D1 insert result:")
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"Error inserting data into D1: {e}")
        # Optionally, re-raise the exception to fail the GitHub Action
        # raise e

if __name__ == "__main__":
    main()

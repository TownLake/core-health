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
            date, collected_at, deep_sleep_minutes, sleep_score,
            bedtime_start_date, bedtime_start_time, resting_heart_rate,
            average_hrv, total_sleep, spo2_avg
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """
        
        params = [
            data["date"],
            data["collected_at"],
            data.get("deep_sleep_minutes"),
            data.get("sleep_score"),
            data.get("bedtime_start_date"),
            data.get("bedtime_start_time"),
            data.get("resting_heart_rate"),
            data.get("average_hrv"),
            data.get("total_sleep"),
            data.get("spo2_avg")
        ]

        response = requests.post(self.base_url, headers=self.headers, json={"sql": query, "params": params})
        return response.json()

def fetch_oura_data(token: str, target_date: str) -> Dict[str, Any]:
    headers = {'Authorization': f'Bearer {token}'}
    end_date = target_date
    start_date = (datetime.fromisoformat(target_date).date() - timedelta(days=1)).isoformat()
    
    data = {
        'date': target_date,
        'collected_at': datetime.now().isoformat()
    }
    
    try:
        # Daily sleep data
        response = requests.get(
            'https://api.ouraring.com/v2/usercollection/daily_sleep',
            headers=headers,
            params={'start_date': target_date, 'end_date': target_date}
        )
        response.raise_for_status()
        daily_data = response.json().get('data', [])
        if daily_data:
            data['deep_sleep_minutes'] = daily_data[0]['contributors'].get('deep_sleep')
            data['sleep_score'] = daily_data[0].get('score')
    except Exception as e:
        print(f"Error fetching daily sleep data: {e}")
    
    try:
        # Detailed sleep data
        response = requests.get(
            'https://api.ouraring.com/v2/usercollection/sleep',
            headers=headers,
            params={'start_date': start_date, 'end_date': end_date}
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
                if session.get('bedtime_start'):
                    dt = datetime.fromisoformat(session['bedtime_start'].replace('Z', '+00:00'))
                    data['bedtime_start_date'] = dt.date().isoformat()
                    data['bedtime_start_time'] = dt.time().isoformat()
                data['resting_heart_rate'] = session.get('lowest_heart_rate')
                data['average_hrv'] = session.get('average_hrv')
                data['total_sleep'] = session.get('total_sleep_duration', 0) / 3600
    except Exception as e:
        print(f"Error fetching detailed sleep data: {e}")
    
    try:
        # SPO2 data
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
    required_env_vars = {
        'OURA_TOKEN': 'Oura API token',
        'CLOUDFLARE_ACCOUNT_ID': 'Cloudflare account ID',
        'CLOUDFLARE_D1_DB': 'D1 database ID',
        'CLOUDFLARE_API_TOKEN': 'Cloudflare API token'
    }

    for var, description in required_env_vars.items():
        if not os.getenv(var):
            raise ValueError(f"Missing {description}. Set the {var} environment variable.")

    target_date = os.getenv('TARGET_DATE', datetime.now().strftime('%Y-%m-%d'))

    try:
        oura_data = fetch_oura_data(os.getenv('OURA_TOKEN'), target_date)
        print("Fetched Oura data:")
        print(json.dumps(oura_data, indent=2))

        d1_client = CloudflareD1(
            os.getenv('CLOUDFLARE_ACCOUNT_ID'),
            os.getenv('CLOUDFLARE_D1_DB'),
            os.getenv('CLOUDFLARE_API_TOKEN')
        )
        
        result = d1_client.insert_oura_data(oura_data)
        print("D1 insert result:")
        print(json.dumps(result, indent=2))

    except Exception as e:
        print(f"Error: {e}")
        exit(1)

if __name__ == "__main__":
    main()

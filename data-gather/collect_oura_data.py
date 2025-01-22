import requests
import json
import os
import subprocess
from datetime import datetime, date, timedelta, UTC  # Added UTC import

class OuraDataFetcher:
    def __init__(self, token):
        self.token = token
        self.headers = {
            'Authorization': f'Bearer {token}'
        }
        self.base_url = 'https://api.ouraring.com/v2/usercollection'
        
    def get_date_range(self):
        target_date = date.today()
        start_date = (target_date - timedelta(days=1)).strftime('%Y-%m-%d')
        end_date = (target_date + timedelta(days=1)).strftime('%Y-%m-%d')
        return start_date, end_date, target_date.strftime('%Y-%m-%d')
        
    def fetch_sleep_data(self):
        start_date, end_date, _ = self.get_date_range()
        url = f'{self.base_url}/sleep'
        params = {
            'start_date': start_date,
            'end_date': end_date
        }
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        return response.json()
        
    def fetch_cardio_age(self):
        _, _, target_date = self.get_date_range()
        url = f'{self.base_url}/daily_cardiovascular_age'
        params = {
            'start_date': target_date,
            'end_date': target_date
        }
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        return response.json()
        
    def fetch_spo2(self):
        _, _, target_date = self.get_date_range()
        url = f'{self.base_url}/daily_spo2'
        params = {
            'start_date': target_date,
            'end_date': target_date
        }
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        return response.json()

def find_relevant_sleep_session(data, target_date):
    """Find the most relevant sleep session for the target date."""
    items = data.get('data', [])
    if not items:
        print(f"No sleep sessions found for {target_date}")
        return {}
        
    target_sessions = [item for item in items if item.get('day') == target_date]
    
    if target_sessions:
        return max(target_sessions, 
                  key=lambda x: x.get('total_sleep_duration', 0))
    
    target_sessions = [
        item for item in items 
        if item.get('bedtime_end', '').startswith(target_date)
    ]
    
    if target_sessions:
        return max(target_sessions, 
                  key=lambda x: x.get('total_sleep_duration', 0))
    
    return {}

def store_in_workers_kv(namespace_id, data):
    """Store data in Workers KV using wrangler."""
    try:
        print("Getting existing data from Workers KV...")
        result = subprocess.run(
            ['wrangler', 'kv:key', 'get', '--namespace-id', namespace_id, 'oura_data'],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0 and result.stdout:
            existing_data = json.loads(result.stdout)
            print("Successfully retrieved existing data")
        else:
            print("No existing data found, starting fresh")
            existing_data = {}

        # Update with new data
        today = date.today().strftime('%Y-%m-%d')
        existing_data[today] = data

        # Write to temporary file
        print("Writing updated data to temporary file...")
        with open('temp_oura_data.json', 'w') as f:
            json.dump(existing_data, f)

        # Store in Workers KV
        print("Storing in Workers KV...")
        with open('temp_oura_data.json', 'r') as f:
            data_content = f.read()
            
        result = subprocess.run(
            ['wrangler', 'kv:key', 'put',
             '--namespace-id', namespace_id,
             'oura_data', data_content],
            capture_output=True,
            text=True
        )

        if result.stderr:
            print(f"Warning - stderr output: {result.stderr}")

        # Clean up
        os.remove('temp_oura_data.json')
        
        if result.returncode != 0:
            raise Exception(f"Wrangler command failed with return code {result.returncode}")
            
        print("Successfully stored data in Workers KV")
        return True

    except Exception as e:
        print(f"Error storing data in Workers KV: {str(e)}")
        return False

def main():
    try:
        print("Starting Oura data collection...")
        
        token = os.environ['OURA_TOKEN']
        namespace_id = os.environ['WORKERS_KV_NAMESPACE_ID']

        fetcher = OuraDataFetcher(token)
        _, _, target_date = fetcher.get_date_range()

        print("Fetching data from Oura API...")
        sleep_data = fetcher.fetch_sleep_data()
        cardio_data = fetcher.fetch_cardio_age()
        spo2_data = fetcher.fetch_spo2()

        print("Processing data...")
        sleep_info = find_relevant_sleep_session(sleep_data, target_date)
        cardio_info = cardio_data.get('data', [{}])[0]
        spo2_info = spo2_data.get('data', [{}])[0]

        spo2_percentage = spo2_info.get('spo2_percentage', {})
        spo2_avg = spo2_percentage.get('average') if isinstance(spo2_percentage, dict) else None

        daily_data = {
            'date': sleep_info.get('day'),
            'sleep': {
                'deep_sleep_minutes': round(sleep_info.get('deep_sleep_duration', 0) / 60),
                'sleep_score': sleep_info.get('sleep_score'),
                'bedtime_start': sleep_info.get('bedtime_start'),
                'total_sleep_minutes': round(sleep_info.get('total_sleep_duration', 0) / 60),
                'resting_heart_rate': sleep_info.get('lowest_heart_rate'),
                'average_hrv': sleep_info.get('average_hrv')
            },
            'health': {
                'spo2_avg': spo2_avg,
                'cardio_age': cardio_info.get('vascular_age')
            },
            'metadata': {
                'collected_at': datetime.now(UTC).isoformat()  # Updated to use timezone-aware datetime
            }
        }

        print("Storing data...")
        success = store_in_workers_kv(namespace_id, daily_data)
        if not success:
            raise Exception("Failed to store data in Workers KV")

        print("Data collection completed successfully")

    except Exception as e:
        print(f"Error: {str(e)}")
        raise e

if __name__ == "__main__":
    main()
import requests
import json
import os
import subprocess
from datetime import datetime, date, timedelta, UTC

class OuraDataFetcher:
    def __init__(self, token):
        self.token = token
        self.headers = {
            'Authorization': f'Bearer {token}'
        }
        self.base_url = 'https://api.ouraring.com/v2/usercollection'
        
    def get_date_range(self, target_date=None):
        if target_date is None:
            target_date = date.today()
        elif isinstance(target_date, str):
            target_date = datetime.strptime(target_date, '%Y-%m-%d').date()
            
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
    print(f"Found {len(items)} sleep sessions")
    for item in items:
        print(f"Sleep session: date={item.get('day')}, start={item.get('bedtime_start')}, end={item.get('bedtime_end')}")
    
    if not items:
        print(f"No sleep sessions found for {target_date}")
        return {}
        
    target_sessions = [item for item in items if item.get('day') == target_date]
    
    if target_sessions:
        return max(target_sessions, 
                  key=lambda x: x.get('total_sleep_duration', 0))
    
    target_sessions = [
        item for item in items 
        if item.get('bedtime_end') and str(item.get('bedtime_end')).startswith(target_date)
    ]
    
    if target_sessions:
        return max(target_sessions, 
                  key=lambda x: x.get('total_sleep_duration', 0))
    
    return {}

def store_in_workers_kv(namespace_id, data, date_key=None):
    """Store data in Workers KV using wrangler.
    
    Args:
        namespace_id (str): The Workers KV namespace ID
        data (dict): The data to store
        date_key (str, optional): The date key to use. If None, uses today's date.
    """
    try:
        print("Getting existing data from Workers KV...")
        # First, check if wrangler is properly configured
        wrangler_check = subprocess.run(['wrangler', '--version'], capture_output=True, text=True)
        print(f"Wrangler version: {wrangler_check.stdout.strip()}")
        
        # Try to get existing data
        get_result = subprocess.run(
            ['wrangler', 'kv:key', 'get', '--namespace-id', namespace_id, 'oura_data'],
            capture_output=True,
            text=True
        )
        
        print(f"Get command stdout: {get_result.stdout}")
        print(f"Get command stderr: {get_result.stderr}")
        print(f"Get command return code: {get_result.returncode}")

        if get_result.returncode == 0 and get_result.stdout.strip():
            try:
                existing_data = json.loads(get_result.stdout)
                print("Successfully parsed existing data")
            except json.JSONDecodeError as e:
                print(f"Error parsing existing data: {e}")
                print(f"Raw data received: {get_result.stdout[:200]}...")  # Print first 200 chars
                existing_data = {}
        else:
            print("No existing data found, starting fresh")
            existing_data = {}

        # Update with new data
        date_key = date_key or date.today().strftime('%Y-%m-%d')
        
        if date_key in existing_data:
            print(f"Warning: Data already exists for {date_key}")
            print("Existing data:", json.dumps(existing_data[date_key], indent=2))
            print("New data:", json.dumps(data, indent=2))
            # Merge the data, preferring new values only for non-None fields
            merged_data = existing_data[date_key].copy()
            for category in ['sleep', 'health']:
                if category in data and category in merged_data:
                    for key, value in data[category].items():
                        if value is not None:
                            merged_data[category][key] = value
            data = merged_data
            print("Merged data:", json.dumps(data, indent=2))
            
        existing_data[date_key] = data

        # Write to temporary file
        print("Writing updated data to temporary file...")
        with open('temp_oura_data.json', 'w') as f:
            json.dump(existing_data, f)

        # Store in Workers KV
        print("Storing in Workers KV...")
        
        # Read the file content
        with open('temp_oura_data.json', 'r') as f:
            file_content = f.read()
            print(f"File content length: {len(file_content)} characters")
            print(f"First 100 characters of content: {file_content[:100]}...")

        # Store using wrangler
        put_result = subprocess.run(
            ['wrangler', 'kv:key', 'put',
             '--namespace-id', namespace_id,
             'oura_data', file_content],
            capture_output=True,
            text=True
        )

        print(f"Put command stdout: {put_result.stdout}")
        print(f"Put command stderr: {put_result.stderr}")
        print(f"Put command return code: {put_result.returncode}")

        # Clean up
        os.remove('temp_oura_data.json')
        
        if put_result.returncode != 0:
            raise Exception(f"Wrangler command failed with return code {put_result.returncode}")
            
        print("Successfully stored data in Workers KV")
        return True

    except Exception as e:
        print(f"Error storing data in Workers KV: {str(e)}")
        print(f"Exception type: {type(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return False

def main(target_date=None):
    try:
        print(f"Starting Oura data collection for date: {target_date or 'today'}...")
        
        token = os.environ['OURA_TOKEN']
        namespace_id = os.environ['WORKERS_KV_NAMESPACE_ID']

        print(f"Using namespace ID: {namespace_id}")

        fetcher = OuraDataFetcher(token)
        _, _, date_key = fetcher.get_date_range(target_date)

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
                'collected_at': datetime.now(UTC).isoformat()
            }
        }

        print("Storing data...")
        success = store_in_workers_kv(namespace_id, daily_data, date_key)
        if not success:
            raise Exception("Failed to store data in Workers KV")

        print("Data collection completed successfully")

    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise e

if __name__ == "__main__":
    main()
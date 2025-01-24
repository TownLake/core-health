import os
import sys
import json
import requests
from datetime import datetime, date, timedelta, UTC

class OuraClient:
    def __init__(self, token):
        self.token = token
        self.headers = {'Authorization': f'Bearer {token}'}
        self.base_url = 'https://api.ouraring.com/v2/usercollection'

    def get_date_range(self, target_date=None):
        if target_date is None:
            target_date = date.today()
        elif isinstance(target_date, str):
            target_date = datetime.strptime(target_date, '%Y-%m-%d').date()
        
        return target_date.strftime('%Y-%m-%d')

    def fetch_data(self, endpoint, target_date):
        url = f'{self.base_url}/{endpoint}'
        params = {
            'start_date': target_date,
            'end_date': target_date
        }
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        return response.json()

    def get_daily_data(self, target_date):
        # Fetch all required data
        sleep_data = self.fetch_data('sleep', target_date)
        daily_sleep = self.fetch_data('daily_sleep', target_date)
        cardio_data = self.fetch_data('daily_cardiovascular_age', target_date)
        spo2_data = self.fetch_data('daily_spo2', target_date)

        # Process sleep data
        sleep_sessions = sleep_data.get('data', [])
        if not sleep_sessions:
            return None

        # Get the main sleep session (usually the longest one)
        main_sleep = max(
            [s for s in sleep_sessions if s.get('day') == target_date],
            key=lambda x: x.get('total_sleep_duration', 0),
            default=None
        )

        if not main_sleep:
            return None

        # Get sleep score from daily_sleep endpoint
        sleep_score = next(
            (item['score'] for item in daily_sleep.get('data', [])
             if item.get('day') == target_date),
            None
        )

        # Process SpO2 data
        spo2_info = next(
            (item for item in spo2_data.get('data', [])
             if item.get('day') == target_date),
            {}
        )
        spo2_percentage = spo2_info.get('spo2_percentage', {})
        spo2_avg = (spo2_percentage.get('average') 
                   if isinstance(spo2_percentage, dict) else None)

        # Process cardio age data
        cardio_info = next(
            (item for item in cardio_data.get('data', [])
             if item.get('day') == target_date),
            {}
        )

        # Format bedtime
        bedtime_start = main_sleep.get('bedtime_start')
        if bedtime_start:
            dt = datetime.fromisoformat(bedtime_start.replace('Z', '+00:00'))
            bedtime_date = dt.strftime('%Y-%m-%d')
            bedtime_time = dt.strftime('%H:%M:%S')
        else:
            bedtime_date = bedtime_time = None

        # Format total sleep
        total_sleep_minutes = round(main_sleep.get('total_sleep_duration', 0) / 60)
        total_sleep = (f"{total_sleep_minutes // 60:02d}:"
                      f"{total_sleep_minutes % 60:02d}"
                      if total_sleep_minutes else None)

        return {
            'date': target_date,
            'deep_sleep_minutes': round(main_sleep.get('deep_sleep_duration', 0) / 60),
            'sleep_score': sleep_score,
            'bedtime_start_date': bedtime_date,
            'bedtime_start_time': bedtime_time,
            'total_sleep': total_sleep,
            'resting_heart_rate': main_sleep.get('lowest_heart_rate'),
            'average_hrv': main_sleep.get('average_hrv'),
            'spo2_avg': spo2_avg,
            'cardio_age': cardio_info.get('vascular_age'),
            'collected_at': datetime.now(UTC).isoformat()
        }

class CloudflareD1:
    def __init__(self, account_id, api_token):
        self.account_id = account_id
        self.headers = {
            'Authorization': f'Bearer {api_token}',
            'Content-Type': 'application/json'
        }
        self.base_url = f'https://api.cloudflare.com/client/v4/accounts/{account_id}/d1/database/sam_health_data'

    def insert_data(self, data):
        if not data:
            print("No data to insert")
            return False

        # Construct SQL query with parameterized values
        placeholders = ', '.join(['?'] * len(data))
        columns = ', '.join(data.keys())
        
        query = f"""
            INSERT INTO oura_data ({columns})
            VALUES ({placeholders})
        """

        # Make the API request
        url = f'{self.base_url}/query'
        payload = {
            'sql': query,
            'params': list(data.values())
        }

        response = requests.post(url, headers=self.headers, json=payload)
        
        if response.status_code == 200:
            print("Successfully inserted data into D1")
            return True
        else:
            print(f"Error inserting data: {response.status_code}")
            print(response.text)
            return False

def main(target_date=None):
    # Get environment variables
    oura_token = os.environ['OURA_TOKEN']
    cf_account_id = os.environ['CLOUDFLARE_ACCOUNT_ID']
    cf_api_token = os.environ['CLOUDFLARE_API_TOKEN']

    try:
        # Initialize clients
        oura = OuraClient(oura_token)
        d1 = CloudflareD1(cf_account_id, cf_api_token)

        # Get and format target date
        formatted_date = oura.get_date_range(target_date)
        print(f"Fetching data for date: {formatted_date}")

        # Fetch and process data
        daily_data = oura.get_daily_data(formatted_date)
        if not daily_data:
            print(f"No data found for {formatted_date}")
            return

        # Store data in D1
        success = d1.insert_data(daily_data)
        if not success:
            raise Exception("Failed to store data in D1")

        print("Data collection and storage completed successfully")

    except Exception as e:
        print(f"Error: {str(e)}")
        raise e

if __name__ == "__main__":
    target_date = sys.argv[1] if len(sys.argv) > 1 else None
    main(target_date)

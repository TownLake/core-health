import requests
import sys
import json
from datetime import datetime

def fetch_oura_data(date):
    url = 'https://api.ouraring.com/v2/usercollection/daily_sleep'
    params = {
        'start_date': date,
        'end_date': date
    }
    headers = {
        'Authorization': f'Bearer {OURA_TOKEN}'
    }

    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()  # Will raise an HTTPError for bad responses

        sleep_data = response.json()
        
        # Check if 'data' key exists and is not empty
        if 'data' in sleep_data and len(sleep_data['data']) > 0:
            sleep_record = sleep_data['data'][0]
            return {
                'date': sleep_record['day'],
                'deep_sleep_minutes': sleep_record['contributors']['deep_sleep'],
                'sleep_score': sleep_record['score'],
                'bedtime_start_date': sleep_record.get('bedtime_start', '').split()[0],  # Extract date
                'bedtime_start_time': sleep_record.get('bedtime_start', '').split()[1],  # Extract time
                'total_sleep': sleep_record['contributors']['total_sleep'],
                'resting_heart_rate': sleep_record.get('heart_rate', {}).get('lowest_heart_rate', 0),
                'average_hrv': sleep_record.get('hrv', {}).get('average', 0),
                'spo2_avg': sleep_record.get('spo2_percentage', {}).get('average', 0),
                'cardio_age': sleep_record.get('cardio_age', 0),
                'collected_at': datetime.now().isoformat()
            }
        else:
            print(f"No sleep data found for {date}. Response: {json.dumps(sleep_data, indent=2)}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"Error fetching Oura data: {e}")
        return None

def main(date=None):
    if not date:
        date = datetime.now().strftime('%Y-%m-%d')  # Default to today's date

    print(f"Fetching Oura data for {date}...")

    data = fetch_oura_data(date)
    
    if data:
        print(f"Captured data: {json.dumps(data, indent=2)}")
        # Add logic to insert into Cloudflare D1 DB (not shown here)
    else:
        print(f"No data collected for {date}")

if __name__ == "__main__":
    # If the script is triggered manually with a date, use that date
    main(sys.argv[1] if len(sys.argv) > 1 else None)

import requests
import os
import json
from datetime import datetime, timedelta
import sys

def fetch_oura_data(date):
    oura_token = os.environ['OURA_TOKEN']
    headers = {'Authorization': f'Bearer {oura_token}'}
    
    # Fetch all required data
    responses = {
        'sleep': requests.get(
            'https://api.ouraring.com/v2/usercollection/sleep',
            headers=headers,
            params={'start_date': date, 'end_date': date}
        ).json(),
        'daily_sleep': requests.get(
            'https://api.ouraring.com/v2/usercollection/daily_sleep',
            headers=headers,
            params={'start_date': date, 'end_date': date}
        ).json(),
        'spo2': requests.get(
            'https://api.ouraring.com/v2/usercollection/daily_spo2',
            headers=headers,
            params={'start_date': date, 'end_date': date}
        ).json(),
        'cardio': requests.get(
            'https://api.ouraring.com/v2/usercollection/daily_cardiovascular_age',
            headers=headers,
            params={'start_date': date, 'end_date': date}
        ).json()
    }
    
    # Print raw responses for debugging
    print("Raw API Responses:")
    print(json.dumps(responses, indent=2))
    
    # Extract data from first records
    sleep_data = responses['sleep']['data'][0] if responses['sleep'].get('data') and responses['sleep']['data'] else {}
    daily_sleep = responses['daily_sleep']['data'][0] if responses['daily_sleep'].get('data') and responses['daily_sleep']['data'] else {}
    spo2_data = responses['spo2']['data'][0] if responses['spo2'].get('data') and responses['spo2']['data'] else {}
    cardio_data = responses['cardio']['data'][0] if responses['cardio'].get('data') and responses['cardio']['data'] else {}
    
    bedtime_start = sleep_data.get('bedtime_start', '')
    bedtime_date = bedtime_start.split('T')[0] if 'T' in bedtime_start else None
    bedtime_time = bedtime_start.split('T')[1] if 'T' in bedtime_start else None
    
    formatted_data = {
        'date': date,
        'deep_sleep_minutes': int(sleep_data.get('deep_sleep_duration', 0) / 60),
        'sleep_score': daily_sleep.get('score', 0),
        'bedtime_start_date': bedtime_date,
        'bedtime_start_time': bedtime_time,
        'total_sleep': str(timedelta(seconds=sleep_data.get('total_sleep_duration', 0))),
        'resting_heart_rate': sleep_data.get('lowest_heart_rate', 0),
        'average_hrv': sleep_data.get('average_hrv', 0),
        'spo2_avg': spo2_data.get('spo2_percentage', {}).get('average', 0),
        'cardio_age': cardio_data.get('vascular_age', 0)
    }
    
    print("\nFormatted Data:")
    print(json.dumps(formatted_data, indent=2))
    return formatted_data

def store_in_d1(data):
    account_id = os.environ['CLOUDFLARE_ACCOUNT_ID']
    api_token = os.environ['CLOUDFLARE_API_TOKEN']
    
    headers = {
        'Authorization': f'Bearer {api_token}',
        'Content-Type': 'application/json'
    }
    
    query = """
    INSERT INTO oura_data (
        date, deep_sleep_minutes, sleep_score, bedtime_start_date,
        bedtime_start_time, total_sleep, resting_heart_rate,
        average_hrv, spo2_avg, cardio_age
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    
    values = [
        data['date'], data['deep_sleep_minutes'], data['sleep_score'],
        data['bedtime_start_date'], data['bedtime_start_time'], data['total_sleep'],
        data['resting_heart_rate'], data['average_hrv'], data['spo2_avg'],
        data['cardio_age']
    ]
    
    payload = {
        'sql': query,
        'params': values
    }
    
    response = requests.post(
        f'https://api.cloudflare.com/client/v4/accounts/{account_id}/d1/database/sam_health_data/query',
        headers=headers,
        json=payload
    )
    
    print("\nD1 Storage Response:")
    print(json.dumps(response.json(), indent=2))

if __name__ == "__main__":
    date = sys.argv[1] if len(sys.argv) > 1 else datetime.now().strftime('%Y-%m-%d')
    data = fetch_oura_data(date)
    store_in_d1(data)

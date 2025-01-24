import requests
import sqlite3
import sys
import json
from datetime import datetime

# Oura API endpoints
SLEEP_API_URL = 'https://api.ouraring.com/v2/usercollection/sleep'
SLEEP_SCORE_API_URL = 'https://api.ouraring.com/v2/usercollection/daily_sleep'
SPO2_API_URL = 'https://api.ouraring.com/v2/usercollection/daily_spo2'
CARDIO_API_URL = 'https://api.ouraring.com/v2/usercollection/daily_cardiovascular_age'

# Cloudflare D1 Database Setup
DB_FILE = 'd1_database.db'  # Local SQLite file (Cloudflare D1 is compatible with SQLite)

def fetch_oura_data(date=None):
    headers = {
        'Authorization': f'Bearer {sys.argv[1]}',  # OURA_TOKEN passed as the first argument
    }

    params = {
        'start_date': date or datetime.now().strftime('%Y-%m-%d'),
        'end_date': date or datetime.now().strftime('%Y-%m-%d'),
    }

    # Make API calls to Oura API
    sleep_response = requests.get(SLEEP_API_URL, headers=headers, params=params)
    sleep_score_response = requests.get(SLEEP_SCORE_API_URL, headers=headers, params=params)
    spo2_response = requests.get(SPO2_API_URL, headers=headers, params=params)
    cardio_response = requests.get(CARDIO_API_URL, headers=headers, params=params)

    # Parse the responses
    sleep_data = sleep_response.json()
    sleep_score_data = sleep_score_response.json()
    spo2_data = spo2_response.json()
    cardio_data = cardio_response.json()

    return {
        'date': sleep_data['data'][0]['day'],
        'deep_sleep_minutes': sleep_data['data'][0]['contributors']['deep_sleep'],
        'sleep_score': sleep_score_data['data'][0]['score'],
        'bedtime_start_date': sleep_data['data'][0]['bedtime_start'].split('T')[0],  # Date part
        'bedtime_start_time': sleep_data['data'][0]['bedtime_start'].split('T')[1],  # Time part
        'total_sleep': sleep_score_data['data'][0]['contributors']['total_sleep'],
        'resting_heart_rate': sleep_data['data'][0]['lowest_heart_rate'],
        'average_hrv': sleep_data['data'][0]['hrv']['items'][0],
        'spo2_avg': spo2_data['data'][0]['spo2_percentage']['average'],
        'cardio_age': cardio_data['data'][0]['vascular_age'],
        'collected_at': datetime.now().isoformat(),
    }

def insert_data_to_d1(data):
    conn = sqlite3.connect(DB_FILE)  # Connect to Cloudflare D1 database (local SQLite as placeholder)
    cursor = conn.cursor()

    cursor.execute('''
        INSERT INTO oura_data (
            date, deep_sleep_minutes, sleep_score, bedtime_start_date, bedtime_start_time,
            total_sleep, resting_heart_rate, average_hrv, spo2_avg, cardio_age, collected_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (data['date'], data['deep_sleep_minutes'], data['sleep_score'],
          data['bedtime_start_date'], data['bedtime_start_time'], data['total_sleep'],
          data['resting_heart_rate'], data['average_hrv'], data['spo2_avg'], data['cardio_age'], data['collected_at']))

    conn.commit()
    conn.close()

def main(date=None):
    # Fetch Oura data
    data = fetch_oura_data(date)
    
    # Log the data to GitHub Actions console
    print(f"Collected Data: {json.dumps(data, indent=4)}")

    # Insert data into Cloudflare D1
    insert_data_to_d1(data)
    print(f"Data inserted successfully for date {data['date']}.")

if __name__ == '__main__':
    if len(sys.argv) > 1:
        main(sys.argv[2])  # Manual date input if provided
    else:
        main()

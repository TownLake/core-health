import os
import requests
from datetime import datetime, timedelta
import json

def fetch_oura_data(token, target_date):
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
        data['error_daily_sleep'] = str(e)
    
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
        data['error_detailed_sleep'] = str(e)
    
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
        data['error_spo2'] = str(e)

    return data

if __name__ == '__main__':
    # Read token from environment variables
    token = os.getenv('OURA_TOKEN')
    if not token:
        raise ValueError("Oura API token is not set. Set it using the OURA_API_TOKEN environment variable.")
    
    # Get the target date
    target_date = os.getenv('TARGET_DATE', datetime.now().strftime('%Y-%m-%d'))
    
    try:
        # Fetch data
        result = fetch_oura_data(token, target_date)
        
        # Print the fetched data for GitHub Action logs
        print("Fetched Oura data:")
        print(json.dumps(result, indent=2))
        
        # Save the data to a file
        output_file = 'oura_data.json'
        with open(output_file, 'w') as f:
            json.dump(result, f, indent=2)
        print(f"Data successfully written to {output_file}")
    except Exception as e:
        print(f"Error: {e}")
        exit(1)

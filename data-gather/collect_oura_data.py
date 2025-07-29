import os
import requests
from datetime import datetime, timedelta
import json
from typing import Dict, Any, Optional

# --- HELPER FUNCTIONS FOR FETCHING OURA DATA ---

def fetch_sleep_data(token: str, sleep_date: str) -> Dict[str, Any]:
    """
    Fetches all sleep-related data for a specific night.
    The 'sleep_date' is the date the sleep period *ends*.
    """
    headers = {'Authorization': f'Bearer {token}'}
    data = {}

    # --- 1. Get Daily Sleep Score (Summary) ---
    try:
        response = requests.get(
            'https://api.ouraring.com/v2/usercollection/daily_sleep',
            headers=headers,
            params={'start_date': sleep_date, 'end_date': sleep_date}
        )
        response.raise_for_status()
        daily_data = response.json().get('data', [])
        if daily_data:
            data['sleep_score'] = daily_data[0].get('score')
    except Exception as e:
        print(f"Error fetching daily sleep score: {e}")

    # --- 2. Get Detailed Sleep Session Data ---
    try:
        session_start_date = (datetime.fromisoformat(sleep_date).date() - timedelta(days=1)).isoformat()
        response = requests.get(
            'https://api.ouraring.com/v2/usercollection/sleep',
            headers=headers,
            params={'start_date': session_start_date, 'end_date': sleep_date}
        )
        response.raise_for_status()
        sleep_data = response.json().get('data', [])
        main_session = next((s for s in sleep_data if s.get('day') == sleep_date), None)
        if main_session:
            # --- SCHEMA FIXES ARE HERE ---
            data['deep_sleep_minutes'] = int(main_session.get('deep_sleep_duration', 0) / 60)
            data['total_sleep'] = main_session.get('total_sleep_duration', 0) / 3600 # Changed key to match schema
            data['delay'] = int(main_session.get('latency', 0) / 60) # Changed key to match schema
            data['resting_heart_rate'] = main_session.get('lowest_heart_rate')
            data['average_hrv'] = main_session.get('average_hrv')
            data['efficiency'] = main_session.get('efficiency')
            if main_session.get('bedtime_start'):
                dt = datetime.fromisoformat(main_session['bedtime_start'].replace('Z', '+00:00'))
                data['bedtime_start_date'] = dt.date().isoformat()
                data['bedtime_start_time'] = dt.time().isoformat()
    except Exception as e:
        print(f"Error fetching detailed sleep data: {e}")
        
    # --- 3. Get Daily SpO2 Data ---
    try:
        response = requests.get(
            'https://api.ouraring.com/v2/usercollection/daily_spo2',
            headers=headers,
            params={'start_date': sleep_date, 'end_date': sleep_date}
        )
        response.raise_for_status()
        spo2_data = response.json().get('data', [])
        if spo2_data and spo2_data[0].get('spo2_percentage'):
            data['spo2_avg'] = spo2_data[0]['spo2_percentage'].get('average')
    except Exception as e:
        print(f"Error fetching SPO2 data: {e}")

    return data


def fetch_activity_data(token: str, activity_date: str) -> Dict[str, Any]:
    """
    Fetches activity-related data for a specific day using the more robust multi-day fetch.
    """
    headers = {'Authorization': f'Bearer {token}'}
    data = {}

    try:
        # --- ACTIVITY FIX: Using your original, more robust logic ---
        # Fetch a 3-day window to ensure the data for the target day is available.
        activity_date_obj = datetime.fromisoformat(activity_date).date()
        start_range = (activity_date_obj - timedelta(days=1)).isoformat()
        end_range = (activity_date_obj + timedelta(days=1)).isoformat()
        
        response = requests.get(
            'https://api.ouraring.com/v2/usercollection/daily_activity',
            headers=headers,
            params={'start_date': start_range, 'end_date': end_range}
        )
        response.raise_for_status()
        activity_data = response.json().get('data', [])
        
        # Find the specific day's data within the response
        target_day_data = next((item for item in activity_data if item.get('day') == activity_date), None)
        
        if target_day_data:
            data['total_calories'] = target_day_data.get('total_calories')
    except Exception as e:
        print(f"Error fetching daily activity data: {e}")
        
    return data

# --- REFACTORED CLOUDFLARE D1 CLASS (Unchanged) ---

class CloudflareD1:
    def __init__(self, account_id: str, database_id: str, bearer_token: str):
        self.base_url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/d1/database/{database_id}/query"
        self.headers = {"Authorization": f"Bearer {bearer_token}"}

    def upsert_oura_data(self, date: str, data: Dict[str, Any]) -> Optional[Dict]:
        if not data:
            print(f"No data provided to upsert for date: {date}")
            return None
        valid_data = {k: v for k, v in data.items() if v is not None}
        if not valid_data:
            print(f"All data was None for date: {date}, skipping upsert.")
            return None
        columns = ", ".join(valid_data.keys())
        placeholders = ", ".join(["?"] * len(valid_data))
        updates = ", ".join([f"{key} = excluded.{key}" for key in valid_data.keys()])
        query = f"""
        INSERT INTO oura_data (date, {columns})
        VALUES (?, {placeholders})
        ON CONFLICT(date) DO UPDATE SET {updates};
        """
        params = [date] + list(valid_data.values())
        try:
            response = requests.post(self.base_url, headers=self.headers, json={"sql": query, "params": params})
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            print(f"D1 API Error: {e.response.text}")
            raise

# --- MAIN EXECUTION BLOCK (Now adds 'collected_at') ---

def main():
    account_id = os.getenv('CLOUDFLARE_ACCOUNT_ID')
    database_id = os.getenv('CLOUDFLARE_D1_DB')
    bearer_token = os.getenv('CLOUDFLARE_API_TOKEN')
    oura_token = os.getenv('OURA_TOKEN')

    if not all([account_id, database_id, bearer_token, oura_token]):
        raise ValueError("One or more required environment variables are missing.")

    d1_client = CloudflareD1(account_id, database_id, bearer_token)

    today_date_str = datetime.now().date().isoformat()
    yesterday_date_str = (datetime.now().date() - timedelta(days=1)).isoformat()
    
    # --- Step 1: Fetch and write YESTERDAY's activity data ---
    print(f"--- Fetching activity data for {yesterday_date_str} ---")
    activity_data = fetch_activity_data(oura_token, yesterday_date_str)
    
    if activity_data:
        activity_data['collected_at'] = datetime.now().isoformat()
        print("Fetched activity data:")
        print(json.dumps(activity_data, indent=2))
        try:
            result = d1_client.upsert_oura_data(yesterday_date_str, activity_data)
            print(f"D1 upsert result for {yesterday_date_str}:")
            print(json.dumps(result, indent=2))
        except Exception as e:
            print(f"Error inserting activity data into D1: {e}")
    else:
        print("No activity data found.")

    # --- Step 2: Fetch and write TODAY's sleep data ---
    print(f"\n--- Fetching sleep data for night ending on {today_date_str} ---")
    sleep_data = fetch_sleep_data(oura_token, today_date_str)

    if sleep_data:
        sleep_data['collected_at'] = datetime.now().isoformat()
        print("Fetched sleep data:")
        print(json.dumps(sleep_data, indent=2))
        try:
            result = d1_client.upsert_oura_data(today_date_str, sleep_data)
            print(f"D1 upsert result for {today_date_str}:")
            print(json.dumps(result, indent=2))
        except Exception as e:
            print(f"Error inserting sleep data into D1: {e}")
    else:
        print("No sleep data found.")


if __name__ == "__main__":
    main()

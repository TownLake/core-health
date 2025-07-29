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
    # Fetch sleep sessions that started yesterday and ended today.
    try:
        session_start_date = (datetime.fromisoformat(sleep_date).date() - timedelta(days=1)).isoformat()
        response = requests.get(
            'https://api.ouraring.com/v2/usercollection/sleep',
            headers=headers,
            params={'start_date': session_start_date, 'end_date': sleep_date}
        )
        response.raise_for_status()
        sleep_data = response.json().get('data', [])
        # Find the specific session that ended on the sleep_date
        main_session = next((s for s in sleep_data if s.get('day') == sleep_date), None)
        if main_session:
            data['deep_sleep_minutes'] = int(main_session.get('deep_sleep_duration', 0) / 60)
            data['resting_heart_rate'] = main_session.get('lowest_heart_rate')
            data['average_hrv'] = main_session.get('average_hrv')
            data['total_sleep_hours'] = main_session.get('total_sleep_duration', 0) / 3600
            data['efficiency'] = main_session.get('efficiency')
            data['latency_minutes'] = int(main_session.get('latency', 0) / 60)
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
    Fetches activity-related data for a specific day.
    """
    headers = {'Authorization': f'Bearer {token}'}
    data = {}

    try:
        response = requests.get(
            'https://api.ouraring.com/v2/usercollection/daily_activity',
            headers=headers,
            params={'start_date': activity_date, 'end_date': activity_date}
        )
        response.raise_for_status()
        activity_data = response.json().get('data', [])
        if activity_data:
            data['total_calories'] = activity_data[0].get('total_calories')
    except Exception as e:
        print(f"Error fetching daily activity data: {e}")
        
    return data

# --- REFACTORED CLOUDFLARE D1 CLASS ---

class CloudflareD1:
    def __init__(self, account_id: str, database_id: str, bearer_token: str):
        self.base_url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/d1/database/{database_id}/query"
        self.headers = {"Authorization": f"Bearer {bearer_token}"}

    def upsert_oura_data(self, date: str, data: Dict[str, Any]) -> Optional[Dict]:
        """
        Inserts or updates data for a specific date in the oura_data table.
        This is more flexible and handles partial updates gracefully.
        """
        if not data:
            print(f"No data provided to upsert for date: {date}")
            return None

        # Filter out keys with None values to avoid overwriting good data with nulls
        valid_data = {k: v for k, v in data.items() if v is not None}
        if not valid_data:
            print(f"All data was None for date: {date}, skipping upsert.")
            return None

        columns = ", ".join(valid_data.keys())
        placeholders = ", ".join(["?"] * len(valid_data))
        updates = ", ".join([f"{key} = excluded.{key}" for key in valid_data.keys()])
        
        # This SQL command inserts a new row or updates the existing one if the date already exists.
        # It assumes your 'date' column has a UNIQUE constraint.
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

# --- REFACTORED MAIN EXECUTION BLOCK ---

def main():
    # Load environment variables
    account_id = os.getenv('CLOUDFLARE_ACCOUNT_ID')
    database_id = os.getenv('CLOUDFLARE_D1_DB')
    bearer_token = os.getenv('CLOUDFLARE_API_TOKEN')
    oura_token = os.getenv('OURA_TOKEN')

    if not all([account_id, database_id, bearer_token, oura_token]):
        raise ValueError("One or more required environment variables are missing.")

    d1_client = CloudflareD1(account_id, database_id, bearer_token)

    # Define dates: The script runs today to fetch yesterday's activity and last night's sleep.
    # When run on July 29th:
    # today_date = "2025-07-29" (for sleep data from night of 28th->29th)
    # yesterday_date = "2025-07-28" (for activity data from the 28th)
    today_date_str = datetime.now().date().isoformat()
    yesterday_date_str = (datetime.now().date() - timedelta(days=1)).isoformat()
    
    # --- Step 1: Fetch and write YESTERDAY's activity data ---
    print(f"--- Fetching activity data for {yesterday_date_str} ---")
    activity_data = fetch_activity_data(oura_token, yesterday_date_str)
    
    if activity_data:
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

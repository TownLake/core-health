# In file: data-gather/collect_oura_data.py

import os
import requests
from datetime import datetime, timedelta, date
import json
from typing import Dict, Any, Optional

def refresh_oura_token(client_id: str, client_secret: str, refresh_token: str) -> Optional[Dict[str, Any]]:
    """Refreshes the Oura OAuth2 token."""
    print("Refreshing Oura access token...")
    try:
        response = requests.post(
            'https://api.ouraring.com/oauth/token',
            auth=(client_id, client_secret),
            data={'grant_type': 'refresh_token', 'refresh_token': refresh_token}
        )
        response.raise_for_status()
        new_tokens = response.json()
        print("Successfully refreshed Oura token.")
        return {"access_token": new_tokens.get("access_token"), "refresh_token": new_tokens.get("refresh_token")}
    except requests.exceptions.HTTPError as e:
        print(f"ERROR: Could not refresh Oura token. It might be invalid or expired. {e.response.status_code} - {e.response.text}")
        return None

def fetch_sleep_data(token: str, sleep_date: str) -> Dict[str, Any]:
    """
    Fetches all sleep-related data for a specific night.
    The 'sleep_date' is the date the sleep period *ends*.
    """
    headers = {'Authorization': f'Bearer {token}'}
    data = {}
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
        else:
            print(f"INFO: Oura API returned no daily_sleep summary for {sleep_date}.")
    except Exception as e:
        print(f"Error fetching daily sleep score: {e}")
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
            data['deep_sleep_minutes'] = int(main_session.get('deep_sleep_duration', 0) / 60)
            data['total_sleep'] = main_session.get('total_sleep_duration', 0) / 3600
            data['delay'] = int(main_session.get('latency', 0) / 60)
            data['resting_heart_rate'] = main_session.get('lowest_heart_rate')
            data['average_hrv'] = main_session.get('average_hrv')
            data['efficiency'] = main_session.get('efficiency')
            if main_session.get('bedtime_start'):
                dt = datetime.fromisoformat(main_session['bedtime_start'].replace('Z', '+00:00'))
                data['bedtime_start_date'] = dt.date().isoformat()
                data['bedtime_start_time'] = dt.time().isoformat()
        else:
            print(f"INFO: Oura API returned no main sleep session for {sleep_date}.")
    except Exception as e:
        print(f"Error fetching detailed sleep data: {e}")
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
        else:
            print(f"INFO: Oura API returned no SPO2 data for {sleep_date}.")
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
        target_day_data = next((item for item in activity_data if item.get('day') == activity_date), None)
        if target_day_data:
            data['total_calories'] = target_day_data.get('total_calories')
        else:
            print(f"INFO: Oura API returned no daily_activity data for {activity_date}.")
    except Exception as e:
        print(f"Error fetching daily activity data: {e}")
    return data

class CloudflareD1:
    """A client to interact with the Cloudflare D1 API."""
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
        print(f"\n--- Preparing to upsert data for {date} ---")
        print(json.dumps(valid_data, indent=2))
        columns = ", ".join(valid_data.keys())
        placeholders = ", ".join(["?"] * len(valid_data))
        updates = ", ".join([f"{key} = excluded.{key}" for key in valid_data.keys()])
        query = f"INSERT INTO oura_data (date, {columns}) VALUES (?, {placeholders}) ON CONFLICT(date) DO UPDATE SET {updates};"
        params = [date] + list(valid_data.values())
        try:
            response = requests.post(self.base_url, headers=self.headers, json={"sql": query, "params": params})
            response.raise_for_status()
            print(f"Successfully upserted data to Cloudflare D1 for {date}.")
            return response.json()
        except requests.exceptions.HTTPError as e:
            print(f"D1 API Error: {e.response.text}")
            raise

def main():
    # --- 1. Load secrets and refresh Oura token ---
    cf_account_id = os.getenv('CLOUDFLARE_ACCOUNT_ID')
    cf_database_id = os.getenv('CLOUDFLARE_D1_DB')
    cf_api_token = os.getenv('CLOUDFLARE_API_TOKEN')
    oura_client_id = os.getenv('OURA_CLIENT_ID')
    oura_client_secret = os.getenv('OURA_CLIENT_SECRET')
    oura_refresh_token = os.getenv('OURA_REFRESH_TOKEN')

    if not all([cf_account_id, cf_database_id, cf_api_token, oura_client_id, oura_client_secret, oura_refresh_token]):
        raise ValueError("One or more required environment variables are missing.")

    new_tokens = refresh_oura_token(oura_client_id, oura_client_secret, oura_refresh_token)
    if not new_tokens or not new_tokens.get('access_token'):
        raise RuntimeError("Failed to refresh Oura token. Aborting script.")
    
    access_token = new_tokens['access_token']
    new_refresh_token = new_tokens.get('refresh_token')

    if new_refresh_token and new_refresh_token != oura_refresh_token:
        print("\n" + "="*60)
        print("!! NEW REFRESH TOKEN GENERATED !!")
        print("The GitHub Action will attempt to update the secret automatically.")
        print("="*60 + "\n")
        
        github_output_file = os.getenv('GITHUB_OUTPUT')
        if github_output_file:
            with open(github_output_file, 'a') as f:
                f.write(f"new_refresh_token={new_refresh_token}\n")
    else:
        print("Refresh token was not rotated.")
        github_output_file = os.getenv('GITHUB_OUTPUT')
        if github_output_file:
            with open(github_output_file, 'a') as f:
                f.write("new_refresh_token=\n")

    # --- 2. Determine Dates based on run type ---
    target_date_str = os.getenv('TARGET_DATE')

    if target_date_str:
        print(f"--- Manual run for target date: {target_date_str} ---")
        sleep_date_obj = datetime.fromisoformat(target_date_str).date()
    else:
        print(f"--- Scheduled run ---")
        sleep_date_obj = date.today()

    activity_date_obj = sleep_date_obj - timedelta(days=1)
    
    print(f"Primary sleep date set to: {sleep_date_obj.isoformat()}")
    print(f"Derived activity date set to: {activity_date_obj.isoformat()}")

    # --- 3. Fetch and Store Data ---
    d1_client = CloudflareD1(cf_account_id, cf_database_id, cf_api_token)

    # Fetch and write SLEEP data for the primary date
    print(f"\n--- Fetching sleep data for night ending on {sleep_date_obj.isoformat()} ---")
    sleep_data = fetch_sleep_data(access_token, sleep_date_obj.isoformat())
    if sleep_data:
        d1_client.upsert_oura_data(sleep_date_obj.isoformat(), {'collected_at': datetime.now().isoformat(), **sleep_data})

    # Fetch and write ACTIVITY data for the PREVIOUS day
    print(f"\n--- Fetching activity data for {activity_date_obj.isoformat()} ---")
    activity_data = fetch_activity_data(access_token, activity_date_obj.isoformat())
    if activity_data:
        d1_client.upsert_oura_data(activity_date_obj.isoformat(), {'collected_at': datetime.now().isoformat(), **activity_data})

if __name__ == "__main__":
    main()

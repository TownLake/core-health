# In file: data-gather/collect_oura_data.py

import os
import requests
from datetime import datetime, timedelta, date
import json
from typing import Dict, Any, Optional

# --- HELPER FUNCTIONS (UNCHANGED) ---
def refresh_oura_token(client_id: str, client_secret: str, refresh_token: str) -> Optional[Dict[str, Any]]:
    # ... (This function remains unchanged) ...
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
    # ... (This function remains unchanged) ...
    # ...
    pass

def fetch_activity_data(token: str, activity_date: str) -> Dict[str, Any]:
    # ... (This function remains unchanged) ...
    # ...
    pass

class CloudflareD1:
    def __init__(self, account_id: str, database_id: str, bearer_token: str):
        self.base_url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/d1/database/{database_id}/query"
        self.headers = {"Authorization": f"Bearer {bearer_token}"}
    
    # --- MODIFIED: Enhanced Logging ---
    def upsert_oura_data(self, date: str, data: Dict[str, Any]) -> Optional[Dict]:
        if not data:
            print(f"No data provided to upsert for date: {date}")
            return None
        valid_data = {k: v for k, v in data.items() if v is not None}
        if not valid_data:
            print(f"All data was None for date: {date}, skipping upsert.")
            return None
        
        # <<< CHANGE #1: ADDED LOGGING >>>
        # Print the exact data being sent to Cloudflare D1
        print(f"\n--- Preparing to upsert data for {date} ---")
        print(json.dumps(valid_data, indent=2))
        
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
            print(f"Successfully upserted data to Cloudflare D1 for {date}.")
            return response.json()
        except requests.exceptions.HTTPError as e:
            print(f"D1 API Error: {e.response.text}")
            raise


# --- MODIFIED MAIN EXECUTION BLOCK ---
def main():
    # --- 1. Load secrets from environment (Unchanged) ---
    cf_account_id = os.getenv('CLOUDFLARE_ACCOUNT_ID')
    cf_database_id = os.getenv('CLOUDFLARE_D1_DB')
    cf_api_token = os.getenv('CLOUDFLARE_API_TOKEN')
    oura_client_id = os.getenv('OURA_CLIENT_ID')
    oura_client_secret = os.getenv('OURA_CLIENT_SECRET')
    oura_refresh_token = os.getenv('OURA_REFRESH_TOKEN')
    target_date_str = os.getenv('TARGET_DATE')

    if not all([cf_account_id, cf_database_id, cf_api_token, oura_client_id, oura_client_secret, oura_refresh_token]):
        raise ValueError("One or more required environment variables are missing.")

    # --- 2. Refresh Oura Token (Unchanged) ---
    new_tokens = refresh_oura_token(oura_client_id, oura_client_secret, oura_refresh_token)
    if not new_tokens or not new_tokens.get('access_token'):
        raise RuntimeError("Failed to refresh Oura token. Aborting script.")
    
    access_token = new_tokens['access_token']
    new_refresh_token = new_tokens.get('refresh_token')

    # <<< CHANGE #2: SET GITHUB ACTION OUTPUT >>>
    # --- 3. Set GitHub Action Output with the new refresh token ---
    if new_refresh_token and new_refresh_token != oura_refresh_token:
        print("\n" + "="*60)
        print("!! NEW REFRESH TOKEN GENERATED !!")
        print("The GitHub Action will attempt to update the secret automatically.")
        print(f"NEW OURA REFRESH TOKEN: {new_refresh_token}") # Still printing for logs
        print("="*60 + "\n")
        
        # Set the output for the GitHub Action to use
        github_output_file = os.getenv('GITHUB_OUTPUT')
        if github_output_file:
            with open(github_output_file, 'a') as f:
                f.write(f"new_refresh_token={new_refresh_token}\n")
    else:
        print("Refresh token was not rotated.")
        # Explicitly set the output to empty if no new token was generated
        github_output_file = os.getenv('GITHUB_OUTPUT')
        if github_output_file:
            with open(github_output_file, 'a') as f:
                f.write("new_refresh_token=\n")

    # --- 4. Continue with data processing (Unchanged) ---
    d1_client = CloudflareD1(cf_account_id, cf_database_id, cf_api_token)

    if target_date_str:
        # MANUAL RUN
        print(f"--- Manual Run: Fetching all data for {target_date_str} ---")
        activity_data = fetch_activity_data(access_token, target_date_str)
        if activity_data:
            d1_client.upsert_oura_data(target_date_str, {'collected_at': datetime.now().isoformat(), **activity_data})
        
        sleep_data = fetch_sleep_data(access_token, target_date_str)
        if sleep_data:
            d1_client.upsert_oura_data(target_date_str, {'collected_at': datetime.now().isoformat(), **sleep_data})
    else:
        # SCHEDULED RUN
        print("--- Scheduled Run ---")
        today = date.today()
        yesterday = today - timedelta(days=1)
        
        print(f"\n--- Fetching activity data for {yesterday.isoformat()} ---")
        activity_data = fetch_activity_data(access_token, yesterday.isoformat())
        if activity_data:
            d1_client.upsert_oura_data(yesterday.isoformat(), {'collected_at': datetime.now().isoformat(), **activity_data})

        print(f"\n--- Fetching sleep data for night ending on {today.isoformat()} ---")
        sleep_data = fetch_sleep_data(access_token, today.isoformat())
        if sleep_data:
            d1_client.upsert_oura_data(today.isoformat(), {'collected_at': datetime.now().isoformat(), **sleep_data})


if __name__ == "__main__":
    main()

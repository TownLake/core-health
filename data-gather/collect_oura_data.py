import os
import requests
from datetime import datetime, timedelta
import json
from typing import Dict, Any, Optional

# --- HELPER FOR ENCRYPTING GITHUB SECRETS ---
# This section requires 'pynacl' to be installed
try:
    import nacl.secret
    import nacl.utils
    from nacl.public import PublicKey, SealedBox
    import base64
    PYNACL_INSTALLED = True
except ImportError:
    PYNACL_INSTALLED = False

# --- HELPER FUNCTIONS FOR OAUTH2 & GITHUB ---

def refresh_oura_token(client_id: str, client_secret: str, refresh_token: str) -> Optional[Dict[str, Any]]:
    """
    Refreshes the Oura access token using the refresh token.
    Returns a dictionary with new 'access_token' and 'refresh_token'.
    """
    print("Refreshing Oura access token...")
    try:
        response = requests.post(
            'https://api.ouraring.com/oauth/token',
            auth=(client_id, client_secret),
            data={
                'grant_type': 'refresh_token',
                'refresh_token': refresh_token,
            }
        )
        response.raise_for_status()
        new_tokens = response.json()
        print("Successfully refreshed Oura token.")
        return {
            "access_token": new_tokens.get("access_token"),
            "refresh_token": new_tokens.get("refresh_token")
        }
    except requests.exceptions.HTTPError as e:
        print(f"Error refreshing Oura token: {e.response.status_code} - {e.response.text}")
        return None

def update_github_secret(github_token: str, repo: str, secret_name: str, new_value: str):
    """
    Updates a GitHub Actions secret with a new value.
    This requires PyNaCl for encryption.
    """
    if not PYNACL_INSTALLED:
        print("PyNaCl is not installed. Cannot update GitHub secret.")
        return

    print(f"Attempting to update GitHub secret: {secret_name}")
    headers = {
        "Authorization": f"Bearer {github_token}",
        "Accept": "application/vnd.github.v3+json"
    }

    # 1. Get the repository's public key for encryption
    try:
        key_url = f"https://api.github.com/repos/{repo}/actions/secrets/public-key"
        key_res = requests.get(key_url, headers=headers)
        key_res.raise_for_status()
        public_key_data = key_res.json()
        public_key = public_key_data['key']
        key_id = public_key_data['key_id']
    except Exception as e:
        print(f"Failed to get repo public key: {e}")
        return

    # 2. Encrypt the new secret value
    public_key_obj = PublicKey(public_key.encode('utf-8'), nacl.encoding.Base64Encoder)
    sealed_box = SealedBox(public_key_obj)
    encrypted_value = sealed_box.encrypt(new_value.encode('utf-8'))
    encrypted_base64 = base64.b64encode(encrypted_value).decode('utf-8')

    # 3. PUT the new encrypted secret
    try:
        secret_url = f"https://api.github.com/repos/{repo}/actions/secrets/{secret_name}"
        update_data = {
            "encrypted_value": encrypted_base64,
            "key_id": key_id
        }
        update_res = requests.put(secret_url, headers=headers, json=update_data)
        update_res.raise_for_status()
        if update_res.status_code == 204:
            print(f"Successfully updated GitHub secret: {secret_name}")
        else:
            print(f"Failed to update secret, status code: {update_res.status_code}")
    except Exception as e:
        print(f"Failed to update secret in GitHub API: {e}")


# --- OURA DATA FETCHING FUNCTIONS (Unchanged logic, just take a token) ---

def fetch_sleep_data(token: str, sleep_date: str) -> Dict[str, Any]:
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
    except Exception as e:
        print(f"Error fetching SPO2 data: {e}")
    return data


def fetch_activity_data(token: str, activity_date: str) -> Dict[str, Any]:
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
    except Exception as e:
        print(f"Error fetching daily activity data: {e}")
    return data

# --- CLOUDFLARE D1 CLASS (Unchanged) ---
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

# --- MAIN EXECUTION BLOCK (Rewritten for OAuth2) ---
def main():
    # --- 1. Load all secrets from environment ---
    # Cloudflare Secrets
    cf_account_id = os.getenv('CLOUDFLARE_ACCOUNT_ID')
    cf_database_id = os.getenv('CLOUDFLARE_D1_DB')
    cf_api_token = os.getenv('CLOUDFLARE_API_TOKEN')
    
    # Oura OAuth2 Secrets
    oura_client_id = os.getenv('OURA_CLIENT_ID')
    oura_client_secret = os.getenv('OURA_CLIENT_SECRET')
    oura_refresh_token = os.getenv('OURA_REFRESH_TOKEN')

    # GitHub Secrets for auto-updating the token
    github_token = os.getenv('GITHUB_TOKEN')
    github_repo = os.getenv('GITHUB_REPOSITORY')

    # Validate all required secrets are present
    required_vars = {
        'CLOUDFLARE_ACCOUNT_ID': cf_account_id, 'CLOUDFLARE_D1_DB': cf_database_id,
        'CLOUDFLARE_API_TOKEN': cf_api_token, 'OURA_CLIENT_ID': oura_client_id,
        'OURA_CLIENT_SECRET': oura_client_secret, 'OURA_REFRESH_TOKEN': oura_refresh_token,
        'GITHUB_TOKEN': github_token, 'GITHUB_REPOSITORY': github_repo
    }
    if not all(required_vars.values()):
        missing = [key for key, value in required_vars.items() if not value]
        raise ValueError(f"Missing required environment variables: {', '.join(missing)}")

    # --- 2. Refresh Oura Token to get a new Access Token ---
    new_tokens = refresh_oura_token(oura_client_id, oura_client_secret, oura_refresh_token)
    if not new_tokens or 'access_token' not in new_tokens:
        raise RuntimeError("Could not refresh Oura token. Aborting.")
    
    access_token = new_tokens['access_token']
    new_refresh_token = new_tokens.get('refresh_token')

    # --- 3. Update the Refresh Token in GitHub Secrets for the next run ---
    if new_refresh_token and new_refresh_token != oura_refresh_token:
        update_github_secret(
            github_token,
            github_repo,
            'OURA_REFRESH_TOKEN',
            new_refresh_token
        )
    else:
        print("Refresh token was not rotated. No secret update needed.")

    # --- 4. Proceed with original script logic using the new access token ---
    d1_client = CloudflareD1(cf_account_id, cf_database_id, cf_api_token)
    today_date_str = datetime.now().date().isoformat()
    yesterday_date_str = (datetime.now().date() - timedelta(days=1)).isoformat()
    
    # Fetch and write YESTERDAY's activity data
    print(f"\n--- Fetching activity data for {yesterday_date_str} ---")
    activity_data = fetch_activity_data(access_token, yesterday_date_str)
    if activity_data:
        activity_data['collected_at'] = datetime.now().isoformat()
        d1_client.upsert_oura_data(yesterday_date_str, activity_data)
        print("Activity data processed.")
    else:
        print("No activity data found.")

    # Fetch and write TODAY's sleep data
    print(f"\n--- Fetching sleep data for night ending on {today_date_str} ---")
    sleep_data = fetch_sleep_data(access_token, today_date_str)
    if sleep_data:
        sleep_data['collected_at'] = datetime.now().isoformat()
        d1_client.upsert_oura_data(today_date_str, sleep_data)
        print("Sleep data processed.")
    else:
        print("No sleep data found.")

if __name__ == "__main__":
    main()

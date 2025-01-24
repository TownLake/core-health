import requests
import json
import os
import subprocess
from datetime import datetime, date, timedelta, UTC
import sys

class OuraDataFetcher:
    """
    Fetch Oura ring data from the official Oura APIs.
    This class focuses on daily sleep, SPO2, and cardiovascular age data.
    """
    def __init__(self, token):
        self.token = token
        self.headers = {
            'Authorization': f'Bearer {token}'
        }
        self.base_url = 'https://api.ouraring.com/v2/usercollection'
        
    def get_date_range(self, target_date=None):
        """
        Returns a date range for fetching data. 
        e.g. if target_date=2025-01-24, it fetches data from 2 days before to 1 day after
        to ensure we capture the relevant session that might cross midnight.
        """
        if target_date is None:
            target_date = date.today()
        elif isinstance(target_date, str):
            target_date = datetime.strptime(target_date, '%Y-%m-%d').date()
            
        start_date = (target_date - timedelta(days=2)).strftime('%Y-%m-%d')
        end_date = (target_date + timedelta(days=1)).strftime('%Y-%m-%d')
        return start_date, end_date, target_date.strftime('%Y-%m-%d')
        
    def fetch_sleep_data(self):
        """
        Fetch full sleep session data (start/end times, deep sleep, etc.)
        and daily_sleep data (which has the daily sleep score).
        """
        start_date, end_date, _ = self.get_date_range()
        url = f'{self.base_url}/sleep'
        params = {
            'start_date': start_date,
            'end_date': end_date
        }
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        sleep_data = response.json()
        
        # Also fetch daily sleep scores
        url = f'{self.base_url}/daily_sleep'
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        daily_sleep_data = response.json()
        
        return sleep_data, daily_sleep_data
        
    def fetch_cardio_age(self):
        """
        Fetch the daily cardiovascular age data (vascular_age).
        """
        _, _, target_date = self.get_date_range()
        url = f'{self.base_url}/daily_cardiovascular_age'
        params = {
            'start_date': target_date,
            'end_date': target_date
        }
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        return response.json()
        
    def fetch_spo2(self):
        """
        Fetch daily SPO2 info for the target date.
        """
        _, _, target_date = self.get_date_range()
        url = f'{self.base_url}/daily_spo2'
        params = {
            'start_date': target_date,
            'end_date': target_date
        }
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        return response.json()

def format_time_components(datetime_str):
    """
    Split an ISO datetime into (YYYY-MM-DD, HH:MM:SS).
    Returns (None, None) if datetime_str is missing.
    """
    if not datetime_str:
        return None, None
    dt = datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
    return dt.strftime('%Y-%m-%d'), dt.strftime('%H:%M:%S')

def minutes_to_hhmm(minutes):
    """
    Convert an integer number of minutes to "HH:MM" format.
    For example, 90 -> "01:30".
    """
    if not minutes:
        return None
    hours = minutes // 60
    remaining_minutes = minutes % 60
    return f"{hours:02d}:{remaining_minutes:02d}"

def find_relevant_sleep_session(data, target_date):
    """
    Find the most relevant sleep session for the target date
    (e.g., if Oura splits it across midnight or multiple sleeps).
    We pick the session with the largest total_sleep_duration.
    """
    items = data.get('data', [])
    print(f"Found {len(items)} sleep sessions in the window.")
    for item in items:
        print(f" - date={item.get('day')}, start={item.get('bedtime_start')}, end={item.get('bedtime_end')}")
    
    if not items:
        print(f"No sleep sessions found near {target_date}")
        return {}
        
    # Direct match on "day"
    target_sessions = [item for item in items if item.get('day') == target_date]
    if target_sessions:
        return max(target_sessions, key=lambda x: x.get('total_sleep_duration', 0))
    
    # If no direct match, check if bedtime_end starts with target_date
    target_sessions = [
        item for item in items
        if item.get('bedtime_end') and str(item.get('bedtime_end')).startswith(target_date)
    ]
    if target_sessions:
        return max(target_sessions, key=lambda x: x.get('total_sleep_duration', 0))
    
    return {}

def store_in_d1_columns(d1_db_name, data_dict, date_key):
    """
    Inserts/updates Oura daily metrics into columns for the D1 table: oura_data.
    Columns:
      date (PK), deep_sleep_minutes, sleep_score, bedtime_start_date, bedtime_start_time, ...
      resting_heart_rate, average_hrv, spo2_avg, cardio_age, collected_at, etc.
    """
    
    # Helper to safely convert Python values to SQL
    def sql_str(val, is_text=False):
        """Return a safely escaped value for SQL (or NULL if None)."""
        if val is None:
            return "NULL"
        if is_text:
            return f"'{str(val).replace(\"'\", \"''\")}'"
        return str(val)
    
    # Pull out the fields from data_dict
    deep_sleep = data_dict["sleep"]["deep_sleep_minutes"]
    sleep_score = data_dict["sleep"]["sleep_score"]
    bed_start_date = data_dict["sleep"]["bedtime_start_date"]
    bed_start_time = data_dict["sleep"]["bedtime_start_time"]
    total_sleep = data_dict["sleep"]["total_sleep"]
    rhr = data_dict["sleep"]["resting_heart_rate"]
    hrv = data_dict["sleep"]["average_hrv"]
    spo2 = data_dict["health"]["spo2_avg"]
    cardio_age = data_dict["health"]["cardio_age"]
    collected = data_dict["metadata"]["collected_at"]
    
    # Construct an UPSERT (INSERT ... ON CONFLICT ...)
    upsert_sql = f"""
    INSERT INTO oura_data (
      date, deep_sleep_minutes, sleep_score,
      bedtime_start_date, bedtime_start_time, total_sleep,
      resting_heart_rate, average_hrv, spo2_avg, cardio_age, collected_at
    ) VALUES (
      {sql_str(date_key, True)},       -- date is text
      {sql_str(deep_sleep)},           -- integer
      {sql_str(sleep_score)},          -- integer
      {sql_str(bed_start_date, True)}, -- text
      {sql_str(bed_start_time, True)}, -- text
      {sql_str(total_sleep, True)},    -- text
      {sql_str(rhr)},                  -- integer
      {sql_str(hrv)},                  -- integer
      {sql_str(spo2)},                 -- real
      {sql_str(cardio_age)},           -- integer
      {sql_str(collected, True)}       -- text
    )
    ON CONFLICT(date) DO UPDATE SET
      deep_sleep_minutes=excluded.deep_sleep_minutes,
      sleep_score=excluded.sleep_score,
      bedtime_start_date=excluded.bedtime_start_date,
      bedtime_start_time=excluded.bedtime_start_time,
      total_sleep=excluded.total_sleep,
      resting_heart_rate=excluded.resting_heart_rate,
      average_hrv=excluded.average_hrv,
      spo2_avg=excluded.spo2_avg,
      cardio_age=excluded.cardio_age,
      collected_at=excluded.collected_at;
    """
    
    print("Running UPSERT SQL:\n", upsert_sql)
    
    try:
        upsert_proc = subprocess.run(
            ["wrangler", "d1", "execute", d1_db_name, "--command", upsert_sql],
            capture_output=True,
            text=True,
            check=True
        )
        print("D1 UPSERT stdout:", upsert_proc.stdout)
        print("D1 UPSERT stderr:", upsert_proc.stderr)
        return True
    except subprocess.CalledProcessError as e:
        print("Error inserting/updating data in D1:", e)
        return False

def main(target_date=None):
    """
    Main entrypoint:
      1) Determine which date's data to fetch (default: today's date).
      2) Fetch the relevant Oura metrics.
      3) Insert/Update them into the D1 table.
    """
    try:
        if target_date is None:
            target_date = date.today().strftime('%Y-%m-%d')
        print(f"Collecting Oura data for date: {target_date}")
        
        token = os.environ['OURA_TOKEN']
        d1_db_name = os.environ.get('CLOUDFLARE_D1_DB')
        if not d1_db_name:
            raise ValueError("CLOUDFLARE_D1_DB environment variable is not set. Please provide your D1 DB name or binding.")
        
        fetcher = OuraDataFetcher(token)
        _, _, date_key = fetcher.get_date_range(target_date)
        
        # Fetch from Oura
        print("Fetching sleep data...")
        sleep_data, daily_sleep_data = fetcher.fetch_sleep_data()
        print("Fetching cardio age data...")
        cardio_data = fetcher.fetch_cardio_age()
        print("Fetching SPO2 data...")
        spo2_data = fetcher.fetch_spo2()
        
        # Process the data
        print("Finding relevant sleep session...")
        sleep_info = find_relevant_sleep_session(sleep_data, target_date)
        
        # daily_sleep_data -> for daily sleep score
        daily_sleep_scores = {item['day']: item['score'] for item in daily_sleep_data.get('data', [])}
        sleep_score = daily_sleep_scores.get(target_date)
        
        cardio_info = cardio_data.get('data', [{}])[0]
        spo2_info = spo2_data.get('data', [{}])[0]
        spo2_percentage = spo2_info.get('spo2_percentage', {})
        spo2_avg = spo2_percentage.get('average')
        
        # Build a dictionary of fields we want to store in columns
        daily_data = {
            'date': sleep_info.get('day', date_key),
            'sleep': {
                'deep_sleep_minutes': round(sleep_info.get('deep_sleep_duration', 0) / 60),
                'sleep_score': sleep_score,
                'bedtime_start_date': format_time_components(sleep_info.get('bedtime_start'))[0],
                'bedtime_start_time': format_time_components(sleep_info.get('bedtime_start'))[1],
                'total_sleep': minutes_to_hhmm(round(sleep_info.get('total_sleep_duration', 0) / 60)),
                'resting_heart_rate': sleep_info.get('lowest_heart_rate'),
                'average_hrv': sleep_info.get('average_hrv')
            },
            'health': {
                'spo2_avg': spo2_avg,
                'cardio_age': cardio_info.get('vascular_age')
            },
            'metadata': {
                'collected_at': datetime.now(UTC).isoformat()
            }
        }
        
        # Store in D1
        print(f"Storing row for date_key={date_key} in D1 columns...")
        success = store_in_d1_columns(d1_db_name, daily_data, date_key)
        if not success:
            raise Exception("Failed to store Oura data in D1.")
        
        print("Data collection completed successfully!")
    
    except Exception as e:
        print("Error in main:", str(e))
        raise e

if __name__ == "__main__":
    target_date_arg = sys.argv[1] if len(sys.argv) > 1 else None
    main(target_date_arg)

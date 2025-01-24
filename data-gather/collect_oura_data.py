import os
import sys
import requests
from datetime import datetime, timedelta
import json
from cloudflare import Cloudflare

# Constants
OURA_BASE_URL = "https://api.ouraring.com/v2/usercollection"
D1_DATABASE = "sam_health_data"
D1_TABLE = "oura_data"

def fetch_oura_data(date):
    headers = {"Authorization": f"Bearer {os.getenv('OURA_TOKEN')}"}
    results = {}

    # Fetch daily sleep
    response = requests.get(
        f"{OURA_BASE_URL}/daily_sleep",
        headers=headers,
        params={"start_date": date, "end_date": date}
    )
    sleep_data = response.json().get("data", [{}])[0]
    results["deep_sleep_minutes"] = sleep_data.get("contributors", {}).get("deep_sleep", 0)
    results["sleep_score"] = sleep_data.get("score", 0)
    results["total_sleep"] = sleep_data.get("contributors", {}).get("total_sleep", 0)

    # Fetch bedtime start
    response = requests.get(
        f"{OURA_BASE_URL}/sleep",
        headers=headers,
        params={"start_date": date, "end_date": date}
    )
    bedtime_data = response.json().get("data", [{}])[0]
    bedtime_start = bedtime_data.get("bedtime_start", "")
    results["bedtime_start_date"] = bedtime_start.split("T")[0]
    results["bedtime_start_time"] = bedtime_start.split("T")[1] if "T" in bedtime_start else ""

    results["resting_heart_rate"] = bedtime_data.get("lowest_heart_rate", 0)
    results["average_hrv"] = bedtime_data.get("average_hrv", 0)

    # Fetch SpO2
    response = requests.get(
        f"{OURA_BASE_URL}/daily_spo2",
        headers=headers,
        params={"start_date": date, "end_date": date}
    )
    spo2_data = response.json().get("data", [{}])[0]
    results["spo2_avg"] = spo2_data.get("spo2_percentage", {}).get("average", 0)

    # Fetch cardio age
    response = requests.get(
        f"{OURA_BASE_URL}/daily_cardiovascular_age",
        headers=headers,
        params={"start_date": date, "end_date": date}
    )
    cardio_data = response.json().get("data", [{}])[0]
    results["cardio_age"] = cardio_data.get("vascular_age", 0)

    results["date"] = date
    results["collected_at"] = datetime.utcnow().isoformat()
    return results

def upload_to_d1(data):
    cf = Cloudflare(account_id=os.getenv("CLOUDFLARE_ACCOUNT_ID"), api_token=os.getenv("CLOUDFLARE_API_TOKEN"))
    query = f"""
    INSERT INTO {D1_TABLE} (date, deep_sleep_minutes, sleep_score, bedtime_start_date, bedtime_start_time, total_sleep, resting_heart_rate, average_hrv, spo2_avg, cardio_age, collected_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (date) DO UPDATE SET
      deep_sleep_minutes = excluded.deep_sleep_minutes,
      sleep_score = excluded.sleep_score,
      bedtime_start_date = excluded.bedtime_start_date,
      bedtime_start_time = excluded.bedtime_start_time,
      total_sleep = excluded.total_sleep,
      resting_heart_rate = excluded.resting_heart_rate,
      average_hrv = excluded.average_hrv,
      spo2_avg = excluded.spo2_avg,
      cardio_age = excluded.cardio_age,
      collected_at = excluded.collected_at;
    """
    cf.d1(D1_DATABASE).query(query, *data.values())

if __name__ == "__main__":
    input_date = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] else None
    date = input_date or (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
    try:
        data = fetch_oura_data(date)
        print("Fetched data:", json.dumps(data, indent=2))
        upload_to_d1(data)
        print("Data uploaded successfully!")
    except Exception as e:
        print("Error:", str(e))

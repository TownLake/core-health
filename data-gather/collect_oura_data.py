import os
import sys
import requests
from datetime import datetime, timedelta
import json

# Constants
OURA_BASE_URL = "https://api.ouraring.com/v2/usercollection"
D1_API_URL = f"https://api.cloudflare.com/client/v4/accounts/{os.getenv('CLOUDFLARE_ACCOUNT_ID')}/d1/database/{os.getenv('D1_DATABASE')}/query"
HEADERS = {
    "Authorization": f"Bearer {os.getenv('CLOUDFLARE_API_TOKEN')}",
    "Content-Type": "application/json"
}

def fetch_oura_data(start_date, end_date):
    headers = {"Authorization": f"Bearer {os.getenv('OURA_TOKEN')}"}
    results = {}

    # Fetch daily sleep
    response = requests.get(
        f"{OURA_BASE_URL}/daily_sleep",
        headers=headers,
        params={"start_date": start_date, "end_date": end_date}
    )
    sleep_data = response.json().get("data", [])
    if not sleep_data:
        print(f"No daily sleep data for the range {start_date} to {end_date}")
        return {}
    sleep_entry = sleep_data[0]
    results["deep_sleep_minutes"] = sleep_entry.get("contributors", {}).get("deep_sleep", 0)
    results["sleep_score"] = sleep_entry.get("score", 0)
    results["total_sleep"] = sleep_entry.get("contributors", {}).get("total_sleep", 0)

    # Fetch bedtime start
    response = requests.get(
        f"{OURA_BASE_URL}/sleep",
        headers=headers,
        params={"start_date": start_date, "end_date": end_date}
    )
    sleep_details = response.json().get("data", [])
    print("Raw sleep details response:", json.dumps(sleep_details, indent=2))  # Debug log
    if sleep_details:
        bedtime_entry = sleep_details[0]
        bedtime_start = bedtime_entry.get("bedtime_start", "")
        print("Raw bedtime_start value:", bedtime_start)  # Print raw bedtime_start value
        if bedtime_start:
            results["bedtime_start_date"] = bedtime_start.split("T")[0]  # Extract date
            results["bedtime_start_time"] = bedtime_start.split("T")[1].split("Z")[0]  # Extract time
        else:
            results["bedtime_start_date"] = None
            results["bedtime_start_time"] = None
            print(f"Warning: bedtime_start missing for {start_date}")

        results["resting_heart_rate"] = bedtime_entry.get("lowest_heart_rate", 0)
        results["average_hrv"] = bedtime_entry.get("average_hrv", 0)

    # Fetch SpO2
    response = requests.get(
        f"{OURA_BASE_URL}/daily_spo2",
        headers=headers,
        params={"start_date": start_date, "end_date": end_date}
    )
    spo2_data = response.json().get("data", [])
    if spo2_data:
        results["spo2_avg"] = spo2_data[0].get("spo2_percentage", {}).get("average", 0)

    # Fetch cardio age
    response = requests.get(
        f"{OURA_BASE_URL}/daily_cardiovascular_age",
        headers=headers,
        params={"start_date": start_date, "end_date": end_date}
    )
    cardio_data = response.json().get("data", [])
    if cardio_data:
        results["cardio_age"] = cardio_data[0].get("vascular_age", 0)

    results["date"] = start_date
    results["collected_at"] = datetime.utcnow().isoformat()
    return results

def upload_to_d1(data):
    query = f"""
    INSERT INTO oura_data (date, deep_sleep_minutes, sleep_score, bedtime_start_date, bedtime_start_time, total_sleep, resting_heart_rate, average_hrv, spo2_avg, cardio_age, collected_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """
    payload = {
        "sql": query,
        "params": [
            data["date"],
            data["deep_sleep_minutes"],
            data["sleep_score"],
            data.get("bedtime_start_date"),
            data.get("bedtime_start_time"),
            data["total_sleep"],
            data.get("resting_heart_rate", 0),
            data.get("average_hrv", 0),
            data.get("spo2_avg", 0),
            data.get("cardio_age", 0),
            data["collected_at"]
        ]
    }

    # Debugging payload
    print("SQL Query:", query)
    print("Payload:", json.dumps(payload, indent=2))

    response = requests.post(D1_API_URL, headers=HEADERS, json=payload)
    if response.status_code == 200:
        print("Data uploaded successfully!")
    else:
        print("Error uploading data:", response.status_code, response.text)

if __name__ == "__main__":
    input_date = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] else None
    if not input_date:
        date = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
    else:
        date = input_date
    try:
        data = fetch_oura_data(date, date)
        if data:
            print("Fetched data:", json.dumps(data, indent=2))
            upload_to_d1(data)
        else:
            print("No data to upload.")
    except Exception as e:
        print("Error:", str(e))

import os
import json
import requests
from datetime import datetime, timedelta

CLOUDFLARE_ACCOUNT_ID = os.environ["CLOUDFLARE_ACCOUNT_ID"]
CLOUDFLARE_API_TOKEN = os.environ["CLOUDFLARE_API_TOKEN"]
OURA_TOKEN = os.environ["OURA_TOKEN"]
DATABASE_ID = "5d45c3e0-e4e8-4ea9-8c74-99fc49693825"

def get_target_date():
    target_date = os.environ.get("TARGET_DATE")
    if target_date:
        return target_date
    return (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

def fetch_oura_data(endpoint, date):
    base_url = "https://api.ouraring.com/v2/usercollection"
    headers = {"Authorization": f"Bearer {OURA_TOKEN}"}
    params = {"start_date": date, "end_date": date}
    
    response = requests.get(f"{base_url}/{endpoint}", headers=headers, params=params)
    response.raise_for_status()
    return response.json()

def insert_into_d1(data):
    url = f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/d1/database/{DATABASE_ID}/query"
    headers = {
        "Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}",
        "Content-Type": "application/json"
    }
    
    query = {
        "sql": f"""INSERT INTO oura_data 
                 (date, deep_sleep_minutes, sleep_score, bedtime_start_date, 
                  bedtime_start_time, total_sleep, resting_heart_rate, 
                  average_hrv, spo2_avg, cardio_age, collected_at) 
                 VALUES 
                 ('{data["date"]}', {data["deep_sleep_minutes"]}, {data["sleep_score"]},
                  '{data["bedtime_start_date"]}', '{data["bedtime_start_time"]}',
                  {data["total_sleep"]}, {data["resting_heart_rate"]}, {data["average_hrv"]},
                  {data["spo2_avg"]}, {data["cardio_age"]}, '{datetime.now().isoformat()}')"""
    }
    
    response = requests.post(url, headers=headers, json=query)
    response.raise_for_status()
    return response.json()

def main():
    target_date = get_target_date()
    print(f"Collecting data for date: {target_date}")
    
    # Collect data from different endpoints
    daily_sleep = fetch_oura_data("daily_sleep", target_date)["data"][0]
    sleep = fetch_oura_data("sleep", target_date)["data"][0]
    spo2 = fetch_oura_data("daily_spo2", target_date)["data"][0]
    cardio = fetch_oura_data("daily_cardiovascular_age", target_date)["data"][0]

    # Parse bedtime
    bedtime = datetime.fromisoformat(sleep["bedtime_start"].replace('Z', '+00:00'))
    
    # Prepare data for D1
    data = {
        "date": target_date,
        "deep_sleep_minutes": daily_sleep["contributors"]["deep_sleep"],
        "sleep_score": daily_sleep["score"],
        "bedtime_start_date": bedtime.date().isoformat(),
        "bedtime_start_time": bedtime.time().isoformat(),
        "total_sleep": daily_sleep["contributors"]["total_sleep"],
        "resting_heart_rate": sleep["lowest_heart_rate"],
        "average_hrv": sleep["average_hrv"],
        "spo2_avg": spo2["spo2_percentage"]["average"],
        "cardio_age": cardio["vascular_age"]
    }
    
    print("Collected data:")
    print(json.dumps(data, indent=2))
    
    # Insert into D1
    result = insert_into_d1(data)
    print("D1 insertion result:", json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
I would like to routinely pull Oura V2 API information, using a GitHub action that triggers a python script, and store it into Cloudflare's D1 SQL db.
* the Cloudflare D1 db is named `sam_health_data` and the table is `oura_data`
* I want the script to pull the day's data every morning at 9am and to allow for manual trigger where I input a certain date and it grabs that data
* GH Action secret names are `CLOUDFLARE_ACCOUNT_ID` `CLOUDFLARE_API_TOKE` `OURA_TOKEN`
* I have created the D1 fields in the cloudflare dash already
* the SQL DB fields are broken out below
* generate the whole files (the workflow and .py file)
* in the github action logs print out the data captured so we can see what it is trying to send to D1
* the .py file is located at data-gather/collect_oura_data.py

## SQL Column Names
date (text) - primary key
deep_sleep_minutes (integer)
sleep_score (integer)
bedtime_start_date (text)
bedtime_start_time (text)
total_sleep (text)
resting_heart_rate (integer)
average_hrv (integer)
spo2_avg (real)
cardio_age (integer)
collected_at (text)

## Oura v2 API locations

### Deep Sleep

deep_sleep_minutes (integer) is "deep_sleep" value below; see comment to confirm exact location

#### Request Example

import requests 
url = 'https://api.ouraring.com/v2/usercollection/daily_sleep' 
params={ 
    'start_date': '2021-11-01', 
    'end_date': '2021-12-01' 
}
headers = { 
  'Authorization': 'Bearer <token>' 
}
response = requests.request('GET', url, headers=headers, params=params) 
print(response.text)

#### Response Example

{
  "data": [
    {
      "id": "string",
      "contributors": {
        // location of deep sleep immediately below this comment
        "deep_sleep": 0,
        "efficiency": 0,
        "latency": 0,
        "rem_sleep": 0,
        "restfulness": 0,
        "timing": 0,
        "total_sleep": 0
      },
      "day": "2019-08-24",
      "score": 0,
      "timestamp": "string"
    }
  ],
  "next_token": "string"
}

### Sleep Score

sleep_score (integer) is "score" value below; see comment to confirm exact location

#### Request Example

import requests 
url = 'https://api.ouraring.com/v2/usercollection/daily_sleep' 
params={ 
    'start_date': '2021-11-01', 
    'end_date': '2021-12-01' 
}
headers = { 
  'Authorization': 'Bearer <token>' 
}
response = requests.request('GET', url, headers=headers, params=params) 
print(response.text)

#### Response Example

{
  "data": [
    {
      "id": "string",
      "contributors": {
        "deep_sleep": 0,
        "efficiency": 0,
        "latency": 0,
        "rem_sleep": 0,
        "restfulness": 0,
        "timing": 0,
        "total_sleep": 0
      },
      "day": "2019-08-24",
      // location of sleep score immediately below this comment
      "score": 0,
      "timestamp": "string"
    }
  ],
  "next_token": "string"
}

### Bedtime Start Date

bedtime_start_date (text) is "bedtime_start" value below; see comment to confirm exact location. format the date from the date+time string.

#### Request Example

import requests 
url = 'https://api.ouraring.com/v2/usercollection/sleep' 
params={ 
    'start_date': '2021-11-01', 
    'end_date': '2021-12-01' 
}
headers = { 
  'Authorization': 'Bearer <token>' 
}
response = requests.request('GET', url, headers=headers, params=params) 
print(response.text)

#### Response Example

{
  "data": [
    {
      "id": "string",
      "average_breath": 0,
      "average_heart_rate": 0,
      "average_hrv": 0,
      "awake_time": 0,
      "bedtime_end": "string",
      // bedtime start below this line
      "bedtime_start": "string",
      "day": "2019-08-24",
      "deep_sleep_duration": 0,
      "efficiency": 0,
      "heart_rate": {
        "interval": 0,
        "items": [
          0
        ],
        "timestamp": "string"
      },
      "hrv": {
        "interval": 0,
        "items": [
          0
        ],
        "timestamp": "string"
      },
      "latency": 0,
      "light_sleep_duration": 0,
      "low_battery_alert": true,
      "lowest_heart_rate": 0,
      "movement_30_sec": "string",
      "period": 0,
      "readiness": {
        "contributors": {
          "activity_balance": 0,
          "body_temperature": 0,
          "hrv_balance": 0,
          "previous_day_activity": 0,
          "previous_night": 0,
          "recovery_index": 0,
          "resting_heart_rate": 0,
          "sleep_balance": 0
        },
        "score": 0,
        "temperature_deviation": 0,
        "temperature_trend_deviation": 0
      },
      "readiness_score_delta": 0,
      "rem_sleep_duration": 0,
      "restless_periods": 0,
      "sleep_phase_5_min": "string",
      "sleep_score_delta": 0,
      "sleep_algorithm_version": "v1",
      "time_in_bed": 0,
      "total_sleep_duration": 0,
      "type": "deleted"
    }
  ],
  "next_token": "string"
}

### Bedtime Start Time

bedtime_start_time (text) is "bedtime_start" value below; see comment to confirm exact location. format the time from the date+time string.

#### Request Example

import requests 
url = 'https://api.ouraring.com/v2/usercollection/sleep' 
params={ 
    'start_date': '2021-11-01', 
    'end_date': '2021-12-01' 
}
headers = { 
  'Authorization': 'Bearer <token>' 
}
response = requests.request('GET', url, headers=headers, params=params) 
print(response.text)

#### Response Example

{
  "data": [
    {
      "id": "string",
      "average_breath": 0,
      "average_heart_rate": 0,
      "average_hrv": 0,
      "awake_time": 0,
      "bedtime_end": "string",
      // bedtime start below this line
      "bedtime_start": "string",
      "day": "2019-08-24",
      "deep_sleep_duration": 0,
      "efficiency": 0,
      "heart_rate": {
        "interval": 0,
        "items": [
          0
        ],
        "timestamp": "string"
      },
      "hrv": {
        "interval": 0,
        "items": [
          0
        ],
        "timestamp": "string"
      },
      "latency": 0,
      "light_sleep_duration": 0,
      "low_battery_alert": true,
      "lowest_heart_rate": 0,
      "movement_30_sec": "string",
      "period": 0,
      "readiness": {
        "contributors": {
          "activity_balance": 0,
          "body_temperature": 0,
          "hrv_balance": 0,
          "previous_day_activity": 0,
          "previous_night": 0,
          "recovery_index": 0,
          "resting_heart_rate": 0,
          "sleep_balance": 0
        },
        "score": 0,
        "temperature_deviation": 0,
        "temperature_trend_deviation": 0
      },
      "readiness_score_delta": 0,
      "rem_sleep_duration": 0,
      "restless_periods": 0,
      "sleep_phase_5_min": "string",
      "sleep_score_delta": 0,
      "sleep_algorithm_version": "v1",
      "time_in_bed": 0,
      "total_sleep_duration": 0,
      "type": "deleted"
    }
  ],
  "next_token": "string"
}

### Total Sleep

total_sleep (text) is "total_sleep" value below; see comment to confirm exact location

#### Request Example

import requests 
url = 'https://api.ouraring.com/v2/usercollection/daily_sleep' 
params={ 
    'start_date': '2021-11-01', 
    'end_date': '2021-12-01' 
}
headers = { 
  'Authorization': 'Bearer <token>' 
}
response = requests.request('GET', url, headers=headers, params=params) 
print(response.text)

#### Response Example

{
  "data": [
    {
      "id": "string",
      "contributors": {
        "deep_sleep": 0,
        "efficiency": 0,
        "latency": 0,
        "rem_sleep": 0,
        "restfulness": 0,
        "timing": 0,
        // location of total sleep immediately below this comment
        "total_sleep": 0
      },
      "day": "2019-08-24",
      "score": 0,
      "timestamp": "string"
    }
  ],
  "next_token": "string"
}

### Resting Heart Rate

resting_heart_rate (integer) is "lowest_heart_rate" value below

#### Request Example

import requests 
url = 'https://api.ouraring.com/v2/usercollection/sleep' 
params={ 
    'start_date': '2021-11-01', 
    'end_date': '2021-12-01' 
}
headers = { 
  'Authorization': 'Bearer <token>' 
}
response = requests.request('GET', url, headers=headers, params=params) 
print(response.text)

#### Response Example

{
  "data": [
    {
      "id": "string",
      "average_breath": 0,
      "average_heart_rate": 0,
      "average_hrv": 0,
      "awake_time": 0,
      "bedtime_end": "string",
      // bedtime start below this line
      "bedtime_start": "string",
      "day": "2019-08-24",
      "deep_sleep_duration": 0,
      "efficiency": 0,
      "heart_rate": {
        "interval": 0,
        "items": [
          0
        ],
        "timestamp": "string"
      },
      "hrv": {
        "interval": 0,
        "items": [
          0
        ],
        "timestamp": "string"
      },
      "latency": 0,
      "light_sleep_duration": 0,
      "low_battery_alert": true,
      "lowest_heart_rate": 0,
      "movement_30_sec": "string",
      "period": 0,
      "readiness": {
        "contributors": {
          "activity_balance": 0,
          "body_temperature": 0,
          "hrv_balance": 0,
          "previous_day_activity": 0,
          "previous_night": 0,
          "recovery_index": 0,
          "resting_heart_rate": 0,
          "sleep_balance": 0
        },
        "score": 0,
        "temperature_deviation": 0,
        "temperature_trend_deviation": 0
      },
      "readiness_score_delta": 0,
      "rem_sleep_duration": 0,
      "restless_periods": 0,
      "sleep_phase_5_min": "string",
      "sleep_score_delta": 0,
      "sleep_algorithm_version": "v1",
      "time_in_bed": 0,
      "total_sleep_duration": 0,
      "type": "deleted"
    }
  ],
  "next_token": "string"
}

### HRV

average_hrv (integer) is "average_hrv" value below

#### Request Example

import requests 
url = 'https://api.ouraring.com/v2/usercollection/sleep' 
params={ 
    'start_date': '2021-11-01', 
    'end_date': '2021-12-01' 
}
headers = { 
  'Authorization': 'Bearer <token>' 
}
response = requests.request('GET', url, headers=headers, params=params) 
print(response.text)

#### Response Example

{
  "data": [
    {
      "id": "string",
      "average_breath": 0,
      "average_heart_rate": 0,
      "average_hrv": 0,
      "awake_time": 0,
      "bedtime_end": "string",
      // bedtime start below this line
      "bedtime_start": "string",
      "day": "2019-08-24",
      "deep_sleep_duration": 0,
      "efficiency": 0,
      "heart_rate": {
        "interval": 0,
        "items": [
          0
        ],
        "timestamp": "string"
      },
      "hrv": {
        "interval": 0,
        "items": [
          0
        ],
        "timestamp": "string"
      },
      "latency": 0,
      "light_sleep_duration": 0,
      "low_battery_alert": true,
      "lowest_heart_rate": 0,
      "movement_30_sec": "string",
      "period": 0,
      "readiness": {
        "contributors": {
          "activity_balance": 0,
          "body_temperature": 0,
          "hrv_balance": 0,
          "previous_day_activity": 0,
          "previous_night": 0,
          "recovery_index": 0,
          "resting_heart_rate": 0,
          "sleep_balance": 0
        },
        "score": 0,
        "temperature_deviation": 0,
        "temperature_trend_deviation": 0
      },
      "readiness_score_delta": 0,
      "rem_sleep_duration": 0,
      "restless_periods": 0,
      "sleep_phase_5_min": "string",
      "sleep_score_delta": 0,
      "sleep_algorithm_version": "v1",
      "time_in_bed": 0,
      "total_sleep_duration": 0,
      "type": "deleted"
    }
  ],
  "next_token": "string"
}

### spo2_avg

spo2_avg (real) is "average" below

#### Request Example

import requests 
url = 'https://api.ouraring.com/v2/usercollection/daily_spo2' 
params={ 
    'start_date': '2021-11-01', 
    'end_date': '2021-12-01' 
}
headers = { 
  'Authorization': 'Bearer <token>' 
}
response = requests.request('GET', url, headers=headers, params=params) 
print(response.text)

#### Response Example

{
  "data": [
    {
      "id": "string",
      "day": "2019-08-24",
      "spo2_percentage": {
        "average": 0
      },
      "breathing_disturbance_index": 0
    }
  ],
  "next_token": "string"
}

### cardio_age

cardio_age (integer) is vascular_age below

#### Request Example

import requests 
url = 'https://api.ouraring.com/v2/usercollection/daily_cardiovascular_age' 
params={ 
    'start_date': '2021-11-01', 
    'end_date': '2021-12-01' 
}
headers = { 
  'Authorization': 'Bearer <token>' 
}
response = requests.request('GET', url, headers=headers, params=params) 
print(response.text)

#### Response Example

{
  "data": [
    {
      "day": "2019-08-24",
      "vascular_age": 0
    }
  ],
  "next_token": "string"
}
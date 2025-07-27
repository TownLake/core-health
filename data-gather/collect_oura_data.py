def fetch_oura_data(token: str, target_date: str) -> Dict[str, Any]:
    headers = {'Authorization': f'Bearer {token}'}
    # Convert the target date string to a date object for easy calculations
    target_date_obj = datetime.fromisoformat(target_date).date()
    
    # This is used for the /sleep endpoint, which is fine as-is
    previous_date = (target_date_obj - timedelta(days=1)).isoformat()
    
    data = {
        'date': target_date,
        'collected_at': datetime.now().isoformat(),
        'sleep_score': None,
        'deep_sleep_minutes': None,
        'bedtime_start_date': None,
        'bedtime_start_time': None,
        'resting_heart_rate': None,
        'average_hrv': None,
        'total_sleep': None,
        'efficiency': None,
        'delay': None,
        'spo2_avg': None,
        'total_calories': None
    }
    
    # --- The following blocks for sleep and spo2 are unchanged ---

    try:
        response = requests.get(
            'https://api.ouraring.com/v2/usercollection/daily_sleep',
            headers=headers,
            params={'start_date': target_date, 'end_date': target_date}
        )
        response.raise_for_status()
        daily_data = response.json().get('data', [])
        if daily_data:
            data['sleep_score'] = daily_data[0].get('score')
    except Exception as e:
        print(f"Error fetching daily sleep score: {e}")
    
    try:
        response = requests.get(
            'https://api.ouraring.com/v2/usercollection/sleep',
            headers=headers,
            params={'start_date': previous_date, 'end_date': target_date}
        )
        response.raise_for_status()
        sleep_data = response.json().get('data', [])
        if sleep_data:
            sessions = [s for s in sleep_data if s.get('bedtime_end', '').startswith(target_date)]
            if sessions:
                session = sessions[0]
                data['deep_sleep_minutes'] = int(session.get('deep_sleep_duration', 0) / 60)
                if session.get('bedtime_start'):
                    dt = datetime.fromisoformat(session['bedtime_start'].replace('Z', '+00:00'))
                    data['bedtime_start_date'] = dt.date().isoformat()
                    data['bedtime_start_time'] = dt.time().isoformat()
                data['resting_heart_rate'] = session.get('lowest_heart_rate')
                data['average_hrv'] = session.get('average_hrv')
                data['total_sleep'] = session.get('total_sleep_duration', 0) / 3600
                data['efficiency'] = session.get('efficiency')
                data['delay'] = int(session.get('latency', 0) / 60)
    except Exception as e:
        print(f"Error fetching sleep data: {e}")
    
    # ----------------- FIXED ACTIVITY BLOCK -----------------
    # This is the section that has been fixed.
    try:
        # 1. Define a wider date range to avoid timezone issues.
        start_range = (target_date_obj - timedelta(days=1)).isoformat()
        end_range = (target_date_obj + timedelta(days=1)).isoformat()
        
        response = requests.get(
            'https://api.ouraring.com/v2/usercollection/daily_activity',
            headers=headers,
            # 2. Query the API with the wider date range.
            params={'start_date': start_range, 'end_date': end_range}
        )
        response.raise_for_status()
        activity_data = response.json().get('data', [])
        
        if activity_data:
            # 3. Find the specific day's data from the results list.
            # The 'next' function with a generator is an efficient way to find the first match.
            target_day_data = next((item for item in activity_data if item.get('day') == target_date), None)
            
            if target_day_data:
                # 4. Extract calories from the correct day's data object.
                data['total_calories'] = int(target_day_data.get('total_calories', 0))
                
    except Exception as e:
        print(f"Error fetching daily activity data: {e}")
    # ----------------- END OF FIXED BLOCK -----------------
        
    try:
        response = requests.get(
            'https://api.ouraring.com/v2/usercollection/daily_spo2',
            headers=headers,
            params={'start_date': target_date, 'end_date': target_date}
        )
        response.raise_for_status()
        spo2_data = response.json().get('data', [])
        if spo2_data:
            data['spo2_avg'] = spo2_data[0].get('spo2_percentage', {}).get('average')
    except Exception as e:
        print(f"Error fetching SPO2 data: {e}")
    
    return data
